"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCart = exports.addToCart = void 0;
const cart_service_js_1 = require("./cart.service.js");
const addToCart = async (req, res) => {
    try {
        const { userId, menuItemId } = req.body;
        const cart = await (0, cart_service_js_1.addToCartService)(userId, menuItemId);
        return res.status(200).json({
            success: true,
            cart,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.addToCart = addToCart;
const getCart = async (req, res) => {
    try {
        const { userId } = req.params;
        const cart = await (0, cart_service_js_1.getCartService)(userId);
        return res.status(200).json({
            success: true,
            cart,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getCart = getCart;
//# sourceMappingURL=cart.controller.js.map