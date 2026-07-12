import mongoose from "mongoose";
import { User } from "../auth/user.schema.js";
import { Menu } from "../menu/menu.schema.js";
import { Order } from "../orders/order.model.js";
import { Review } from "./review.model.js";

export type ReviewSort = "latest" | "highest" | "lowest";

export class ReviewError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const emptyBreakdown = () => ({
  one: 0,
  two: 0,
  three: 0,
  four: 0,
  five: 0,
});

const ratingKey = (rating: number) => {
  const keys = ["one", "two", "three", "four", "five"] as const;

  return keys[Math.max(Math.min(rating, 5), 1) - 1];
};

const ensureObjectId = (value: string, label: string) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ReviewError(`Invalid ${label}`, 400);
  }
};

const getId = (value: unknown) => {
  if (!value) return "";

  if (typeof value === "object" && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }

  return String(value);
};

const getProductRatingSummary = async (productId: string) => {
  const reviews = await Review.find({
    productId,
    isHidden: false,
  }).select("rating");
  const breakdown = emptyBreakdown();
  const total = reviews.length;

  let sum = 0;

  reviews.forEach((review) => {
    sum += review.rating;
    breakdown[ratingKey(review.rating)] += 1;
  });

  return {
    averageRating: total ? Math.round((sum / total) * 10) / 10 : 0,
    reviewCount: total,
    ratingBreakdown: breakdown,
  };
};

export const recalculateProductRating = async (productId: string) => {
  const summary = await getProductRatingSummary(productId);

  await Menu.findByIdAndUpdate(productId, summary, {
    returnDocument: "after",
    runValidators: true,
  });

  return summary;
};

const populateReview = (query: any) =>
  query
    .populate("userId", "userName email")
    .populate("productId", "name category image price averageRating reviewCount ratingBreakdown")
    .populate("orderId", "_id createdAt orderStatus totalAmount");

const formatReview = (review: any) => ({
  _id: review._id.toString(),
  userId: getId(review.userId),
  productId: getId(review.productId),
  orderId: getId(review.orderId),
  rating: review.rating,
  review: review.review || "",
  isHidden: review.isHidden,
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
  verifiedPurchase: true,
  user:
    typeof review.userId === "object"
      ? {
          _id: getId(review.userId),
          userName: review.userId?.userName || "Customer",
          email: review.userId?.email || "",
        }
      : null,
  product:
    typeof review.productId === "object"
      ? {
          _id: getId(review.productId),
          name: review.productId?.name || "Product",
          category: review.productId?.category || "",
          image: review.productId?.image || "",
          price: review.productId?.price || 0,
          averageRating: review.productId?.averageRating || 0,
          reviewCount: review.productId?.reviewCount || 0,
          ratingBreakdown: review.productId?.ratingBreakdown || emptyBreakdown(),
        }
      : null,
  order:
    typeof review.orderId === "object"
      ? {
          _id: getId(review.orderId),
          createdAt: review.orderId?.createdAt,
          orderStatus: review.orderId?.orderStatus,
          totalAmount: review.orderId?.totalAmount || 0,
        }
      : null,
});

const ensureCustomer = (role: string) => {
  if (role !== "user") {
    throw new ReviewError("Only customers can submit product reviews", 403);
  }
};

const ensureCompletedPurchase = async (
  userId: string,
  productId: string,
  orderId: string
) => {
  const order = await Order.findOne({
    _id: orderId,
    userId,
    orderStatus: "COMPLETED",
    "items.menuItemId": productId,
  }).select("_id");

  if (!order) {
    throw new ReviewError(
      "You can review this product only after buying it in a completed order",
      403
    );
  }
};

export const createReviewService = async ({
  userId,
  role,
  productId,
  orderId,
  rating,
  review,
}: {
  userId: string;
  role: string;
  productId: string;
  orderId: string;
  rating: number;
  review?: string;
}) => {
  ensureCustomer(role);
  ensureObjectId(productId, "product id");
  ensureObjectId(orderId, "order id");

  const product = await Menu.exists({ _id: productId });

  if (!product) {
    throw new ReviewError("Product not found", 404);
  }

  await ensureCompletedPurchase(userId, productId, orderId);

  const existingReview = await Review.findOne({ userId, productId, orderId });

  if (existingReview) {
    throw new ReviewError(
      "You already reviewed this product for this order",
      409
    );
  }

  const createdReview = await Review.create({
    userId,
    productId,
    orderId,
    rating,
    review: review || "",
  });

  const [populatedReview, summary] = await Promise.all([
    populateReview(Review.findById(createdReview._id)),
    recalculateProductRating(productId),
  ]);

  return {
    review: formatReview(populatedReview),
    summary,
  };
};

export const updateReviewService = async ({
  userId,
  reviewId,
  rating,
  review,
}: {
  userId: string;
  reviewId: string;
  rating?: number;
  review?: string;
}) => {
  ensureObjectId(reviewId, "review id");

  const existingReview = await Review.findOne({ _id: reviewId, userId });

  if (!existingReview) {
    throw new ReviewError("Review not found", 404);
  }

  if (rating !== undefined) {
    existingReview.rating = rating;
  }

  if (review !== undefined) {
    existingReview.review = review;
  }

  await existingReview.save();

  const [populatedReview, summary] = await Promise.all([
    populateReview(Review.findById(existingReview._id)),
    recalculateProductRating(existingReview.productId.toString()),
  ]);

  return {
    review: formatReview(populatedReview),
    summary,
  };
};

