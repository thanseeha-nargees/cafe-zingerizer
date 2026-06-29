import { Request, Response } from "express";
import {
  addToCartService,
  getCartService,
} from "./cart.service.js";

type GetCartParams = {
  userId: string;
};

export const addToCart = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId, menuItemId } = req.body;

    const cart = await addToCartService(
      userId,
      menuItemId
    );

    return res.status(200).json({
      success: true,
      cart,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCart = async (
  req: Request<GetCartParams>,
  res: Response
) => {
  try {
    const { userId } = req.params;

    const cart = await getCartService(userId);

    return res.status(200).json({
      success: true,
      cart,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
