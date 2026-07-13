import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Minus,
  Plus,
  QrCode,
  Trash2,
  Utensils,
  XCircle,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api/axios";
import {
  clearQrTableSession,
  saveQrTableSession,
} from "../utils/qrTableSession";

type AuthUser = {
  id: string;
  userName: string;
  email: string;
};

type MenuItem = {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
};

type CartItem = {
  menuItemId: MenuItem | string;
  quantity: number;
};

type Cart = {
  items: CartItem[];
};

type PreviousOrder = {
  customerName?: string;
  customerPhone?: string;
  createdAt?: string;
};

type Table = {
  _id: string;
  tableNumber: number;
  label?: string;
  tableNo?: string;
  tableName?: string;
  isActive: boolean;
  isOccupied: boolean;
  qrCode?: string;
  qrUrl?: string;
};

type TableSettingsResponse = {
  data: {
    tables: Table[];
  };
};

type OrderType = "DINE_IN" | "TAKEAWAY";

type CustomerContact = {
  name: string;
  phone: string;
};

type RazorpayPaymentConfig = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  modal: {
    ondismiss: () => void;
  };
  handler: (response: RazorpaySuccessResponse) => void;
};

type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayFailureResponse = {
  error?: {
    description?: string;
    reason?: string;
    metadata?: {
      order_id?: string;
    };
  };
};

type RazorpayInstance = {
  open: () => void;
  on: (
    event: "payment.failed",
    callback: (response: RazorpayFailureResponse) => void
  ) => void;
};

type RazorpayPaymentResponse = {
  payment: {
    keyId: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    prefill: {
      name: string;
      email: string;
      contact: string;
    };
  };
};

declare global {
  interface Window {
    Razorpay?: new (config: RazorpayPaymentConfig) => RazorpayInstance;
  }
}

const phoneRegex = /^[6-9]\d{9}$/;
const razorpayScriptId = "razorpay-checkout-js";

const fallbackImage =
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=300&fit=crop&q=80";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const formatTableLabel = (table: Table) =>
  table.tableNo ||
  table.tableName ||
  table.label ||
  `T-${String(table.tableNumber).padStart(2, "0")}`;

const resolveMenuItem = (item: CartItem) =>
  typeof item.menuItemId === "string" ? null : item.menuItemId;

const getMenuItemId = (item: CartItem) =>
  typeof item.menuItemId === "string" ? item.menuItemId : item.menuItemId._id;

const getCustomerContactStorageKey = (userId: string) =>
  `cafe-checkout-contact:${userId}`;

const getStoredCustomerContact = (userId: string): CustomerContact | null => {
  try {
    const stored = window.localStorage.getItem(
      getCustomerContactStorageKey(userId)
    );

    if (!stored) return null;

    const parsed = JSON.parse(stored) as Partial<CustomerContact>;
    const name = parsed.name?.trim() || "";
    const phone = parsed.phone?.trim() || "";

    if (!name || !phoneRegex.test(phone)) return null;

    return { name, phone };
  } catch {
    return null;
  }
};

const saveStoredCustomerContact = (
  userId: string,
  contact: CustomerContact
) => {
  try {
    window.localStorage.setItem(
      getCustomerContactStorageKey(userId),
      JSON.stringify(contact)
    );
  } catch {
    // Checkout should still complete if browser storage is unavailable.
  }
};

const getLatestOrderContact = (
  orders: PreviousOrder[]
): CustomerContact | null => {
  const latestOrders = [...orders].sort((first, second) => {
    const firstDate = first.createdAt ? new Date(first.createdAt).getTime() : 0;
    const secondDate = second.createdAt
      ? new Date(second.createdAt).getTime()
      : 0;

    return secondDate - firstDate;
  });

  const orderWithContact = latestOrders.find((order) => {
    const name = order.customerName?.trim() || "";
    const phone = order.customerPhone?.trim() || "";

    return name.length > 0 && phoneRegex.test(phone);
  });

  if (!orderWithContact?.customerName || !orderWithContact.customerPhone) {
    return null;
  }

  return {
    name: orderWithContact.customerName.trim(),
    phone: orderWithContact.customerPhone.trim(),
  };
};

