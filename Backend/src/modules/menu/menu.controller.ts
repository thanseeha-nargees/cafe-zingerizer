import { Request, Response } from "express";
import { createMenuSchema } from "./menu.validation";
import { createMenu, getMenus } from "./menu.service";

export const createMenuController = async (
  req: Request,
  res: Response
) => {
  try {
    const uploadedFile = req.file as Express.Multer.File | undefined;
    const payload = {
      ...req.body,
      image: uploadedFile?.path || req.body.image,
    };
    const validation = createMenuSchema.safeParse(payload);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.format(),
      });
    }

    const menu = await createMenu(validation.data);

    return res.status(201).json({
      success: true,
      menu,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMenusController = async (
  req: Request,
  res: Response
) => {
  try {
    const menus = await getMenus();

    return res.status(200).json({
      success: true,
      menus,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
