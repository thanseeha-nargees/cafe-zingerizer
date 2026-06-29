export interface OrderItem {
  menuItemId: string;
  quantity: number;
  price: number;
}

export interface CreateOrderInput {
  orderType: "Dining" | "Takeaway";
  customerName: string;
  customerPhone: string;
  tableId?: string;
}
