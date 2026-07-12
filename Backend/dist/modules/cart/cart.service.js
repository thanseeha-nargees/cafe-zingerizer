"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeCartItemService = exports.updateCartItemQuantityService = exports.getCartService = exports.addToCartService = void 0;
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
const updateCartItemQuantityService = async (userId, menuItemId, quantity) => {
    const cart = await cart_schema_js_1.Cart.findOne({ userId });
    if (!cart) {
        throw new Error("Cart not found");
    }
    const existingItem = cart.items.find((item) => item.menuItemId.toString() === menuItemId);
    if (!existingItem) {
        throw new Error("Cart item not found");
    }
    if (quantity <= 0) {
        cart.items = cart.items.filter((item) => item.menuItemId.toString() !== menuItemId);
    }
    else {
        existingItem.quantity = quantity;
    }
    await cart.save();
    return await (0, exports.getCartService)(userId);
};
exports.updateCartItemQuantityService = updateCartItemQuantityService;
const removeCartItemService = async (userId, menuItemId) => {
    const cart = await cart_schema_js_1.Cart.findOne({ userId });
    if (!cart) {
        throw new Error("Cart not found");
    }
    cart.items = cart.items.filter((item) => item.menuItemId.toString() !== menuItemId);
    await cart.save();
    return await (0, exports.getCartService)(userId);
};
exports.removeCartItemService = removeCartItemService;
//# sourceMappingURL=cart.service.js.map