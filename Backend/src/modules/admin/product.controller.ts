import { Request, Response } from "express";
import mongoose from "mongoose";
import { Menu } from "../menu/menu.schema.js";
import { createMenuSchema, updateMenuSchema } from "../menu/menu.validation.js";

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const buildProductPayload = (req: Request) => {
  const uploadedFile = req.file as Express.Multer.File | undefined;
  const payload = {
    ...req.body,
  };

  if (uploadedFile?.path) {
    payload.image = uploadedFile.path;
  }

  return payload;
};

export const getAdminProductsController = async (
  req: Request,
  res: Response
) => {
  try {
    const { search, category, availability } = req.query;
    const filters: Record<string, unknown> = {};

    if (typeof search === "string" && search.trim()) {
      filters.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
        { category: { $regex: search.trim(), $options: "i" } },
      ];
    }

    if (typeof category === "string" && category.trim()) {
      filters.category = category.trim();
    }

    if (availability === "available") {
      filters.isAvailable = true;
    }

    if (availability === "unavailable") {
      filters.isAvailable = false;
    }

    const products = await Menu.find(filters).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      products,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAdminProductController = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const product = await Menu.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createAdminProductController = async (
  req: Request,
  res: Response
) => {
  try {
    const validation = createMenuSchema.safeParse(buildProductPayload(req));

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        errors: validation.error.format(),
      });
    }

    const product = await Menu.create(validation.data);

    return res.status(201).json({
      success: true,
      product,
      message: "Product created",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateAdminProductController = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const validation = updateMenuSchema.safeParse(buildProductPayload(req));

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        errors: validation.error.format(),
      });
    }

    const product = await Menu.findByIdAndUpdate(
      req.params.id,
      validation.data,
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product,
      message: "Product updated",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteAdminProductController = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const product = await Menu.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
