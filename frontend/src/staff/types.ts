export type StaffOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

export type StaffOrderItem = {
  menuItemId?:
    | string
    | {
        _id: string;
        name?: string;
        category?: string;
        image?: string;
        price?: number;
      };
  quantity?: number;
  price?: number;
};

export type StaffTable = {
  _id: string;
  tableNumber: number;
  label?: string;
  isActive: boolean;
  isOccupied: boolean;
  qrUrl?: string;
  qrCode?: string;
};

export type StaffOrder = {
  _id: string;
  customerName: string;
  customerPhone: string;
  orderType: "Dining" | "Takeaway";
  tableId?: StaffTable | string | null;
  items: StaffOrderItem[];
  totalAmount: number;
  orderStatus: StaffOrderStatus;
  paymentStatus: "PENDING" | "PAID";
  createdAt: string;
  updatedAt?: string;
};

export type FoodReadySmsResponse =
  | {
      status: "sent" | "already_sent";
      sentAt: string;
    }
  | {
      status: "failed";
      error: string;
    };

export type StaffSummary = {
  assignedTables: number;
  occupiedTables: number;
  activeOrders: number;
  readyOrders: number;
  servedToday: number;
};
