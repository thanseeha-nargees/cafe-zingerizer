import { Request, Response } from "express";
import { z } from "zod";
import {
  createReviewService,
  deleteAdminReviewService,
  deleteReviewService,
  getAdminReviewsService,
  getMyReviewsService,
  getProductReviewsService,
  getReviewEligibilityService,
  getReviewProductsService,
  ReviewError,
  ReviewSort,
  updateAdminReviewVisibilityService,
  updateReviewService,
} from "./review.service.js";

const reviewBodySchema = z.object({
  productId: z.string().min(1, "Product is required"),
  orderId: z.string().min(1, "Order is required"),
  rating: z.coerce
    .number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot be greater than 5"),
  review: z.string().trim().max(1000, "Review is too long").optional(),
});

const updateReviewSchema = z
  .object({
    rating: z.coerce
      .number()
      .int("Rating must be a whole number")
      .min(1, "Rating must be at least 1")
      .max(5, "Rating cannot be greater than 5")
      .optional(),
    review: z.string().trim().max(1000, "Review is too long").optional(),
  })
  .refine((data) => data.rating !== undefined || data.review !== undefined, {
    message: "At least one review field is required",
  });

const visibilitySchema = z.object({
  isHidden: z.boolean(),
});

const getErrorStatus = (error: unknown) =>
  error instanceof ReviewError ? error.statusCode : 500;

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const getPositiveInt = (value: unknown, fallback: number, max = 100) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) return fallback;

  return Math.min(Math.floor(parsed), max);
};

const getSort = (value: unknown): ReviewSort => {
  if (value === "highest" || value === "lowest") return value;

  return "latest";
};

export const createReviewController = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const validation = reviewBodySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        errors: validation.error.format(),
      });
    }

    const result = await createReviewService({
      userId: req.user._id,
      role: req.user.role,
      ...validation.data,
    });

    return res.status(201).json({
      success: true,
      ...result,
      message: "Review submitted",
    });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error, "Unable to create review"),
    });
  }
};

export const updateReviewController = async (
  req: Request<{ reviewId: string }>,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const validation = updateReviewSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        errors: validation.error.format(),
      });
    }

    const result = await updateReviewService({
      userId: req.user._id,
      reviewId: req.params.reviewId,
      ...validation.data,
    });

    return res.status(200).json({
      success: true,
      ...result,
      message: "Review updated",
    });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error, "Unable to update review"),
    });
  }
};

export const deleteReviewController = async (
  req: Request<{ reviewId: string }>,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const result = await deleteReviewService(req.user._id, req.params.reviewId);

    return res.status(200).json({
      success: true,
      ...result,
      message: "Review deleted",
    });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error, "Unable to delete review"),
    });
  }
};

export const getProductReviewsController = async (
  req: Request<{ productId: string }>,
  res: Response
) => {
  try {
    const result = await getProductReviewsService(
      req.params.productId,
      getSort(req.query.sort)
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error, "Unable to load product reviews"),
    });
  }
};

export const getReviewEligibilityController = async (
  req: Request<{ productId: string }>,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const result = await getReviewEligibilityService(
      req.user._id,
      req.user.role,
      req.params.productId
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error, "Unable to load review eligibility"),
    });
  }
};

export const getMyReviewsController = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const reviews = await getMyReviewsService(req.user._id);

    return res.status(200).json({
      success: true,
      reviews,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error, "Unable to load reviews"),
    });
  }
};

export const getAdminReviewsController = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await getAdminReviewsService({
      search: typeof req.query.search === "string" ? req.query.search : "",
      productId:
        typeof req.query.productId === "string" ? req.query.productId : "",
      rating: typeof req.query.rating === "string" ? req.query.rating : "",
      page: getPositiveInt(req.query.page, 1),
      limit: getPositiveInt(req.query.limit, 20, 50),
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error, "Unable to load admin reviews"),
    });
  }
};

export const updateAdminReviewVisibilityController = async (
  req: Request<{ reviewId: string }>,
  res: Response
) => {
  try {
    const validation = visibilitySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        errors: validation.error.format(),
      });
    }

    const result = await updateAdminReviewVisibilityService(
      req.params.reviewId,
      validation.data.isHidden
    );

    return res.status(200).json({
      success: true,
      ...result,
      message: validation.data.isHidden ? "Review hidden" : "Review visible",
    });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error, "Unable to update review visibility"),
    });
  }
};

export const deleteAdminReviewController = async (
  req: Request<{ reviewId: string }>,
  res: Response
) => {
  try {
    const result = await deleteAdminReviewService(req.params.reviewId);

    return res.status(200).json({
      success: true,
      ...result,
      message: "Review deleted",
    });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error, "Unable to delete review"),
    });
  }
};

export const getReviewProductsController = async (
  _req: Request,
  res: Response
) => {
  try {
    const products = await getReviewProductsService();

    return res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error, "Unable to load products"),
    });
  }
};
