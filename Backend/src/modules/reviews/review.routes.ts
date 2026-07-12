import { Router } from "express";
import { authorize, protect } from "../../middleware/authMiddleware.js";
import {
  createReviewController,
  deleteAdminReviewController,
  deleteReviewController,
  getAdminReviewsController,
  getMyReviewsController,
  getProductReviewsController,
  getReviewEligibilityController,
  getReviewProductsController,
  updateAdminReviewVisibilityController,
  updateReviewController,
} from "./review.controller.js";

const router = Router();

router.get("/product/:productId", getProductReviewsController);

router.use(protect);

router.get("/admin", authorize("admin"), getAdminReviewsController);
router.get("/admin/products", authorize("admin"), getReviewProductsController);
router.patch(
  "/admin/:reviewId/visibility",
  authorize("admin"),
  updateAdminReviewVisibilityController
);
router.delete(
  "/admin/:reviewId",
  authorize("admin"),
  deleteAdminReviewController
);

router.get("/eligibility/:productId", getReviewEligibilityController);
router.get("/me", getMyReviewsController);
router.post("/", createReviewController);
router.patch("/:reviewId", updateReviewController);
router.delete("/:reviewId", deleteReviewController);

export default router;
