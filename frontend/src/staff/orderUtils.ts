import type { StaffOrder, StaffOrderItem, StaffOrderStatus } from "./types";

export const staffStatusLabels: Record<StaffOrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Accepted",
  PREPARING: "Preparing",
  READY: "Ready",
  COMPLETED: "Served",
  CANCELLED: "Cancelled",
};

export const staffActionStatuses: StaffOrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
];

export const terminalStatuses: StaffOrderStatus[] = ["COMPLETED", "CANCELLED"];

export const statusClass: Record<StaffOrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  CONFIRMED: "bg-sky-50 text-sky-700 ring-sky-200",
  PREPARING: "bg-orange-50 text-orange-700 ring-orange-200",
  READY: "bg-violet-50 text-violet-700 ring-violet-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 ring-red-200",
};

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

export const formatDate = (dateValue: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateValue));

export const getApiMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  return fallback;
};

export const getItemName = (item: StaffOrderItem) =>
  typeof item.menuItemId === "object" && item.menuItemId?.name
    ? item.menuItemId.name
    : "Menu item";

export const getTableLabel = (order: StaffOrder) => {
  if (order.orderType === "Takeaway") return "Takeaway";

  if (typeof order.tableId === "object" && order.tableId?.tableNumber) {
    return `Table ${order.tableId.tableNumber}`;
  }

  return "Dining";
};

export const getOrderLabel = (orderId: string) =>
  `#${orderId.slice(-6).toUpperCase()}`;
