"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReviewProductsService = exports.deleteAdminReviewService = exports.updateAdminReviewVisibilityService = exports.getAdminReviewsService = exports.getMyReviewsService = exports.getReviewEligibilityService = exports.getProductReviewsService = exports.deleteReviewService = exports.updateReviewService = exports.createReviewService = exports.recalculateProductRating = exports.ReviewError = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const menu_schema_js_1 = require("../menu/menu.schema.js");
const order_model_js_1 = require("../orders/order.model.js");
const review_model_js_1 = require("./review.model.js");
class ReviewError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
}
exports.ReviewError = ReviewError;
const emptyBreakdown = () => ({
    one: 0,
    two: 0,
    three: 0,
    four: 0,
    five: 0,
});
const ratingKey = (rating) => {
    const keys = ["one", "two", "three", "four", "five"];
    return keys[Math.max(Math.min(rating, 5), 1) - 1];
};
const ensureObjectId = (value, label) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(value)) {
        throw new ReviewError(`Invalid ${label}`, 400);
    }
};
const getId = (value) => {
    if (!value)
        return "";
    if (typeof value === "object" && "_id" in value) {
        return String(value._id);
    }
    return String(value);
};
const getProductRatingSummary = async (productId) => {
    const reviews = await review_model_js_1.Review.find({
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
const recalculateProductRating = async (productId) => {
    const summary = await getProductRatingSummary(productId);
    await menu_schema_js_1.Menu.findByIdAndUpdate(productId, summary, {
        returnDocument: "after",
        runValidators: true,
    });
    return summary;
};
exports.recalculateProductRating = recalculateProductRating;
const populateReview = (query) => query
    .populate("userId", "userName email")
    .populate("productId", "name category image price averageRating reviewCount ratingBreakdown")
    .populate("orderId", "_id createdAt orderStatus totalAmount");
const formatReview = (review) => ({
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
    user: typeof review.userId === "object"
        ? {
            _id: getId(review.userId),
            userName: review.userId?.userName || "Customer",
            email: review.userId?.email || "",
        }
        : null,
    product: typeof review.productId === "object"
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
    order: typeof review.orderId === "object"
        ? {
            _id: getId(review.orderId),
            createdAt: review.orderId?.createdAt,
            orderStatus: review.orderId?.orderStatus,
            totalAmount: review.orderId?.totalAmount || 0,
        }
        : null,
});
const ensureCustomer = (role) => {
    if (role !== "user") {
        throw new ReviewError("Only customers can submit product reviews", 403);
    }
};
const ensureCompletedPurchase = async (userId, productId, orderId) => {
    const order = await order_model_js_1.Order.findOne({
        _id: orderId,
        userId,
        orderStatus: "COMPLETED",
        "items.menuItemId": productId,
    }).select("_id");
    if (!order) {
        throw new ReviewError("You can review this product only after buying it in a completed order", 403);
    }
};
const createReviewService = async ({ userId, role, productId, orderId, rating, review, }) => {
    ensureCustomer(role);
    ensureObjectId(productId, "product id");
    ensureObjectId(orderId, "order id");
    const product = await menu_schema_js_1.Menu.exists({ _id: productId });
    if (!product) {
        throw new ReviewError("Product not found", 404);
    }
    await ensureCompletedPurchase(userId, productId, orderId);
    const existingReview = await review_model_js_1.Review.findOne({ userId, productId, orderId });
    if (existingReview) {
        throw new ReviewError("You already reviewed this product for this order", 409);
    }
    const createdReview = await review_model_js_1.Review.create({
        userId,
        productId,
        orderId,
        rating,
        review: review || "",
    });
    const [populatedReview, summary] = await Promise.all([
        populateReview(review_model_js_1.Review.findById(createdReview._id)),
        (0, exports.recalculateProductRating)(productId),
    ]);
    return {
        review: formatReview(populatedReview),
        summary,
    };
};
exports.createReviewService = createReviewService;
const updateReviewService = async ({ userId, reviewId, rating, review, }) => {
    ensureObjectId(reviewId, "review id");
    const existingReview = await review_model_js_1.Review.findOne({ _id: reviewId, userId });
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
        populateReview(review_model_js_1.Review.findById(existingReview._id)),
        (0, exports.recalculateProductRating)(existingReview.productId.toString()),
    ]);
    return {
        review: formatReview(populatedReview),
        summary,
    };
};
exports.updateReviewService = updateReviewService;
const deleteReviewService = async (userId, reviewId) => {
    ensureObjectId(reviewId, "review id");
    const review = await review_model_js_1.Review.findOneAndDelete({ _id: reviewId, userId });
    if (!review) {
        throw new ReviewError("Review not found", 404);
    }
    const summary = await (0, exports.recalculateProductRating)(review.productId.toString());
    return { summary };
};
exports.deleteReviewService = deleteReviewService;
const getProductReviewsService = async (productId, sort = "latest") => {
    ensureObjectId(productId, "product id");
    const product = await menu_schema_js_1.Menu.findById(productId).select("name averageRating reviewCount ratingBreakdown");
    if (!product) {
        throw new ReviewError("Product not found", 404);
    }
    const sortMap = {
        latest: { createdAt: -1 },
        highest: { rating: -1, createdAt: -1 },
        lowest: { rating: 1, createdAt: -1 },
    };
    const reviews = await populateReview(review_model_js_1.Review.find({ productId, isHidden: false }).sort(sortMap[sort]));
    return {
        summary: {
            averageRating: product.averageRating || 0,
            reviewCount: product.reviewCount || 0,
            ratingBreakdown: product.ratingBreakdown || emptyBreakdown(),
        },
        reviews: reviews.map(formatReview),
    };
};
exports.getProductReviewsService = getProductReviewsService;
const getReviewEligibilityService = async (userId, role, productId) => {
    ensureCustomer(role);
    ensureObjectId(productId, "product id");
    const [orders, reviews] = await Promise.all([
        order_model_js_1.Order.find({
            userId,
            orderStatus: "COMPLETED",
            "items.menuItemId": productId,
        })
            .sort({ createdAt: -1 })
            .select("_id createdAt totalAmount items"),
        populateReview(review_model_js_1.Review.find({ userId, productId }).sort({ createdAt: -1 })),
    ]);
    const reviewedOrderIds = new Set(reviews.map((review) => getId(review.orderId)));
    return {
        eligibleOrders: orders.map((order) => ({
            _id: order._id.toString(),
            createdAt: order.createdAt,
            totalAmount: order.totalAmount,
            isReviewed: reviewedOrderIds.has(order._id.toString()),
        })),
        existingReviews: reviews.map(formatReview),
    };
};
exports.getReviewEligibilityService = getReviewEligibilityService;
const getMyReviewsService = async (userId) => {
    const reviews = await populateReview(review_model_js_1.Review.find({ userId }).sort({ createdAt: -1 }));
    return reviews.map(formatReview);
};
exports.getMyReviewsService = getMyReviewsService;
const getAdminReviewsService = async ({ search = "", productId = "", rating = "", page = 1, limit = 20, }) => {
    const filters = {};
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
    const allReviews = await populateReview(review_model_js_1.Review.find(filters).sort({ createdAt: -1 }).limit(500));
    const term = search.trim().toLowerCase();
    const filteredReviews = term
        ? allReviews.filter((review) => {
            const productName = typeof review.productId === "object" ? review.productId?.name || "" : "";
            const userName = typeof review.userId === "object" ? review.userId?.userName || "" : "";
            const email = typeof review.userId === "object" ? review.userId?.email || "" : "";
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
exports.getAdminReviewsService = getAdminReviewsService;
const updateAdminReviewVisibilityService = async (reviewId, isHidden) => {
    ensureObjectId(reviewId, "review id");
    const review = await review_model_js_1.Review.findByIdAndUpdate(reviewId, { isHidden }, { returnDocument: "after", runValidators: true });
    if (!review) {
        throw new ReviewError("Review not found", 404);
    }
    const [populatedReview, summary] = await Promise.all([
        populateReview(review_model_js_1.Review.findById(review._id)),
        (0, exports.recalculateProductRating)(review.productId.toString()),
    ]);
    return {
        review: formatReview(populatedReview),
        summary,
    };
};
exports.updateAdminReviewVisibilityService = updateAdminReviewVisibilityService;
const deleteAdminReviewService = async (reviewId) => {
    ensureObjectId(reviewId, "review id");
    const review = await review_model_js_1.Review.findByIdAndDelete(reviewId);
    if (!review) {
        throw new ReviewError("Review not found", 404);
    }
    const summary = await (0, exports.recalculateProductRating)(review.productId.toString());
    return { summary };
};
exports.deleteAdminReviewService = deleteAdminReviewService;
const getReviewProductsService = async () => {
    return await menu_schema_js_1.Menu.find().sort({ name: 1 }).select("_id name category");
};
exports.getReviewProductsService = getReviewProductsService;
//# sourceMappingURL=review.service.js.map