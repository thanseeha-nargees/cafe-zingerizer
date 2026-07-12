import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Loader2,
  Info,
  Search,
  ShoppingBasket,
  SlidersHorizontal,
  Sparkles,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api/axios";
import Navbar from "../components/Navbar";
import ProductReviewsPanel from "../components/reviews/ProductReviewsPanel";
import StarRating from "../components/reviews/StarRating";
import type { RatingBreakdown, ReviewSummary } from "../reviews/types";
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
  isAvailable: boolean;
  averageRating?: number;
  reviewCount?: number;
  ratingBreakdown?: RatingBreakdown;
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
  isActive: boolean;
  isOccupied: boolean;
};

type SortKey = "featured" | "price-asc" | "price-desc" | "name";

const fallbackImage =
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700&h=520&fit=crop&q=80";

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name", label: "Name" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

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

const resolveMenuItem = (item: CartItem) =>
  typeof item.menuItemId === "string" ? null : item.menuItemId;

function ProductCard({
  item,
  onAdd,
  onView,
  adding,
}: {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
  onView: (item: MenuItem) => void;
  adding: boolean;
}) {
  return (
    <article className="group overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_20px_50px_rgba(120,53,15,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(120,53,15,0.14)]">
      <div className="relative h-48 overflow-hidden bg-orange-100">
        <img
          src={item.image || fallbackImage}
          alt={item.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/70 to-transparent px-4 pb-4 pt-10">
          <span className="inline-flex rounded-full bg-white/95 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-orange-700">
            {item.category}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-extrabold leading-tight text-stone-950">
              {item.name}
            </h3>
            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">
              Fresh
            </span>
          </div>

          <p className="min-h-12 text-sm leading-6 text-stone-500">
            {item.description || "Freshly prepared and ready to order."}
          </p>
          <div className="flex items-center gap-2">
            <StarRating value={item.averageRating || 0} size={15} />
            <span className="text-xs font-bold text-stone-500">
              {(item.averageRating || 0).toFixed(1)} ({item.reviewCount || 0})
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-400">
              Price
            </p>
            <p className="text-2xl font-black text-orange-700">
              {formatCurrency(item.price)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onView(item)}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-orange-100 bg-white px-4 text-sm font-bold text-stone-800 transition hover:border-orange-200 hover:text-orange-700"
            >
              <Info size={16} />
              Details
            </button>
            <button
              type="button"
              onClick={() => onAdd(item)}
              disabled={adding || !item.isAvailable}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-stone-950 px-5 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {adding ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{adding ? "Adding" : "Add"}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

const Menu = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tableId: routeTableId } = useParams();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [qrTable, setQrTable] = useState<Table | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("featured");
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState("");
  const [error, setError] = useState("");
  const [qrError, setQrError] = useState("");
  const deferredSearch = useDeferredValue(search);
  const qrTableId = routeTableId || searchParams.get("table") || "";

  const loadCart = async (userId: string) => {
    const cartResponse = await api.get<{ cart: Cart | null }>(`/cart/${userId}`);
    setCart(cartResponse.data.cart);
  };

  useEffect(() => {
    if (routeTableId || searchParams.get("table")) {
      saveQrTableSession(routeTableId || searchParams.get("table") || "");
    } else {
      clearQrTableSession();
    }
  }, [routeTableId, searchParams]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        let validatedTable: Table | null = null;

        if (qrTableId) {
          const tableResponse = await api.get<{ data: Table }>(
            `/tables/${qrTableId}`
          );
          validatedTable = tableResponse.data.data;
          saveQrTableSession(validatedTable._id, validatedTable.tableNumber);
        }

        const [meResponse, menuResponse] = await Promise.all([
          api.get<{ user: AuthUser }>("/auth/me"),
          api.get<{ menus: MenuItem[] }>("/menu"),
        ]);

        if (!mounted) return;

        setUser(meResponse.data.user);
        setItems(menuResponse.data.menus.filter((item) => item.isAvailable));
        setQrTable(validatedTable);
        setQrError("");

        const cartResponse = await api.get<{ cart: Cart | null }>(
          `/cart/${meResponse.data.user.id}`
        );

        if (mounted) {
          setCart(cartResponse.data.cart);
        }
      } catch (loadError) {
        if (mounted) {
          const message = getApiMessage(
            loadError,
            "Unable to load menu. Please check that the backend menu and cart routes are running."
          );

          if (qrTableId) {
            setQrError(message);
          } else {
            setError(message);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [qrTableId]);

  const categoryCounts = useMemo(() => {
    const counts = items.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.category] = (accumulator[item.category] || 0) + 1;
      return accumulator;
    }, {});

    return ["All", ...Object.keys(counts)].map((category) => ({
      category,
      count:
        category === "All"
          ? items.length
          : counts[category] || 0,
    }));
  }, [items]);

  const filteredItems = useMemo(() => {
    const searchTerm = deferredSearch.trim().toLowerCase();

    const matchingItems = items.filter((item) => {
      const categoryMatch =
        activeCategory === "All" || item.category === activeCategory;
      const searchMatch =
        !searchTerm ||
        item.name.toLowerCase().includes(searchTerm) ||
        item.description.toLowerCase().includes(searchTerm) ||
        item.category.toLowerCase().includes(searchTerm);

      return categoryMatch && searchMatch;
    });

    const sortedItems = [...matchingItems];

    switch (sortBy) {
      case "price-asc":
        sortedItems.sort((left, right) => left.price - right.price);
        break;
      case "price-desc":
        sortedItems.sort((left, right) => right.price - left.price);
        break;
      case "name":
        sortedItems.sort((left, right) => left.name.localeCompare(right.name));
        break;
      default:
        break;
    }

    return sortedItems;
  }, [activeCategory, deferredSearch, items, sortBy]);

  const groupedItems = useMemo(() => {
    return filteredItems.reduce<Record<string, MenuItem[]>>((groups, item) => {
      groups[item.category] = [...(groups[item.category] || []), item];
      return groups;
    }, {});
  }, [filteredItems]);

  const cartCount =
    cart?.items.reduce((total, item) => total + item.quantity, 0) || 0;

  const cartTotal =
    cart?.items.reduce((total, item) => {
      const menuItem = resolveMenuItem(item);
      return total + (menuItem?.price || 0) * item.quantity;
    }, 0) || 0;

  const selectedTableId = qrTable?._id || qrTableId;

  if (!loading && qrError) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-orange-50 px-4">
          <section className="w-full max-w-lg rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-extrabold uppercase tracking-wide text-red-600">
              Invalid QR Code
            </p>
            <h1 className="mt-3 text-3xl font-black text-stone-950">
              This table link is not available
            </h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-stone-500">
              {qrError}
            </p>
          </section>
        </main>
      </>
    );
  }

  const handleAdd = async (item: MenuItem) => {
    if (!user) return;

    setAddingId(item._id);
    setError("");

    try {
      await api.post("/cart", {
        userId: user.id,
        menuItemId: item._id,
      });
      await loadCart(user.id);
    } catch (addError) {
      setError(getApiMessage(addError, "Unable to add item to cart."));
    } finally {
      setAddingId("");
    }
  };

  const updateProductSummary = (productId: string, summary: ReviewSummary) => {
    setItems((current) =>
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
    setSelectedProduct((current) =>
      current && current._id === productId
        ? {
            ...current,
            averageRating: summary.averageRating,
            reviewCount: summary.reviewCount,
            ratingBreakdown: summary.ratingBreakdown,
          }
        : current
    );
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_28%),linear-gradient(180deg,_#fff7ed_0%,_#fffbf5_44%,_#fff1dc_100%)] px-4 py-5 sm:px-6 sm:py-7">
        <div className="mx-auto max-w-6xl">
          <section className="overflow-hidden rounded-[32px] bg-stone-950 px-5 py-6 text-white shadow-[0_24px_80px_rgba(28,25,23,0.22)] sm:px-8 sm:py-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-orange-200">
                  <Sparkles size={14} />
                  Kitchen specials
                </p>
                <h1 className="mt-4 font-serif text-4xl font-black leading-tight text-white sm:text-5xl">
                  Pick your next favorite plate.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-stone-300 sm:text-base">
                  Browse the live kitchen lineup, add what you like, and head
                  straight to checkout when your order looks right.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-orange-200">
                    Available items
                  </p>
                  <p className="mt-1 text-2xl font-black">{items.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-orange-200">
                    Categories
                  </p>
                  <p className="mt-1 text-2xl font-black">
                    {Math.max(categoryCounts.length - 1, 0)}
                  </p>
                </div>
                <div className="col-span-2 rounded-2xl border border-white/10 bg-gradient-to-r from-orange-500/20 to-amber-400/10 px-4 py-3 sm:col-span-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-orange-200">
                    Service
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-bold text-white">
                    <UtensilsCrossed size={16} />
                    {qrTable
                      ? `Dine-in detected for Table ${qrTable.tableNumber}`
                      : "Ready for dine-in or takeaway"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-5 rounded-[28px] border border-orange-100 bg-white/90 p-4 shadow-[0_16px_40px_rgba(120,53,15,0.08)] backdrop-blur sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <label className="flex h-12 flex-1 items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50/60 px-4">
                <Search size={18} className="text-orange-500" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search burgers, wraps, fries, shakes..."
                  className="w-full bg-transparent text-sm font-medium text-stone-900 outline-none placeholder:text-stone-400"
                />
              </label>

              <button
                type="button"
                onClick={() => setShowSortOptions((value) => !value)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-800"
              >
                <SlidersHorizontal size={18} />
                {sortOptions.find((option) => option.value === sortBy)?.label}
              </button>
            </div>

            {showSortOptions ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {sortOptions.map((option) => {
                  const selected = option.value === sortBy;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSortBy(option.value);
                        setShowSortOptions(false);
                      }}
                      className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                        selected
                          ? "bg-stone-950 text-white"
                          : "bg-orange-50 text-orange-800 hover:bg-orange-100"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {categoryCounts.map(({ category, count }) => {
                const selected = activeCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                      selected
                        ? "bg-stone-950 text-white"
                        : "bg-orange-50 text-stone-700 hover:bg-orange-100"
                    }`}
                  >
                    {category} ({count})
                  </button>
                );
              })}
            </div>
          </section>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[358px] animate-pulse rounded-[28px] border border-orange-100 bg-white/80"
                />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="mt-6 rounded-[28px] border border-orange-100 bg-white p-8 text-center shadow-sm">
              <p className="text-lg font-extrabold text-stone-950">No items found</p>
              <p className="mt-2 text-sm text-stone-500">
                Try another search term or switch to a different category.
              </p>
            </div>
          ) : (
            <div className="pb-28">
              {Object.entries(groupedItems).map(([category, categoryItems]) => (
                <section key={category} className="mt-8">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-orange-700">
                        Category
                      </p>
                      <h2 className="mt-1 text-2xl font-black text-stone-950">
                        {category}
                      </h2>
                    </div>
                    <p className="text-sm font-bold text-stone-500">
                      {categoryItems.length} item{categoryItems.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {categoryItems.map((item) => (
                      <ProductCard
                        key={item._id}
                        item={item}
                        adding={addingId === item._id}
                        onAdd={handleAdd}
                        onView={setSelectedProduct}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {cartCount > 0 ? (
          <div className="fixed inset-x-0 bottom-4 z-20 px-4 sm:px-6">
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 rounded-[26px] bg-stone-950 px-4 py-3 text-white shadow-[0_24px_60px_rgba(28,25,23,0.3)] sm:px-5">
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-orange-300">
                  Cart ready
                </p>
                <p className="mt-1 text-sm font-bold text-white sm:text-base">
                  {cartCount} item{cartCount === 1 ? "" : "s"} in cart
                </p>
                <p className="text-xs text-stone-300 sm:text-sm">
                  Total {formatCurrency(cartTotal)}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate(selectedTableId ? `/checkout/${selectedTableId}` : "/checkout")
                }
                className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-orange-600 px-5 text-sm font-bold text-white transition hover:bg-orange-500"
              >
                <ShoppingBasket size={18} />
                Checkout
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : null}

        {selectedProduct ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/55 px-4 py-6">
            <article className="max-h-full w-full max-w-xl overflow-y-auto rounded-[28px] bg-white shadow-2xl">
              <div className="relative h-64 bg-orange-100">
                <img
                  src={selectedProduct.image || fallbackImage}
                  alt={selectedProduct.name}
                  className="h-full w-full rounded-t-[28px] object-cover"
                />
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  aria-label="Close product details"
                  className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white text-stone-700 shadow-sm"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5">
                <p className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase text-orange-700">
                  {selectedProduct.category}
                </p>
                <h2 className="mt-3 text-2xl font-black text-stone-950">
                  {selectedProduct.name}
                </h2>
                <p className="mt-3 text-sm leading-6 text-stone-600">
                  {selectedProduct.description ||
                    "Freshly prepared and ready to order."}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <StarRating value={selectedProduct.averageRating || 0} size={18} />
                  <span className="text-sm font-bold text-stone-500">
                    {(selectedProduct.averageRating || 0).toFixed(1)} from{" "}
                    {selectedProduct.reviewCount || 0} review
                    {(selectedProduct.reviewCount || 0) === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <p className="text-2xl font-black text-orange-700">
                    {formatCurrency(selectedProduct.price)}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleAdd(selectedProduct)}
                    disabled={addingId === selectedProduct._id}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-stone-950 px-5 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {addingId === selectedProduct._id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : null}
                    Add to Cart
                  </button>
                </div>
                <ProductReviewsPanel
                  productId={selectedProduct._id}
                  onSummaryChange={(summary) =>
                    updateProductSummary(selectedProduct._id, summary)
                  }
                />
              </div>
            </article>
          </div>
        ) : null}
      </main>
    </>
  );
};

export default Menu;
