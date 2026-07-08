import { Router } from "express";
import categoryRoutes from "../modules/categories/category.routes";
import menuRoutes from "../modules/menu/menu.routes";
import cartRoutes from "../modules/cart/cart.routes";
import tableRoutes from "../modules/table/table.routes";
import orderRoutes from "../modules/orders/order.routes";
import notificationRoutes from "../modules/notifications/notification.routes";
import adminRoutes from "../modules/admin/admin.routes.js";

const router = Router();

router.use("/categories", categoryRoutes);
router.use("/menu", menuRoutes);
router.use("/cart", cartRoutes);
router.use("/tables", tableRoutes);
router.use("/orders", orderRoutes);
router.use("/notifications", notificationRoutes);
router.use("/admin", adminRoutes);


export default router;
