import "dotenv/config";
import express from "express"
import { createServer } from "http";
import connectDb from "./config/database.js";
import cookieParser from "cookie-parser";   
import authRoutes from "./modules/auth/auth.routes.js"
import adminRoutes from "./modules/admin/admin.routes.js";
import categoryRoutes from "./modules/categories/category.routes.js";
import menuRoutes from "./modules/menu/menu.routes.js";
import orderRoutes from "./modules/orders/order.routes.js";
import { startFoodReadyNotificationWorker } from "./modules/orders/order.scheduler.js";
import { ensureDefaultSuperAdmin } from "./modules/auth/admin.seed.js";
import tableRoutes from "./modules/table/table.routes.js";
import cartRoutes from "./modules/cart/cart.routes.js";
import notificationRoutes from "./modules/notifications/notification.routes.js";
import { initializeOrderReadyWebSocket } from "./modules/notifications/orderReady.websocket.js";
import cors from "cors"

const app = express()
const server = createServer(app);

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use('/api/auth', authRoutes)
app.use("/api/admin", adminRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/menu",menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/notifications", notificationRoutes);
initializeOrderReadyWebSocket(server);


const PORT  = process.env.PORT || 5000;

const startServer = async () => {
  await connectDb();
  await ensureDefaultSuperAdmin();

  startFoodReadyNotificationWorker().catch((error) => {
    console.log(
      "food ready notification worker failed",
      error instanceof Error ? error.message : error
    );
  });

  server.listen(PORT , ()=>{
    console.log(`server running on the port number ${PORT}`)
  })
};

startServer().catch((error) => {
  console.log("server startup failed", error instanceof Error ? error.message : error);
});
