import { Router } from "express";
import {
  addToCart,
  getCart,
} from "./cart.controller.js";

const router = Router();

router.post("/", addToCart);

router.get("/:userId", getCart);

export default router;