export const deleteReviewService = async (userId: string, reviewId: string) => {
  ensureObjectId(reviewId, "review id");

  const review = await Review.findOneAndDelete({ _id: reviewId, userId });

  if (!review) {
    throw new ReviewError("Review not found", 404);
  }

  const summary = await recalculateProductRating(review.productId.toString());

  return { summary };
};

export const getProductReviewsService = async (
  productId: string,
  sort: ReviewSort = "latest"
) => {
  ensureObjectId(productId, "product id");

  const product = await Menu.findById(productId).select(
    "name averageRating reviewCount ratingBreakdown"
  );

  if (!product) {
    throw new ReviewError("Product not found", 404);
  }

  const sortMap: Record<ReviewSort, Record<string, 1 | -1>> = {
    latest: { createdAt: -1 },
    highest: { rating: -1, createdAt: -1 },
    lowest: { rating: 1, createdAt: -1 },
  };

  const reviews = await populateReview(
    Review.find({ productId, isHidden: false }).sort(sortMap[sort])
  );

  return {
    summary: {
      averageRating: product.averageRating || 0,
      reviewCount: product.reviewCount || 0,
      ratingBreakdown: product.ratingBreakdown || emptyBreakdown(),
    },
    reviews: reviews.map(formatReview),
  };
};

export const getReviewEligibilityService = async (
  userId: string,
  role: string,
  productId: string
) => {
  ensureCustomer(role);
  ensureObjectId(productId, "product id");

  const [orders, reviews] = await Promise.all([
    Order.find({
      userId,
      orderStatus: "COMPLETED",
      "items.menuItemId": productId,
    })
      .sort({ createdAt: -1 })
      .select("_id createdAt totalAmount items"),
    populateReview(Review.find({ userId, productId }).sort({ createdAt: -1 })),
  ]);
  const reviewedOrderIds = new Set(
    reviews.map((review: any) => getId(review.orderId))
  );

  return {
    eligibleOrders: orders.map((order: any) => ({
      _id: order._id.toString(),
      createdAt: order.createdAt,
      totalAmount: order.totalAmount,
      isReviewed: reviewedOrderIds.has(order._id.toString()),
    })),
    existingReviews: reviews.map(formatReview),
  };
};

export const getMyReviewsService = async (userId: string) => {
  const reviews = await populateReview(
    Review.find({ userId }).sort({ createdAt: -1 })
  );

  return reviews.map(formatReview);
};

export const getAdminReviewsService = async ({
  search = "",
  productId = "",
  rating = "",
  page = 1,
  limit = 20,
}: {
  search?: string;
  productId?: string;
  rating?: string;
  page?: number;
  limit?: number;
}) => {
  const filters: Record<string, unknown> = {};

  if (productId) {
    ensureObjectId(productId, "product id");
    filters.productId = productId;
  }

  if (rating) {
    const parsedRating = Number(rating);

    if (Number.isInteger(parsedRating) && parsedRating >= 1 && parsedRating <= 5) {
      filters.rating = parsedRating;
    }
  }

  const allReviews = await populateReview(
    Review.find(filters).sort({ createdAt: -1 }).limit(500)
  );
  const term = search.trim().toLowerCase();
  const filteredReviews = term
    ? allReviews.filter((review: any) => {
        const productName =
          typeof review.productId === "object" ? review.productId?.name || "" : "";
        const userName =
          typeof review.userId === "object" ? review.userId?.userName || "" : "";
        const email =
          typeof review.userId === "object" ? review.userId?.email || "" : "";

        return `${productName} ${userName} ${email} ${review.review || ""}`
          .toLowerCase()
          .includes(term);
      })
    : allReviews;
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const safePage = Math.max(page, 1);
  const startIndex = (safePage - 1) * safeLimit;

  return {
    reviews: filteredReviews
      .slice(startIndex, startIndex + safeLimit)
      .map(formatReview),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: filteredReviews.length,
      hasMore: startIndex + safeLimit < filteredReviews.length,
    },
  };
};

export const updateAdminReviewVisibilityService = async (
  reviewId: string,
  isHidden: boolean
) => {
  ensureObjectId(reviewId, "review id");

  const review = await Review.findByIdAndUpdate(
    reviewId,
    { isHidden },
    { returnDocument: "after", runValidators: true }
  );

  if (!review) {
    throw new ReviewError("Review not found", 404);
  }

  const [populatedReview, summary] = await Promise.all([
    populateReview(Review.findById(review._id)),
    recalculateProductRating(review.productId.toString()),
  ]);

  return {
    review: formatReview(populatedReview),
    summary,
  };
};

export const deleteAdminReviewService = async (reviewId: string) => {
  ensureObjectId(reviewId, "review id");

  const review = await Review.findByIdAndDelete(reviewId);

  if (!review) {
    throw new ReviewError("Review not found", 404);
  }

  const summary = await recalculateProductRating(review.productId.toString());

  return { summary };
};

export const getReviewProductsService = async () => {
  return await Menu.find().sort({ name: 1 }).select("_id name category");
};
