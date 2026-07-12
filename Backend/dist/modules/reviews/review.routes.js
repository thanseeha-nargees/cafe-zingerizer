"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_js_1 = require("../../middleware/authMiddleware.js");
const review_controller_js_1 = require("./review.controller.js");
const router = (0, express_1.Router)();
router.get("/product/:productId", review_controller_js_1.getProductReviewsController);
router.use(authMiddleware_js_1.protect);
router.get("/admin", (0, authMiddleware_js_1.authorize)("admin"), review_controller_js_1.getAdminReviewsController);
router.get("/admin/products", (0, authMiddleware_js_1.authorize)("admin"), review_controller_js_1.getReviewProductsController);
router.patch("/admin/:reviewId/visibility", (0, authMiddleware_js_1.authorize)("admin"), review_controller_js_1.updateAdminReviewVisibilityController);
router.delete("/admin/:reviewId", (0, authMiddleware_js_1.authorize)("admin"), review_controller_js_1.deleteAdminReviewController);
router.get("/eligibility/:productId", review_controller_js_1.getReviewEligibilityController);
router.get("/me", review_controller_js_1.getMyReviewsController);
router.post("/", review_controller_js_1.createReviewController);
router.patch("/:reviewId", review_controller_js_1.updateReviewController);
router.delete("/:reviewId", review_controller_js_1.deleteReviewController);
exports.default = router;
//# sourceMappingURL=review.routes.js.map