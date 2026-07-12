import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-react";
import { api } from "../../api/axios";
import StarRating from "../../components/reviews/StarRating";
import type { ProductReview } from "../../reviews/types";

type ProductOption = {
  _id: string;
  name: string;
  category?: string;
};

type AdminReviewsResponse = {
  reviews: ProductReview[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
};

type ProductsResponse = {
  products: ProductOption[];
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

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

function ReviewsPage() {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState("");
  const [rating, setRating] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const loadReviews = async (nextPage = page) => {
    setLoading(true);
    setError("");

    try {
      const [reviewResponse, productResponse] = await Promise.all([
        api.get<AdminReviewsResponse>("/reviews/admin", {
          params: {
            search: search.trim() || undefined,
            productId: productId || undefined,
            rating: rating || undefined,
            page: nextPage,
            limit: 20,
          },
        }),
        products.length === 0
          ? api.get<ProductsResponse>("/reviews/admin/products")
          : Promise.resolve({ data: { products } }),
      ]);

      setReviews(reviewResponse.data.reviews || []);
      setPage(reviewResponse.data.pagination.page);
      setTotal(reviewResponse.data.pagination.total);
      setHasMore(reviewResponse.data.pagination.hasMore);
      setProducts(productResponse.data.products || []);
    } catch (loadError) {
      setError(getApiMessage(loadError, "Unable to load reviews."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReviews(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, rating]);

  const hiddenCount = useMemo(
    () => reviews.filter((review) => review.isHidden).length,
    [reviews]
  );

  const toggleVisibility = async (review: ProductReview) => {
    setSavingId(review._id);
    setError("");
    setNotice("");

    try {
      const response = await api.patch<{ review: ProductReview; message?: string }>(
        `/reviews/admin/${review._id}/visibility`,
        { isHidden: !review.isHidden }
      );

      setReviews((current) =>
        current.map((item) =>
          item._id === review._id ? response.data.review : item
        )
      );
      setNotice(response.data.message || "Review updated.");
    } catch (visibilityError) {
      setError(getApiMessage(visibilityError, "Unable to update review."));
    } finally {
      setSavingId("");
    }
  };

  const deleteReview = async (review: ProductReview) => {
    const confirmed = window.confirm("Delete this review permanently?");

    if (!confirmed) return;

    setSavingId(review._id);
    setError("");
    setNotice("");

    try {
      await api.delete(`/reviews/admin/${review._id}`);
      setReviews((current) => current.filter((item) => item._id !== review._id));
      setTotal((current) => Math.max(current - 1, 0));
      setNotice("Review deleted.");
    } catch (deleteError) {
      setError(getApiMessage(deleteError, "Unable to delete review."));
    } finally {
      setSavingId("");
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-orange-700">
            Review Management
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-stone-950">
            Product Reviews
          </h1>
          <p className="mt-2 text-sm font-semibold text-stone-500">
            Moderate customer ratings, verified purchases, and product feedback.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadReviews(1)}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-orange-100 bg-white px-4 text-sm font-bold text-stone-800 shadow-sm transition hover:border-orange-200 hover:text-orange-800"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-orange-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase text-stone-500">
            Loaded Reviews
          </p>
          <p className="mt-1 text-2xl font-black text-stone-950">{reviews.length}</p>
        </div>
        <div className="rounded-lg border border-orange-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase text-stone-500">
            Hidden Reviews
          </p>
          <p className="mt-1 text-2xl font-black text-stone-950">{hiddenCount}</p>
        </div>
        <div className="rounded-lg border border-orange-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase text-stone-500">
            Total Matching
          </p>
          <p className="mt-1 text-2xl font-black text-stone-950">{total}</p>
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-orange-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_160px_auto]">
          <label className="flex h-11 items-center gap-3 rounded-lg border border-orange-100 bg-orange-50 px-3">
            <Search size={17} className="text-stone-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reviewer, product, or review"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-stone-400"
            />
          </label>
          <select
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            className="h-11 rounded-lg border border-orange-100 bg-white px-3 text-sm font-bold text-stone-800 outline-none focus:border-orange-500"
          >
            <option value="">All products</option>
            {products.map((product) => (
              <option key={product._id} value={product._id}>
                {product.name}
              </option>
            ))}
          </select>
          <select
            value={rating}
            onChange={(event) => setRating(event.target.value)}
            className="h-11 rounded-lg border border-orange-100 bg-white px-3 text-sm font-bold text-stone-800 outline-none focus:border-orange-500"
          >
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value} stars
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => loadReviews(1)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-orange-700 px-4 text-sm font-black text-white transition hover:bg-orange-800"
          >
            <Search size={16} />
            Search
          </button>
        </div>
      </section>

      {error ? (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {notice}
        </div>
      ) : null}

      <section className="mt-5 overflow-hidden rounded-lg border border-orange-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center text-sm font-bold text-stone-500">
            <Loader2 size={18} className="mr-2 animate-spin text-orange-700" />
            Loading reviews...
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-12 text-center text-sm font-bold text-stone-500">
            No reviews found.
          </div>
        ) : (
          <div className="divide-y divide-orange-100">
            {reviews.map((review) => {
              const busy = savingId === review._id;

              return (
                <article key={review._id} className="p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-black text-stone-950">
                          {review.product?.name || "Product"}
                        </h2>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase text-emerald-700 ring-1 ring-emerald-100">
                          <ShieldCheck size={12} />
                          Verified
                        </span>
                        {review.isHidden ? (
                          <span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-black uppercase text-stone-600">
                            Hidden
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <StarRating value={review.rating} size={16} />
                        <span className="text-xs font-bold text-stone-500">
                          {review.user?.userName || "Customer"} -{" "}
                          {review.user?.email || "No email"}
                        </span>
                        <span className="text-xs font-bold text-stone-500">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>
                      <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-6 text-stone-600">
                        {review.review || "No written review."}
                      </p>
                      <p className="mt-3 text-xs font-bold text-stone-500">
                        Order #{review.orderId.slice(-6).toUpperCase()}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleVisibility(review)}
                        disabled={busy}
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-orange-100 bg-white px-3 text-sm font-bold text-stone-700 transition hover:border-orange-200 hover:text-orange-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busy ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : review.isHidden ? (
                          <Eye size={15} />
                        ) : (
                          <EyeOff size={15} />
                        )}
                        {review.isHidden ? "Unhide" : "Hide"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteReview(review)}
                        disabled={busy}
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-100 bg-white px-3 text-sm font-bold text-red-600 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm font-bold text-stone-500">
          Page {page} {hasMore ? "" : "- end"}
        </p>
        <button
          type="button"
          disabled={!hasMore || loading}
          onClick={() => loadReviews(page + 1)}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-orange-100 bg-white px-4 text-sm font-bold text-stone-800 transition hover:border-orange-200 hover:text-orange-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Star size={15} />
          Next Page
        </button>
      </div>
    </div>
  );
}

export default ReviewsPage;
