import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock3, Loader2, RefreshCw, Utensils, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/axios";
import Navbar from "../components/Navbar";
import ReviewForm from "../components/reviews/ReviewForm";
import { useOrderEvents } from "../utils/useOrderEvents";
import type {
  ProductReview,
  RatingBreakdown,
  ReviewSummary,
} from "../reviews/types";

type AuthUser = {
  id: string;
};

type MenuItem = {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  averageRating?: number;
  reviewCount?: number;
  ratingBreakdown?: RatingBreakdown;
};

type OrderItem = {
  menuItemId: string | MenuItem;
  quantity: number;
  price: number;
};

type Order = {
  _id: string;
  items: OrderItem[];
  orderType: "DINE_IN" | "TAKEAWAY" | "Dining" | "Takeaway";
  totalAmount: number;
  orderStatus:
    | "PENDING"
    | "CONFIRMED"
    | "ACCEPTED"
    | "PREPARING"
    | "READY"
    | "COMPLETED"
    | "CANCELLED";
  paymentStatus: "PENDING" | "PAID";
  createdAt: string;
  confirmedAt?: string | null;
  preparingStartedAt?: string | null;
  estimatedReadyAt?: string | null;
};

type MyReviewsResponse = {
  reviews: ProductReview[];
};

type ReviewResponse = {
  review?: ProductReview;
  summary: ReviewSummary;
};

type ReviewModalState = {
  order: Order;
  productId: string;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=240&h=240&fit=crop&q=80";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));

const getMenuId = (item: OrderItem) =>
  typeof item.menuItemId === "string" ? item.menuItemId : item.menuItemId._id;

const getOrderMenuItem = (item: OrderItem, menuById: Map<string, MenuItem>) =>
  menuById.get(getMenuId(item)) ||
  (typeof item.menuItemId === "string" ? undefined : item.menuItemId);

const getReviewKey = (orderId: string, productId: string) =>
  `${orderId}:${productId}`;

const getReviewableProducts = (order: Order, menuById: Map<string, MenuItem>) => {
  const seen = new Set<string>();

  return order.items.reduce<MenuItem[]>((products, item) => {
    const productId = getMenuId(item);

    if (seen.has(productId)) return products;

    const menuItem = getOrderMenuItem(item, menuById);
    if (menuItem) {
      products.push(menuItem);
      seen.add(productId);
    }

    return products;
  }, []);
};

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

const statusClass: Record<Order["orderStatus"], string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-teal-100 text-teal-700",
  PREPARING: "bg-orange-100 text-orange-700",
  READY: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const formatCountdown = (remainingMs: number) => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
};

const getReadyLabel = (order: Order) =>
  order.orderType === "TAKEAWAY" || order.orderType === "Takeaway"
    ? "Ready for Pickup"
    : "Ready to Serve";

const getPreparationCountdown = (order: Order, now: number) => {
  if (order.orderStatus !== "PREPARING" || !order.estimatedReadyAt) {
    return null;
  }

  const estimatedReadyAt = new Date(order.estimatedReadyAt).getTime();

  if (Number.isNaN(estimatedReadyAt)) {
    return null;
  }

  const remainingMs = Math.max(estimatedReadyAt - now, 0);

  return {
    isReady: remainingMs <= 0,
    remainingText: formatCountdown(remainingMs),
  };
};

