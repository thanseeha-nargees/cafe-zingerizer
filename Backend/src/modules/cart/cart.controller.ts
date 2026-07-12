import { Request, Response } from "express";
import {
  addToCartService,
  getCartService,
  removeCartItemService,
  updateCartItemQuantityService,
} from "./cart.service.js";

type GetCartParams = {
  userId: string;
};

type CartItemParams = {
  userId: string;
  menuItemId: string;
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

export const updateCartItemQuantity = async (
  req: Request<CartItemParams>,
  res: Response
) => {
  try {
    const quantity = Number(req.body.quantity);

    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be between 0 and 99",
      });
    }

    const cart = await updateCartItemQuantityService(
      req.params.userId,
      req.params.menuItemId,
      quantity
    );

    return res.status(200).json({
      success: true,
      cart,
    });
  } catch (error: any) {
    const statusCode = ["Cart not found", "Cart item not found"].includes(
      error.message
    )
      ? 404
      : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

export const removeCartItem = async (
  req: Request<CartItemParams>,
  res: Response
) => {
  try {
    const cart = await removeCartItemService(
      req.params.userId,
      req.params.menuItemId
    );

    return res.status(200).json({
      success: true,
      cart,
    });
  } catch (error: any) {
    const statusCode = error.message === "Cart not found" ? 404 : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};
