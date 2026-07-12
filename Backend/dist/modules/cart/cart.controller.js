"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeCartItem = exports.updateCartItemQuantity = exports.getCart = exports.addToCart = void 0;
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
const updateCartItemQuantity = async (req, res) => {
    try {
        const quantity = Number(req.body.quantity);
        if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be between 0 and 99",
            });
        }
        const cart = await (0, cart_service_js_1.updateCartItemQuantityService)(req.params.userId, req.params.menuItemId, quantity);
        return res.status(200).json({
            success: true,
            cart,
        });
    }
    catch (error) {
        const statusCode = ["Cart not found", "Cart item not found"].includes(error.message)
            ? 404
            : 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message,
        });
    }
};
exports.updateCartItemQuantity = updateCartItemQuantity;
const removeCartItem = async (req, res) => {
    try {
        const cart = await (0, cart_service_js_1.removeCartItemService)(req.params.userId, req.params.menuItemId);
        return res.status(200).json({
            success: true,
            cart,
        });
    }
    catch (error) {
        const statusCode = error.message === "Cart not found" ? 404 : 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message,
        });
    }
};
exports.removeCartItem = removeCartItem;
//# sourceMappingURL=cart.controller.js.map