import { Router } from "express";
import upload from "../../middleware/uploader.middleware";
import {
  createMenuController,
  getMenusController,
} from "./menu.controller";

const router = Router();

router.post("/", upload.single("image"), createMenuController);

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