const loadRazorpayCheckout = () =>
  new Promise<void>((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(razorpayScriptId);

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Unable to load Razorpay Checkout")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = razorpayScriptId;
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay Checkout"));
    document.body.appendChild(script);
  });

const getApiMessage = (error: unknown, fallback: string) => {
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

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tableId: routeTableId } = useParams();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [qrTableId, setQrTableId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [paymentFailureMessage, setPaymentFailureMessage] = useState("");
  const [placedOrderTable, setPlacedOrderTable] = useState<Table | null>(null);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState("");
  const [cartUpdatingId, setCartUpdatingId] = useState("");
  const tableIdFromQr = routeTableId || searchParams.get("table") || "";

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        let validatedQrTable: Table | null = null;

        if (tableIdFromQr) {
          const qrTableResponse = await api.get<{ data: Table }>(
            `/tables/${tableIdFromQr}`
          );
          validatedQrTable = qrTableResponse.data.data;
          saveQrTableSession(
            validatedQrTable._id,
            validatedQrTable.tableNumber
          );
        } else {
          clearQrTableSession();
        }

        const [meResponse, tableResponse, orderHistoryResponse] = await Promise.all([
          api.get<{ user: AuthUser }>("/auth/me"),
          api.post<TableSettingsResponse>("/tables/settings/setup", {
            rows: 3,
            columns: 4,
          }),
          api.get<{ data: PreviousOrder[] }>("/orders/my-orders").catch(() => ({
            data: { data: [] },
          })),
        ]);

        if (!mounted) return;

        const loadedTables = tableResponse.data.data.tables;
        const latestOrderContact = getLatestOrderContact(
          orderHistoryResponse.data.data || []
        );
        const storedContact = getStoredCustomerContact(meResponse.data.user.id);
        const savedContact = latestOrderContact || storedContact;

        setUser(meResponse.data.user);
        setTables(loadedTables);
        if (savedContact) {
          setCustomerName(savedContact.name);
          setCustomerPhone(savedContact.phone);
        }

        const cartResponse = await api.get<{ cart: Cart | null }>(
          `/cart/${meResponse.data.user.id}`
        );

        if (!mounted) return;

        setCart(cartResponse.data.cart);

        if (tableIdFromQr) {
          setQrTableId(validatedQrTable?._id || tableIdFromQr);
          setOrderType("DINE_IN");
          setSelectedTableId(validatedQrTable?._id || tableIdFromQr);
        } else {
          setQrTableId("");
          const firstAvailableTable = loadedTables.find(
            (table) => table.isActive && !table.isOccupied
          );
          setSelectedTableId(firstAvailableTable?._id || "");
        }
      } catch (loadError) {
        if (mounted) {
          setError(
            getApiMessage(
              loadError,
              "Unable to load checkout. Please check that cart, table, and order routes are running."
            )
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [searchParams, routeTableId, tableIdFromQr]);

  const cartItems = cart?.items || [];

  const totalAmount = useMemo(() => {
    return cartItems.reduce((total, item) => {
      const menuItem = resolveMenuItem(item);
      return total + (menuItem?.price || 0) * item.quantity;
    }, 0);
  }, [cartItems]);

  const canPlaceOrder =
    cartItems.length > 0 &&
    !placingOrder &&
    customerName.trim().length > 0 &&
    phoneRegex.test(customerPhone.trim()) &&
    (orderType === "TAKEAWAY" || selectedTableId.length > 0);

  const recordPaymentFailure = async (razorpayOrderId: string, reason: string) => {
    if (!razorpayOrderId) return;

    await api
      .post("/payments/razorpay/failure", {
        razorpayOrderId,
        reason,
      })
      .catch(() => undefined);
  };

  const handlePlaceOrder = async () => {
    if (!user) return;

    const trimmedCustomerName = customerName.trim();
    const trimmedCustomerPhone = customerPhone.trim();

    if (!trimmedCustomerName) {
      setError("Customer name is required.");
      return;
    }

    if (!phoneRegex.test(trimmedCustomerPhone)) {
      setError("Phone number must be a valid 10-digit mobile number.");
      return;
    }

    if (!canPlaceOrder) return;

    setPlacingOrder(true);
    setError("");
    setPaymentFailed(false);
    setPaymentFailureMessage("");

    try {
      const selectedTable =
        tables.find((table) => table._id === selectedTableId) || null;
      const orderPayload = {
        orderType,
        customerName: trimmedCustomerName,
        customerPhone: trimmedCustomerPhone,
        ...(orderType === "DINE_IN" ? { tableId: selectedTableId } : {}),
      };

      await loadRazorpayCheckout();

      if (!window.Razorpay) {
        throw new Error("Razorpay Checkout is unavailable");
      }

      const paymentOrderResponse = await api.post<RazorpayPaymentResponse>(
        "/payments/razorpay/order",
        orderPayload
      );
      const payment = paymentOrderResponse.data.payment;
      let paymentHandled = false;

      const markPaymentFailed = (razorpayOrderId: string, message: string) => {
        paymentHandled = true;
        setPlacingOrder(false);
        setPaymentFailed(true);
        setPaymentFailureMessage(message);
        void recordPaymentFailure(razorpayOrderId, message);
      };

      const razorpay = new window.Razorpay({
        key: payment.keyId,
        amount: payment.amount,
        currency: payment.currency,
        name: payment.name,
        description: payment.description,
        order_id: payment.razorpayOrderId,
        prefill: payment.prefill,
        theme: {
          color: "#c2410c",
        },
        modal: {
          ondismiss: () => {
            if (paymentHandled) return;
            markPaymentFailed(payment.razorpayOrderId, "Payment was cancelled.");
          },
        },
        handler: async (response) => {
          if (paymentHandled) return;

          paymentHandled = true;
          setPlacingOrder(true);

          try {
            await api.post("/payments/razorpay/verify", {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            saveStoredCustomerContact(user.id, {
              name: trimmedCustomerName,
              phone: trimmedCustomerPhone,
            });
            clearQrTableSession();
            setCustomerName(trimmedCustomerName);
            setCustomerPhone(trimmedCustomerPhone);
            setPlacedOrderTable(orderType === "DINE_IN" ? selectedTable : null);
            setOrderPlaced(true);
            setPaymentFailed(false);
            setPaymentFailureMessage("");
            setCart({ items: [] });
          } catch (verifyError) {
            setPaymentFailed(true);
            setPaymentFailureMessage(
              getApiMessage(verifyError, "Payment verification failed.")
            );
          } finally {
            setPlacingOrder(false);
          }
        },
      });

      razorpay.on("payment.failed", (response) => {
        if (paymentHandled) return;

        const razorpayOrderId =
          response.error?.metadata?.order_id || payment.razorpayOrderId;
        const message =
          response.error?.description ||
          response.error?.reason ||
          "Payment failed. Please retry.";

        markPaymentFailed(razorpayOrderId, message);
      });

      razorpay.open();
    } catch (orderError) {
      setPlacingOrder(false);
      setError(getApiMessage(orderError, "Unable to start payment."));
    }
  };

  const refreshCart = async (userId: string) => {
    const cartResponse = await api.get<{ cart: Cart | null }>(`/cart/${userId}`);
    setCart(cartResponse.data.cart);
  };

  const handleCartQuantityChange = async (
    item: CartItem,
    nextQuantity: number
  ) => {
    if (!user) return;

    const menuItemId = getMenuItemId(item);
    setCartUpdatingId(menuItemId);
    setError("");

    try {
      const response = await api.patch<{ cart: Cart | null }>(
        `/cart/${user.id}/items/${menuItemId}`,
        { quantity: Math.max(nextQuantity, 0) }
      );
      setCart(response.data.cart);
    } catch (cartError) {
      setError(getApiMessage(cartError, "Unable to update cart."));
      await refreshCart(user.id).catch(() => undefined);
    } finally {
      setCartUpdatingId("");
    }
  };

  const handleRemoveCartItem = async (item: CartItem) => {
    if (!user) return;

    const menuItemId = getMenuItemId(item);
    setCartUpdatingId(menuItemId);
    setError("");

    try {
      const response = await api.delete<{ cart: Cart | null }>(
        `/cart/${user.id}/items/${menuItemId}`
      );
      setCart(response.data.cart);
    } catch (cartError) {
      setError(getApiMessage(cartError, "Unable to remove cart item."));
      await refreshCart(user.id).catch(() => undefined);
    } finally {
      setCartUpdatingId("");
    }
  };

  const getMenuPath = () => (qrTableId ? `/menu/${qrTableId}` : "/menu");
  const qrSelectedTable = tables.find((table) => table._id === qrTableId);

  return (
    <main className="min-h-screen bg-orange-50/60 pb-28">
      <header className="sticky top-0 z-20 border-b border-orange-100 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(getMenuPath())}
            aria-label="Back to menu"
            className="flex h-9 w-9 items-center justify-center rounded-full text-orange-700 hover:bg-orange-50"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-extrabold text-orange-700">Checkout</h1>
          <span className="w-9" />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {orderPlaced ? (
          <div className="rounded-lg border border-orange-100 bg-white p-6 text-center shadow-sm">
            <CheckCircle2 className="mx-auto text-green-600" size={42} />
            <h2 className="mt-4 text-xl font-extrabold text-stone-950">
              Payment successful
            </h2>
            <p className="mt-2 text-sm font-medium text-stone-500">
              Your order is confirmed. Food ready SMS will be sent to{" "}
              {customerPhone}.
            </p>

            {placedOrderTable?.qrCode && (
              <div className="mt-6">
                <p className="mb-3 text-xs font-extrabold uppercase text-stone-600">
                  Table {placedOrderTable.tableNumber} QR Code
                </p>
                <img
                  src={placedOrderTable.qrCode}
                  alt={`Table ${placedOrderTable.tableNumber} QR code`}
                  className="mx-auto h-48 w-48 rounded-md border border-orange-100 bg-white p-2"
                />
                {placedOrderTable.qrUrl && (
                  <p className="mx-auto mt-3 max-w-xs break-all text-xs font-medium text-stone-500">
                    {placedOrderTable.qrUrl}
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate("/history", { replace: true })}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-orange-700 px-6 text-sm font-extrabold text-white"
            >
              View Order History
            </button>
          </div>
        ) : paymentFailed ? (
          <div className="rounded-lg border border-red-100 bg-white p-6 text-center shadow-sm">
            <XCircle className="mx-auto text-red-600" size={42} />
            <h2 className="mt-4 text-xl font-extrabold text-stone-950">
              Payment failed
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium text-stone-500">
              {paymentFailureMessage ||
                "Your order was not created. Please retry the payment when you are ready."}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={!canPlaceOrder}
                className="inline-flex h-11 items-center justify-center rounded-full bg-orange-700 px-6 text-sm font-extrabold text-white transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Retry Payment
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentFailed(false);
                  setPaymentFailureMessage("");
                }}
                className="inline-flex h-11 items-center justify-center rounded-full border border-orange-100 bg-white px-6 text-sm font-extrabold text-orange-800 transition hover:border-orange-300"
              >
                Edit Checkout
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex min-h-[420px] items-center justify-center text-stone-500">
            <Loader2 className="mr-2 animate-spin" size={20} />
            Loading checkout...
          </div>
        ) : (
          <div className="space-y-6">
            <section>
              <h2 className="mb-3 text-xs font-extrabold uppercase text-stone-600">
                Customer Information
              </h2>
              <div className="space-y-3 rounded-lg border border-orange-100 bg-white p-4">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase text-stone-500">
                    Full Name
                  </span>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Enter full name"
                    className="h-11 w-full rounded-md border border-orange-100 px-3 text-sm font-medium text-stone-900 outline-none focus:border-orange-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase text-stone-500">
                    Phone Number
                  </span>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(event) =>
                      setCustomerPhone(
                        event.target.value.replace(/\D/g, "").slice(0, 10)
                      )
                    }
                    placeholder="10-digit mobile number"
                    className="h-11 w-full rounded-md border border-orange-100 px-3 text-sm font-medium text-stone-900 outline-none focus:border-orange-500"
                  />
                </label>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xs font-extrabold uppercase text-stone-600">
                Service Type
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOrderType("DINE_IN")}
                  className={`h-16 rounded-lg border bg-white text-sm font-semibold transition ${
                    orderType === "DINE_IN"
                      ? "border-orange-500 text-orange-700"
                      : "border-orange-100 text-stone-700"
                  }`}
                >
                  <Utensils className="mx-auto mb-1" size={18} />
                  Dining
                </button>
                <button
                  type="button"
                  disabled={qrTableId.length > 0}
                  onClick={() => setOrderType("TAKEAWAY")}
                  className={`h-16 rounded-lg border bg-white text-sm font-semibold transition ${
                    orderType === "TAKEAWAY"
                      ? "border-orange-500 text-orange-700"
                      : "border-orange-100 text-stone-700"
                  }`}
                >
                  <BriefcaseBusiness className="mx-auto mb-1" size={18} />
                  Takeaway
                </button>
              </div>
            </section>

            {orderType === "DINE_IN" && qrTableId.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-extrabold uppercase text-stone-600">
                  Your Table
                </h2>
                {qrSelectedTable ? (
                  <div className="overflow-hidden rounded-lg border border-orange-200 bg-white shadow-sm">
                    <div className="flex items-start justify-between gap-3 border-b border-orange-100 bg-orange-50/70 px-4 py-3">
                      <div>
                        <p className="text-xs font-black uppercase text-stone-500">
                          Table
                        </p>
                        <p className="mt-1 text-2xl font-black text-stone-950">
                          {formatTableLabel(qrSelectedTable)}
                        </p>
                      </div>
                      <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase text-orange-700 ring-1 ring-orange-200">
                        Selected
                      </span>
                    </div>

                    <div className="grid gap-4 p-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
                      <div className="mx-auto flex aspect-square w-full max-w-44 items-center justify-center rounded-lg border border-orange-100 bg-white p-3 shadow-inner">
                        {qrSelectedTable.qrCode ? (
                          <img
                            src={qrSelectedTable.qrCode}
                            alt={`QR code for ${formatTableLabel(qrSelectedTable)}`}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-lg bg-orange-50 text-orange-700">
                            <QrCode size={34} strokeWidth={2.3} />
                          </div>
                        )}
                      </div>
                      <div className="rounded-lg bg-stone-50 px-4 py-3">
                        <p className="text-sm font-extrabold text-stone-950">
                          Table selected from QR code
                        </p>
                        <p className="mt-2 text-xs font-semibold uppercase text-stone-500">
                          {qrSelectedTable.isOccupied ? "Occupied" : "Available"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-orange-100 bg-white p-4">
                    <p className="text-sm font-extrabold text-stone-950">
                      Table selected from QR code
                    </p>
                  </div>
                )}
              </section>
            )}

            {orderType === "DINE_IN" && qrTableId.length === 0 && (
              <section>
                <h2 className="mb-3 text-xs font-extrabold uppercase text-stone-600">
                  Select Your Table
                </h2>
                <div className="rounded-lg border border-orange-100 bg-white p-4">
                  <div className="mb-4 flex gap-4 text-xs font-medium text-stone-600">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-orange-700" />
                      Selected
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-orange-200" />
                      Available
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-stone-200" />
                      Occupied
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {tables.map((table) => {
                      const selected = selectedTableId === table._id;
                      const occupied = !table.isActive || table.isOccupied;
                      const tableLabel = formatTableLabel(table);

                      return (
                        <button
                          key={table._id}
                          type="button"
                          disabled={occupied}
                          aria-pressed={selected}
                          onClick={() => {
                            if (!occupied) setSelectedTableId(table._id);
                          }}
                          className={`min-h-[242px] overflow-hidden rounded-lg border text-left transition ${
                            selected
                              ? "border-orange-600 bg-orange-50 text-orange-700 shadow-sm"
                              : occupied
                                ? "cursor-not-allowed border-stone-100 bg-stone-50 text-stone-400"
                                : "border-orange-100 bg-white text-stone-800 shadow-sm hover:border-orange-300"
                          }`}
                        >
                          <div
                            className={`flex items-start justify-between gap-2 border-b px-3 py-3 ${
                              selected
                                ? "border-orange-200 bg-orange-50"
                                : "border-orange-100 bg-orange-50/50"
                            }`}
                          >
                            <div>
                              <span className="block text-[11px] font-black uppercase text-stone-500">
                                Table
                              </span>
                              <span className="mt-1 block text-2xl font-black text-stone-950">
                                {tableLabel}
                              </span>
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ring-1 ${
                                selected
                                  ? "bg-orange-50 text-orange-700 ring-orange-200"
                                  : occupied
                                    ? "bg-amber-50 text-amber-700 ring-amber-200"
                                    : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              }`}
                            >
                              {selected
                                ? "Selected"
                                : occupied
                                  ? "Occupied"
                                  : "Available"}
                            </span>
                          </div>

                          <div className="p-3">
                            <div className="mx-auto flex aspect-square w-full max-w-36 items-center justify-center rounded-lg border border-orange-100 bg-white p-2 shadow-inner">
                              {table.qrCode ? (
                                <img
                                  src={table.qrCode}
                                  alt={`QR code for ${tableLabel}`}
                                  className={`h-full w-full object-contain ${
                                    occupied ? "opacity-55" : ""
                                  }`}
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center rounded-lg bg-orange-50 text-orange-700">
                                  <QrCode size={30} strokeWidth={2.3} />
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-extrabold uppercase text-stone-600">
                  Order Summary
                </h2>
                <span className="text-xs font-medium text-stone-500">
                  {cartItems.length} items
                </span>
              </div>

              <div className="overflow-hidden rounded-lg border border-orange-100 bg-white">
                {cartItems.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="font-bold text-stone-950">Your cart is empty</p>
                    <button
                      type="button"
                      onClick={() => navigate(getMenuPath())}
                      className="mt-3 rounded-full bg-orange-700 px-5 py-2 text-sm font-bold text-white"
                    >
                      View Menu
                    </button>
                  </div>
                ) : (
                  cartItems.map((item, index) => {
                    const menuItem = resolveMenuItem(item);
                    const lineTotal = (menuItem?.price || 0) * item.quantity;

                    return (
                      <div
                        key={`${menuItem?._id || index}-${item.quantity}`}
                        className="flex items-center gap-3 border-b border-orange-50 p-3 last:border-b-0"
                      >
                        <img
                          src={menuItem?.image || fallbackImage}
                          alt={menuItem?.name || "Menu item"}
                          className="h-12 w-12 rounded-md object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-extrabold text-stone-950">
                            {item.quantity}x {menuItem?.name || "Menu item"}
                          </p>
                          <p className="mt-1 truncate text-xs text-stone-500">
                            {menuItem?.category || "Cart item"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleCartQuantityChange(item, item.quantity - 1)
                            }
                            disabled={cartUpdatingId === getMenuItemId(item)}
                            aria-label="Decrease quantity"
                            className="flex size-8 items-center justify-center rounded-full border border-orange-100 text-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="min-w-6 text-center text-sm font-black text-stone-950">
                            {cartUpdatingId === getMenuItemId(item) ? (
                              <Loader2 size={14} className="mx-auto animate-spin" />
                            ) : (
                              item.quantity
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCartQuantityChange(item, item.quantity + 1)
                            }
                            disabled={cartUpdatingId === getMenuItemId(item)}
                            aria-label="Increase quantity"
                            className="flex size-8 items-center justify-center rounded-full border border-orange-100 text-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveCartItem(item)}
                            disabled={cartUpdatingId === getMenuItemId(item)}
                            aria-label="Remove item"
                            className="flex size-8 items-center justify-center rounded-full border border-red-100 text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <p className="w-20 text-right text-base font-extrabold text-stone-950">
                          {formatCurrency(lineTotal)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-orange-100 bg-white/95 px-4 py-4 shadow-[0_-12px_30px_rgba(120,53,15,0.08)] backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={!canPlaceOrder || orderPlaced}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-full bg-orange-700 text-base font-extrabold text-white shadow-lg transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {placingOrder ? (
              <Loader2 size={19} className="animate-spin" />
            ) : (
              <LockKeyhole size={18} />
            )}
            {orderPlaced
              ? "Order Placed"
              : paymentFailed
                ? `Retry Payment ${formatCurrency(totalAmount)}`
                : `Proceed to Payment ${formatCurrency(totalAmount)}`}
            <ArrowRight size={19} />
          </button>
        </div>
      </footer>
    </main>
  );
};

export default Checkout;
