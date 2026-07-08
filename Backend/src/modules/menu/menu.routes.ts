import { Router } from "express";
import { adminAuth } from "../../middleware/adminAuth.js";
import { roleMiddleware } from "../../middleware/roleMiddleware.js";
import upload from "../../middleware/uploader.middleware.js";
import {
  createMenuController,
  getMenusController,
} from "./menu.controller.js";

const router = Router();

router.post(
  "/",
  adminAuth,
  roleMiddleware("admin"),
  upload.single("image"),
  createMenuController
);

router.get("/", getMenusController);

export default router;

// import { Router } from "express";
// import {
//   createMenuController,
//   getMenusController,
// } from "./menu.controller";
// import { upload } from "../../middleware/upload.js";

// const router = Router();

// router.post("/", upload.single("image"), createMenuController);

// router.get("/", getMenusController);

// export default router;
