import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  MapPin,
  Utensils,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/axios";

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

const selectedTableStorageKey = "selectedTableId";
const phoneRegex = /^[6-9]\d{9}$/;

const fallbackImage =
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=300&fit=crop&q=80";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const resolveMenuItem = (item: CartItem) =>
  typeof item.menuItemId === "string" ? null : item.menuItemId;

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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [qrTableId, setQrTableId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placedOrderTable, setPlacedOrderTable] = useState<Table | null>(null);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const tableIdFromQr =
          searchParams.get("table") ||
          localStorage.getItem(selectedTableStorageKey) ||
          "";

        const [meResponse, tableResponse] = await Promise.all([
          api.get<{ user: AuthUser }>("/auth/me"),
          api.post<TableSettingsResponse>("/tables/settings/setup", {
            rows: 3,
            columns: 4,
          }),
        ]);

        if (!mounted) return;

        const loadedTables = tableResponse.data.data.tables;

        setUser(meResponse.data.user);
        setTables(loadedTables);

        const cartResponse = await api.get<{ cart: Cart | null }>(
          `/cart/${meResponse.data.user.id}`
        );

        if (!mounted) return;

        setCart(cartResponse.data.cart);

        if (tableIdFromQr) {
          localStorage.setItem(selectedTableStorageKey, tableIdFromQr);
          setQrTableId(tableIdFromQr);
          setOrderType("DINE_IN");
          setSelectedTableId(tableIdFromQr);
        } else {
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
  }, [searchParams]);

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

    try {
      const selectedTable = tables.find((table) => table._id === selectedTableId) || null;

      await api.post("/orders", {
        orderType,
        customerName: trimmedCustomerName,
        customerPhone: trimmedCustomerPhone,
        ...(orderType === "DINE_IN" ? { tableId: selectedTableId } : {}),
      });
      localStorage.removeItem(selectedTableStorageKey);
      setPlacedOrderTable(orderType === "DINE_IN" ? selectedTable : null);
      setOrderPlaced(true);
      setCart({ items: [] });
    } catch (orderError) {
      setError(getApiMessage(orderError, "Unable to place order."));
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <main className="min-h-screen bg-orange-50/60 pb-28">
      <header className="sticky top-0 z-20 border-b border-orange-100 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/menu")}
            aria-label="Back to menu"
            className="flex h-9 w-9 items-center justify-center rounded-full text-orange-700 hover:bg-orange-50"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-extrabold text-orange-700">Checkout</h1>
          <span className="w-9" />
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-6">
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {orderPlaced ? (
          <div className="rounded-lg border border-orange-100 bg-white p-6 text-center shadow-sm">
            <CheckCircle2 className="mx-auto text-green-600" size={42} />
            <h2 className="mt-4 text-xl font-extrabold text-stone-950">
              Order placed successfully
            </h2>
            <p className="mt-2 text-sm font-medium text-stone-500">
              Your food ready SMS will be sent to {customerPhone}.
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
                <div className="rounded-lg border border-orange-100 bg-white p-4">
                  <p className="text-sm font-extrabold text-stone-950">
                    {tables.find((table) => table._id === qrTableId)
                      ? `Table ${tables.find((table) => table._id === qrTableId)?.tableNumber}`
                      : "Table selected from QR code"}
                  </p>
                  <p className="mt-1 text-xs font-medium text-stone-500">
                    This table was detected from your QR scan.
                  </p>
                </div>
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

                  <div className="grid grid-cols-4 gap-2">
                    {tables.map((table) => {
                      const selected = selectedTableId === table._id;
                      const occupied = !table.isActive || table.isOccupied;
                      const tableLabel =
                        table.tableNo ||
                        table.tableName ||
                        table.label ||
                        `T-${String(table.tableNumber).padStart(2, "0")}`;

                      return (
                        <button
                          key={table._id}
                          type="button"
                          disabled={occupied}
                          onClick={() => {
                            if (!occupied) setSelectedTableId(table._id);
                          }}
                          className={`h-14 rounded-md border text-[11px] font-extrabold transition ${
                            selected
                              ? "border-orange-600 bg-orange-50 text-orange-700"
                              : occupied
                                ? "cursor-not-allowed border-stone-100 bg-stone-50 text-stone-300"
                                : "border-orange-100 bg-white text-stone-800 hover:border-orange-300"
                          }`}
                        >
                          {tableLabel}
                          <span className="mt-1 block text-[9px] font-bold uppercase">
                            {selected
                              ? "Selected"
                              : occupied
                                ? "Occupied"
                                : "Available"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            <section>
              <h2 className="mb-3 text-xs font-extrabold uppercase text-stone-600">
                Takeaway / Delivery Address
              </h2>
              <div className="flex items-center gap-4 rounded-lg border border-orange-100 bg-white p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                  <MapPin size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-stone-950">Home</p>
                  <p className="mt-1 text-xs leading-5 text-stone-500">
                    Flat 402, Sunset Towers, 12th Main, Indiranagar, Bengaluru
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs font-extrabold text-orange-700"
                >
                  Change
                </button>
              </div>
            </section>

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
                      onClick={() => navigate("/menu")}
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
                        <p className="text-base font-extrabold text-stone-950">
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
        <div className="mx-auto max-w-xl">
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
            {orderPlaced ? "Order Placed" : `Pay ${formatCurrency(totalAmount)}`}
            <ArrowRight size={19} />
          </button>
        </div>
      </footer>
    </main>
  );
};

export default Checkout;
