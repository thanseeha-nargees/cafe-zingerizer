"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCartService = exports.addToCartService = void 0;
const cart_schema_js_1 = require("./cart.schema.js");
const addToCartService = async (userId, menuItemId) => {
    let cart = await cart_schema_js_1.Cart.findOne({ userId });
    if (!cart) {
        cart = await cart_schema_js_1.Cart.create({
            userId,
            items: [{ menuItemId, quantity: 1 }],
        });
        return cart;
    }
    const existingItem = cart.items.find((item) => item.menuItemId.toString() === menuItemId);
    if (existingItem) {
        existingItem.quantity += 1;
    }
    else {
        cart.items.push({
            menuItemId,
            quantity: 1,
        });
    }
    await cart.save();
    return cart;
};
exports.addToCartService = addToCartService;
const getCartService = async (userId) => {
    return await cart_schema_js_1.Cart.findOne({ userId }).populate("items.menuItemId");
};
exports.getCartService = getCartService;
//# sourceMappingURL=cart.service.js.map