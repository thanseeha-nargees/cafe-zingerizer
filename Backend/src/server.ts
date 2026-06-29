import "dotenv/config";
import express from "express"
import connectDb from "./config/database.js";
import cookieParser from "cookie-parser";   
import authRoutes from "./modules/auth/auth.routes.js"
import categoryRoutes from "./modules/categories/category.routes.js";
import menuRoutes from "./modules/menu/menu.routes.js";
import orderRoutes from "./modules/orders/order.routes.js";
import { startFoodReadyNotificationWorker } from "./modules/orders/order.scheduler.js";
import tableRoutes from "./modules/table/table.routes.js";
import cartRoutes from "./modules/cart/cart.routes.js";
import cors from "cors"
connectDb()
startFoodReadyNotificationWorker().catch((error) => {
  console.log(
    "food ready notification worker failed",
    error instanceof Error ? error.message : error
  );
});
const app = express()

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use('/api/auth', authRoutes)
app.use("/api/categories", categoryRoutes);
app.use("/api/menu",menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/cart", cartRoutes);


const PORT  = process.env.PORT || 5000;

app.listen(PORT , ()=>{
    console.log(`server running on the port number ${PORT}`)
})
