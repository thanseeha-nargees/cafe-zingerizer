import { Router } from "express";
import {
  addToCart,
  getCart,
  removeCartItem,
  updateCartItemQuantity,
} from "./cart.controller.js";

const router = Router();

router.post("/", addToCart);

router.get("/:userId", getCart);
router.patch("/:userId/items/:menuItemId", updateCartItemQuantity);
router.delete("/:userId/items/:menuItemId", removeCartItem);

export default router;