function OrderCard({
  order,
  menuById,
  now,
  reviewsByOrderProduct,
  onReorder,
  onOpenReview,
  onDeleteReview,
  reviewSaving,
}: {
  order: Order;
  menuById: Map<string, MenuItem>;
  now: number;
  reviewsByOrderProduct: Map<string, ProductReview>;
  onReorder: () => void;
  onOpenReview: (order: Order, productId?: string) => void;
  onDeleteReview: (review: ProductReview) => void;
  reviewSaving: boolean;
}) {
  const reviewableProducts =
    order.orderStatus === "COMPLETED" ? getReviewableProducts(order, menuById) : [];
  const reviewedCount = reviewableProducts.filter((product) =>
    reviewsByOrderProduct.has(getReviewKey(order._id, product._id))
  ).length;
  const reviewActionLabel =
    reviewedCount === 0
      ? "Write Review"
      : reviewedCount === reviewableProducts.length
        ? "Edit Review"
        : "Manage Reviews";
  const preparationCountdown = getPreparationCountdown(order, now);
  const displayStatus = preparationCountdown?.isReady ? "READY" : order.orderStatus;

  return (
    <article className="rounded-lg border border-orange-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-stone-950">
            #Z-{order._id.slice(-5).toUpperCase()}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {formatDate(order.createdAt)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase ${statusClass[displayStatus]}`}
        >
          {displayStatus}
        </span>
      </div>

      {preparationCountdown ? (
        <div
          className={`mt-4 flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
            preparationCountdown.isReady
              ? "border-emerald-100 bg-emerald-50"
              : "border-orange-100 bg-orange-50/70"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                preparationCountdown.isReady
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-white text-orange-700"
              }`}
            >
              <Clock3 size={17} />
            </span>
            <div>
              <p className="text-xs font-black uppercase text-stone-500">
                Preparation
              </p>
              <p className="mt-1 text-sm font-bold text-stone-900">
                {preparationCountdown.isReady
                  ? getReadyLabel(order)
                  : "Estimated ready time"}
              </p>
            </div>
          </div>
          <p
            className={`text-2xl font-black tabular-nums ${
              preparationCountdown.isReady ? "text-emerald-700" : "text-orange-700"
            }`}
          >
            {preparationCountdown.isReady
              ? "Ready"
              : preparationCountdown.remainingText}
          </p>
        </div>
      ) : null}

      <div className="mt-4 space-y-3 border-b border-orange-50 pb-4">
        {order.items.map((item, index) => {
          const productId = getMenuId(item);
          const menuItem = getOrderMenuItem(item, menuById);
          const existingReview = reviewsByOrderProduct.get(
            getReviewKey(order._id, productId)
          );

          return (
            <div
              key={`${productId}-${index}`}
              className="grid grid-cols-[3rem_1fr_auto] items-center gap-3"
            >
              <img
                src={menuItem?.image || fallbackImage}
                alt={menuItem?.name || "Menu item"}
                className="h-12 w-12 rounded-md object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-900">
                  {item.quantity}x {menuItem?.name || "Menu item"}
                </p>
                <p className="mt-1 truncate text-xs text-stone-500">
                  {menuItem?.category || order.orderType.replace("_", " ")}
                </p>
                {order.orderStatus === "COMPLETED" && menuItem ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {existingReview ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenReview(order, productId)}
                          className="h-8 rounded-full border border-orange-100 bg-orange-50 px-3 text-xs font-black text-orange-800 transition hover:border-orange-300"
                        >
                          Edit Review
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteReview(existingReview)}
                          disabled={reviewSaving}
                          className="h-8 rounded-full border border-red-100 bg-white px-3 text-xs font-black text-red-700 transition hover:border-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Delete Review
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpenReview(order, productId)}
                        className="h-8 rounded-full border border-orange-100 bg-white px-3 text-xs font-black text-orange-800 transition hover:border-orange-300 hover:bg-orange-50"
                      >
                        Write Review
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
              <p className="text-sm font-semibold text-stone-700">
                {formatCurrency(item.price * item.quantity)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-stone-500">Total Amount</p>
          <p className="text-xl font-extrabold text-orange-700">
            {formatCurrency(order.totalAmount)}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {reviewableProducts.length > 0 ? (
            <button
              type="button"
              onClick={() => onOpenReview(order)}
              className="inline-flex h-9 items-center rounded-full border border-orange-100 bg-white px-4 text-sm font-bold text-orange-800 transition hover:border-orange-300 hover:bg-orange-50"
            >
              {reviewActionLabel}
            </button>
          ) : null}
          {order.orderStatus === "COMPLETED" ? (
            <button
              type="button"
              onClick={onReorder}
              className="inline-flex h-9 items-center rounded-full bg-orange-700 px-5 text-sm font-bold text-white transition hover:bg-orange-800"
            >
              Reorder
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

const History = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewModal, setReviewModal] = useState<ReviewModalState | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refreshOrders = useCallback(async () => {
    try {
      const response = await api.get<{ data: Order[] }>("/orders/my-orders");
      setOrders(response.data.data);
    } catch {
      // Keep the current history visible if a background refresh fails.
    }
  }, []);

  const handleOrderEvent = useCallback(() => {
    void refreshOrders();
  }, [refreshOrders]);

  useOrderEvents(handleOrderEvent, Boolean(user));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [meResponse, orderResponse, menuResponse, reviewResponse] =
          await Promise.all([
            api.get<{ user: AuthUser }>("/auth/me"),
            api.get<{ data: Order[] }>("/orders/my-orders"),
            api.get<{ menus: MenuItem[] }>("/menu"),
            api.get<MyReviewsResponse>("/reviews/me").catch(() => ({
              data: { reviews: [] },
            })),
          ]);

        if (!mounted) return;

        setUser(meResponse.data.user);
        setOrders(orderResponse.data.data);
        setMenus(menuResponse.data.menus);
        setReviews(reviewResponse.data.reviews || []);
      } catch (loadError) {
        if (mounted) {
          setError(
            getApiMessage(
              loadError,
              "Unable to load order history. Please check that order and menu routes are running."
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
  }, []);

  const menuById = useMemo(
    () => new Map(menus.map((item) => [item._id, item])),
    [menus]
  );

  const reviewsByOrderProduct = useMemo(
    () =>
      new Map(
        reviews.map((review) => [
          getReviewKey(review.orderId, review.productId),
          review,
        ])
      ),
    [reviews]
  );

  const modalProducts = useMemo(
    () => (reviewModal ? getReviewableProducts(reviewModal.order, menuById) : []),
    [menuById, reviewModal]
  );

  const selectedModalReview = reviewModal
    ? reviewsByOrderProduct.get(
        getReviewKey(reviewModal.order._id, reviewModal.productId)
      )
    : undefined;
  const selectedModalProduct = reviewModal
    ? modalProducts.find((product) => product._id === reviewModal.productId)
    : undefined;

  const applyProductSummary = (productId: string, summary: ReviewSummary) => {
    setMenus((current) =>
      current.map((item) =>
        item._id === productId
          ? {
              ...item,
              averageRating: summary.averageRating,
              reviewCount: summary.reviewCount,
              ratingBreakdown: summary.ratingBreakdown,
            }
          : item
      )
    );
  };

  const openReviewModal = (order: Order, productId?: string) => {
    const products = getReviewableProducts(order, menuById);
    if (products.length === 0) return;

    const firstUnreviewed = products.find(
      (product) =>
        !reviewsByOrderProduct.has(getReviewKey(order._id, product._id))
    );
    const nextProductId =
      productId && products.some((product) => product._id === productId)
        ? productId
        : firstUnreviewed?._id || products[0]._id;

    setError("");
    setNotice("");
    setReviewModal({ order, productId: nextProductId });
  };

  const handleReorder = () => {
    navigate("/menu");
  };

  const handleReviewSubmit = async (data: { rating: number; review: string }) => {
    if (!reviewModal) return;

    const productId = reviewModal.productId;
    const existingReview = reviewsByOrderProduct.get(
      getReviewKey(reviewModal.order._id, productId)
    );

    setReviewSaving(true);
    setError("");
    setNotice("");

    try {
      const response = existingReview
        ? await api.patch<ReviewResponse>(`/reviews/${existingReview._id}`, data)
        : await api.post<ReviewResponse>("/reviews", {
            productId,
            orderId: reviewModal.order._id,
            rating: data.rating,
            review: data.review,
          });

      const savedReview = response.data.review;

      if (savedReview) {
        setReviews((current) => {
          const hasReview = current.some(
            (review) => review._id === savedReview._id
          );

          return hasReview
            ? current.map((review) =>
                review._id === savedReview._id ? savedReview : review
              )
            : [savedReview, ...current];
        });
      }

      applyProductSummary(productId, response.data.summary);
      setNotice(existingReview ? "Review updated." : "Review submitted.");
    } catch (submitError) {
      setError(getApiMessage(submitError, "Unable to save review."));
    } finally {
      setReviewSaving(false);
    }
  };

  const handleDeleteReview = async (review: ProductReview) => {
    const confirmed = window.confirm("Delete this review?");

    if (!confirmed) return;

    setReviewSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await api.delete<ReviewResponse>(`/reviews/${review._id}`);
      setReviews((current) => current.filter((item) => item._id !== review._id));
      applyProductSummary(review.productId, response.data.summary);
      setNotice("Review deleted.");
    } catch (deleteError) {
      setError(getApiMessage(deleteError, "Unable to delete review."));
    } finally {
      setReviewSaving(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-orange-50/60 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-stone-950">
                Order History
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                Your delicious memories, recorded.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              aria-label="Refresh orders"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-orange-700 shadow-sm"
            >
              <RefreshCw size={18} />
            </button>
          </div>

          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {notice && (
            <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {notice}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[420px] items-center justify-center text-stone-500">
              <Loader2 className="mr-2 animate-spin" size={20} />
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-lg border border-orange-100 bg-white p-8 text-center shadow-sm">
              <Utensils className="mx-auto text-orange-700" size={36} />
              <p className="mt-4 text-lg font-extrabold text-stone-950">
                No orders yet
              </p>
              <Link
                to="/menu"
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-orange-700 px-5 text-sm font-bold text-white"
              >
                View Menu <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="space-y-4 pb-6">
              {orders.map((order) => (
                <OrderCard
                  key={order._id}
                  order={order}
                  menuById={menuById}
                  now={now}
                  reviewsByOrderProduct={reviewsByOrderProduct}
                  onReorder={handleReorder}
                  onOpenReview={openReviewModal}
                  onDeleteReview={handleDeleteReview}
                  reviewSaving={reviewSaving}
                />
              ))}

              <section className="mt-4 rounded-lg bg-orange-700 p-6 text-white">
                <h2 className="text-xl font-extrabold">
                  Feeling Hungry Again?
                </h2>
                <p className="mt-2 text-sm font-medium text-orange-50">
                  Your favorites are just one tap away.
                </p>
                <Link
                  to="/menu"
                  className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-bold text-orange-700"
                >
                  View Menu <ArrowRight size={16} />
                </Link>
              </section>
            </div>
          )}
        </div>
      </main>

      {reviewModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-orange-100 px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase text-orange-700">
                  Verified Purchase
                </p>
                <h2 className="mt-1 text-xl font-black text-stone-950">
                  {selectedModalReview ? "Edit Review" : "Write Review"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                aria-label="Close review modal"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-700 transition hover:bg-stone-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {modalProducts.length > 1 ? (
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase text-stone-500">
                    Product
                  </span>
                  <select
                    value={reviewModal.productId}
                    onChange={(event) =>
                      setReviewModal((current) =>
                        current
                          ? { ...current, productId: event.target.value }
                          : current
                      )
                    }
                    className="h-11 w-full rounded-lg border border-orange-100 bg-white px-3 text-sm font-bold text-stone-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  >
                    {modalProducts.map((product) => (
                      <option key={product._id} value={product._id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {selectedModalProduct ? (
                <div className="flex items-center gap-3 rounded-lg border border-orange-100 bg-orange-50/50 p-3">
                  <img
                    src={selectedModalProduct.image || fallbackImage}
                    alt={selectedModalProduct.name}
                    className="h-14 w-14 rounded-md object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-stone-950">
                      {selectedModalProduct.name}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-stone-500">
                      Order #Z-{reviewModal.order._id.slice(-5).toUpperCase()}
                    </p>
                  </div>
                </div>
              ) : null}

              <ReviewForm
                key={`${reviewModal.order._id}-${reviewModal.productId}`}
                initialRating={selectedModalReview?.rating || 5}
                initialReview={selectedModalReview?.review || ""}
                submitLabel={
                  selectedModalReview ? "Save Review" : "Submit Review"
                }
                saving={reviewSaving}
                onSubmit={handleReviewSubmit}
                onCancel={() => setReviewModal(null)}
              />

              {selectedModalReview ? (
                <button
                  type="button"
                  onClick={() => handleDeleteReview(selectedModalReview)}
                  disabled={reviewSaving}
                  className="h-10 w-full rounded-lg border border-red-100 bg-white text-sm font-black text-red-700 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Delete Review
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default History;
