import { Router } from "express";
import upload from "../../middleware/uploader.middleware.js";
import {
  createCategoryController,
  getCategoriesController,
  getCategoryController,  
  deleteCategoryController,
} from "./category.controller.js";

const router = Router();

router.post("/", upload.single("image"), createCategoryController);

router.get("/", getCategoriesController);

router.get("/:id", getCategoryController);

router.delete("/:id", deleteCategoryController);

export default router;
