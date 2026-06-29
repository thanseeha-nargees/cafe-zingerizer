import { Router } from "express";
import categoryRoutes from "../modules/categories/category.routes";
import menuRoutes from "../modules/menu/menu.routes";
import cartRoutes from "../modules/cart/cart.routes";
import tableRoutes from "../modules/table/table.routes";
import orderRoutes from "../modules/orders/order.routes";

const router = Router();

router.use("/categories", categoryRoutes);
router.use("/menu", menuRoutes);
router.use("/cart", cartRoutes);
router.use("/tables", tableRoutes);
router.use("/orders", orderRoutes);


export default router;
