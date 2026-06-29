import { Cart } from "./cart.schema.js";

export const addToCartService = async (
  userId: string,
  menuItemId: string
) => {
  let cart = await Cart.findOne({ userId });

  if (!cart) {
    cart = await Cart.create({
      userId,
      items: [{ menuItemId, quantity: 1 }],
    });

    return cart;
  }

  const existingItem = cart.items.find(
    (item: any) => item.menuItemId.toString() === menuItemId
  );

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.items.push({
      menuItemId,
      quantity: 1,
    });
  }

  await cart.save();

  return cart;
};

export const getCartService = async (userId: string) => {
  return await Cart.findOne({ userId }).populate("items.menuItemId");
};