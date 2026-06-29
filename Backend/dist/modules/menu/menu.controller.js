"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMenusController = exports.createMenuController = void 0;
const menu_validation_1 = require("./menu.validation");
const menu_service_1 = require("./menu.service");
const createMenuController = async (req, res) => {
    try {
        const uploadedFile = req.file;
        const payload = {
            ...req.body,
            image: uploadedFile?.path || req.body.image,
        };
        const validation = menu_validation_1.createMenuSchema.safeParse(payload);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: validation.error.format(),
            });
        }
        const menu = await (0, menu_service_1.createMenu)(validation.data);
        return res.status(201).json({
            success: true,
            menu,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.createMenuController = createMenuController;
const getMenusController = async (req, res) => {
    try {
        const menus = await (0, menu_service_1.getMenus)();
        return res.status(200).json({
            success: true,
            menus,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getMenusController = getMenusController;
//# sourceMappingURL=menu.controller.js.map