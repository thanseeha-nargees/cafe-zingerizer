import { Request, Response } from "express";
import { createCategorySchema } from "./category.validation.js";

import {
  createCategory,
  getAllCategories,
  getCategoryById,
  deleteCategory,
} from "./category.service.js";

export const createCategoryController = async (
  req: Request,
  res: Response
) => {
  try {
    const uploadedFile = req.file as Express.Multer.File | undefined;
    const payload = {
      ...req.body,
      image: uploadedFile?.path || req.body.image,
    };
    const validation = createCategorySchema.safeParse(payload);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        errors: validation.error.format(),
      });
    }

    const category = await createCategory(validation.data);

    return res.status(201).json({
      success: true,
      category,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCategoriesController = async (
  req: Request,
  res: Response
) => {
  const categories = await getAllCategories();

  return res.status(200).json({
    success: true,
    categories,
  });
};

export const getCategoryController = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  const category = await getCategoryById(req.params.id);

  return res.status(200).json({
    success: true,
    category,
  });
};

export const deleteCategoryController = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  await deleteCategory(req.params.id);

  return res.status(200).json({
    success: true,
    message: "Category deleted",
  });
};
