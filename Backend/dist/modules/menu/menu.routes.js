"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminAuth_js_1 = require("../../middleware/adminAuth.js");
const roleMiddleware_js_1 = require("../../middleware/roleMiddleware.js");
const uploader_middleware_js_1 = __importDefault(require("../../middleware/uploader.middleware.js"));
const menu_controller_js_1 = require("./menu.controller.js");
const router = (0, express_1.Router)();
router.post("/", adminAuth_js_1.adminAuth, (0, roleMiddleware_js_1.roleMiddleware)("admin"), uploader_middleware_js_1.default.single("image"), menu_controller_js_1.createMenuController);
router.get("/", menu_controller_js_1.getMenusController);
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