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

  const items = cart.items as any;
  const existingItem = items.find(
    (item: any) => item.menuItemId.toString() === menuItemId
  );

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.items.push({
      menuItemId,
      quantity: 1,
    } as any);
  }

  await cart.save();

  return cart;
};

export const getCartService = async (userId: string) => {
  return await Cart.findOne({ userId }).populate("items.menuItemId");
};

export const updateCartItemQuantityService = async (
  userId: string,
  menuItemId: string,
  quantity: number
) => {
  const cart = await Cart.findOne({ userId });

  if (!cart) {
    throw new Error("Cart not found");
  }

  const items = cart.items as any;
  const existingItem = items.find(
    (item: any) => item.menuItemId.toString() === menuItemId
  );

  if (!existingItem) {
    throw new Error("Cart item not found");
  }

  if (quantity <= 0) {
    (cart as any).items = (cart.items as any).filter(
      (item: any) => item.menuItemId.toString() !== menuItemId
    );
  } else {
    existingItem.quantity = quantity;
  }

  await cart.save();

  return await getCartService(userId);
};

export const removeCartItemService = async (
  userId: string,
  menuItemId: string
) => {
  const cart = await Cart.findOne({ userId });

  if (!cart) {
    throw new Error("Cart not found");
  }

  (cart as any).items = (cart.items as any).filter(
    (item: any) => item.menuItemId.toString() !== menuItemId
  );

  await cart.save();

  return await getCartService(userId);
};
