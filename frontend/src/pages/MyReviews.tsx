import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/axios";
import Navbar from "../components/Navbar";
import ReviewForm from "../components/reviews/ReviewForm";
import ReviewList from "../components/reviews/ReviewList";
import type { ProductReview } from "../reviews/types";

type MyReviewsResponse = {
  reviews: ProductReview[];
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

function MyReviews() {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [editingReview, setEditingReview] = useState<ProductReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  const loadReviews = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<MyReviewsResponse>("/reviews/me");
      setReviews(response.data.reviews || []);
    } catch (loadError) {
      setError(getApiMessage(loadError, "Unable to load your reviews."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReviews();
  }, []);

  const filteredReviews = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return reviews;

    return reviews.filter((review) =>
      `${review.product?.name || ""} ${review.review || ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [reviews, search]);

  const handleUpdate = async (data: { rating: number; review: string }) => {
    if (!editingReview) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await api.patch<{ review: ProductReview }>(
        `/reviews/${editingReview._id}`,
        data
      );

      setReviews((current) =>
        current.map((review) =>
          review._id === editingReview._id ? response.data.review : review
        )
      );
      setEditingReview(null);
      setNotice("Review updated.");
    } catch (updateError) {
      setError(getApiMessage(updateError, "Unable to update review."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (review: ProductReview) => {
    const confirmed = window.confirm("Delete this review?");

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await api.delete(`/reviews/${review._id}`);
      setReviews((current) => current.filter((item) => item._id !== review._id));
      setNotice("Review deleted.");
    } catch (deleteError) {
      setError(getApiMessage(deleteError, "Unable to delete review."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-orange-50/60 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-orange-700">
                My Reviews
              </p>
              <h1 className="mt-1 text-3xl font-black text-stone-950">
                Product Reviews
              </h1>
              <p className="mt-2 text-sm font-semibold text-stone-500">
                Edit or delete reviews from your completed orders.
              </p>
            </div>
            <button
              type="button"
              onClick={loadReviews}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-orange-100 bg-white px-4 text-sm font-bold text-stone-800 shadow-sm transition hover:border-orange-200 hover:text-orange-800"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          <label className="mb-4 flex h-11 items-center gap-3 rounded-lg border border-orange-100 bg-white px-3 shadow-sm">
            <Search size={17} className="text-stone-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search your reviews"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-stone-400"
            />
          </label>

          {error ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              {notice}
            </div>
          ) : null}

          {editingReview ? (
            <div className="mb-4">
              <ReviewForm
                initialRating={editingReview.rating}
                initialReview={editingReview.review}
                submitLabel="Save Review"
                saving={saving}
                onSubmit={handleUpdate}
                onCancel={() => setEditingReview(null)}
              />
            </div>
          ) : null}

          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center text-sm font-bold text-stone-500">
              <Loader2 size={18} className="mr-2 animate-spin text-orange-700" />
              Loading reviews...
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-lg border border-orange-100 bg-white p-8 text-center shadow-sm">
              <p className="text-lg font-black text-stone-950">
                No reviews yet
              </p>
              <p className="mt-2 text-sm font-semibold text-stone-500">
                Complete an order, then review the products you purchased.
              </p>
              <Link
                to="/menu"
                className="mt-5 inline-flex h-10 items-center rounded-full bg-orange-700 px-5 text-sm font-black text-white"
              >
                Browse Menu
              </Link>
            </div>
          ) : (
            <ReviewList
              reviews={filteredReviews}
              editable
              onEdit={setEditingReview}
              onDelete={(review) => void handleDelete(review)}
            />
          )}
        </div>
      </main>
    </>
  );
}

export default MyReviews;
