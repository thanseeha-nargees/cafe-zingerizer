"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReviewProductsController = exports.deleteAdminReviewController = exports.updateAdminReviewVisibilityController = exports.getAdminReviewsController = exports.getMyReviewsController = exports.getReviewEligibilityController = exports.getProductReviewsController = exports.deleteReviewController = exports.updateReviewController = exports.createReviewController = void 0;
const zod_1 = require("zod");
const review_service_js_1 = require("./review.service.js");
const reviewBodySchema = zod_1.z.object({
    productId: zod_1.z.string().min(1, "Product is required"),
    orderId: zod_1.z.string().min(1, "Order is required"),
    rating: zod_1.z.coerce
        .number()
        .int("Rating must be a whole number")
        .min(1, "Rating must be at least 1")
        .max(5, "Rating cannot be greater than 5"),
    review: zod_1.z.string().trim().max(1000, "Review is too long").optional(),
});
const updateReviewSchema = zod_1.z
    .object({
    rating: zod_1.z.coerce
        .number()
        .int("Rating must be a whole number")
        .min(1, "Rating must be at least 1")
        .max(5, "Rating cannot be greater than 5")
        .optional(),
    review: zod_1.z.string().trim().max(1000, "Review is too long").optional(),
})
    .refine((data) => data.rating !== undefined || data.review !== undefined, {
    message: "At least one review field is required",
});
const visibilitySchema = zod_1.z.object({
    isHidden: zod_1.z.boolean(),
});
const getErrorStatus = (error) => error instanceof review_service_js_1.ReviewError ? error.statusCode : 500;
const getErrorMessage = (error, fallback) => error instanceof Error ? error.message : fallback;
const getPositiveInt = (value, fallback, max = 100) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1)
        return fallback;
    return Math.min(Math.floor(parsed), max);
};
const getSort = (value) => {
    if (value === "highest" || value === "lowest")
        return value;
    return "latest";
};
const createReviewController = async (req, res) => {
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
        const result = await (0, review_service_js_1.createReviewService)({
            userId: req.user._id,
            role: req.user.role,
            ...validation.data,
        });
        return res.status(201).json({
            success: true,
            ...result,
            message: "Review submitted",
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Unable to create review"),
        });
    }
};
exports.createReviewController = createReviewController;
const updateReviewController = async (req, res) => {
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
        const result = await (0, review_service_js_1.updateReviewService)({
            userId: req.user._id,
            reviewId: req.params.reviewId,
            ...validation.data,
        });
        return res.status(200).json({
            success: true,
            ...result,
            message: "Review updated",
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Unable to update review"),
        });
    }
};
exports.updateReviewController = updateReviewController;
const deleteReviewController = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }
        const result = await (0, review_service_js_1.deleteReviewService)(req.user._id, req.params.reviewId);
        return res.status(200).json({
            success: true,
            ...result,
            message: "Review deleted",
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Unable to delete review"),
        });
    }
};
exports.deleteReviewController = deleteReviewController;
const getProductReviewsController = async (req, res) => {
    try {
        const result = await (0, review_service_js_1.getProductReviewsService)(req.params.productId, getSort(req.query.sort));
        return res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Unable to load product reviews"),
        });
    }
};
exports.getProductReviewsController = getProductReviewsController;
const getReviewEligibilityController = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }
        const result = await (0, review_service_js_1.getReviewEligibilityService)(req.user._id, req.user.role, req.params.productId);
        return res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Unable to load review eligibility"),
        });
    }
};
exports.getReviewEligibilityController = getReviewEligibilityController;
const getMyReviewsController = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }
        const reviews = await (0, review_service_js_1.getMyReviewsService)(req.user._id);
        return res.status(200).json({
            success: true,
            reviews,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error, "Unable to load reviews"),
        });
    }
};
exports.getMyReviewsController = getMyReviewsController;
const getAdminReviewsController = async (req, res) => {
    try {
        const result = await (0, review_service_js_1.getAdminReviewsService)({
            search: typeof req.query.search === "string" ? req.query.search : "",
            productId: typeof req.query.productId === "string" ? req.query.productId : "",
            rating: typeof req.query.rating === "string" ? req.query.rating : "",
            page: getPositiveInt(req.query.page, 1),
            limit: getPositiveInt(req.query.limit, 20, 50),
        });
        return res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Unable to load admin reviews"),
        });
    }
};
exports.getAdminReviewsController = getAdminReviewsController;
const updateAdminReviewVisibilityController = async (req, res) => {
    try {
        const validation = visibilitySchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                errors: validation.error.format(),
            });
        }
        const result = await (0, review_service_js_1.updateAdminReviewVisibilityService)(req.params.reviewId, validation.data.isHidden);
        return res.status(200).json({
            success: true,
            ...result,
            message: validation.data.isHidden ? "Review hidden" : "Review visible",
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Unable to update review visibility"),
        });
    }
};
exports.updateAdminReviewVisibilityController = updateAdminReviewVisibilityController;
const deleteAdminReviewController = async (req, res) => {
    try {
        const result = await (0, review_service_js_1.deleteAdminReviewService)(req.params.reviewId);
        return res.status(200).json({
            success: true,
            ...result,
            message: "Review deleted",
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Unable to delete review"),
        });
    }
};
exports.deleteAdminReviewController = deleteAdminReviewController;
const getReviewProductsController = async (_req, res) => {
    try {
        const products = await (0, review_service_js_1.getReviewProductsService)();
        return res.status(200).json({
            success: true,
            products,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error, "Unable to load products"),
        });
    }
};
exports.getReviewProductsController = getReviewProductsController;
//# sourceMappingURL=review.controller.js.map