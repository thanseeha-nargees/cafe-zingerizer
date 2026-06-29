"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uploader_middleware_1 = __importDefault(require("../../middleware/uploader.middleware"));
const menu_controller_1 = require("./menu.controller");
const router = (0, express_1.Router)();
router.post("/", uploader_middleware_1.default.single("image"), menu_controller_1.createMenuController);
router.get("/", menu_controller_1.getMenusController);
exports.default = router;
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
//# sourceMappingURL=menu.routes.js.map