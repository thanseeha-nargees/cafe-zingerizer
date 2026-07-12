import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "../../api/axios";
import type {
  ProductReview,
  ReviewableOrder,
  ReviewSummary,
} from "../../reviews/types";
import RatingSummary from "./RatingSummary";
import ReviewForm from "./ReviewForm";
import ReviewList from "./ReviewList";

type ProductReviewsPanelProps = {
  productId: string;
  onSummaryChange?: (summary: ReviewSummary) => void;
};

type ProductReviewsResponse = {
  summary: ReviewSummary;
  reviews: ProductReview[];
};

type EligibilityResponse = {
  eligibleOrders: ReviewableOrder[];
  existingReviews: ProductReview[];
};

type ReviewResponse = {
  review?: ProductReview;
  summary: ReviewSummary;
  message?: string;
};

type SortKey = "latest" | "highest" | "lowest";

const emptySummary: ReviewSummary = {
  averageRating: 0,
  reviewCount: 0,
  ratingBreakdown: {
    one: 0,
    two: 0,
    three: 0,
    four: 0,
    five: 0,
  },
};

const formatOrderLabel = (order: ReviewableOrder) =>
  `Order #${order._id.slice(-5).toUpperCase()} - ${new Intl.DateTimeFormat(
    "en-IN",
    { dateStyle: "medium" }
  ).format(new Date(order.createdAt))}`;

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

function ProductReviewsPanel({
  productId,
  onSummaryChange,
}: ProductReviewsPanelProps) {
  const [summary, setSummary] = useState<ReviewSummary>(emptySummary);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [eligibleOrders, setEligibleOrders] = useState<ReviewableOrder[]>([]);
  const [myReviews, setMyReviews] = useState<ProductReview[]>([]);
  const [sort, setSort] = useState<SortKey>("latest");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [editingReview, setEditingReview] = useState<ProductReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const onSummaryChangeRef = useRef(onSummaryChange);

  useEffect(() => {
    onSummaryChangeRef.current = onSummaryChange;
  }, [onSummaryChange]);

  const reviewableOrders = useMemo(
    () => eligibleOrders.filter((order) => !order.isReviewed),
    [eligibleOrders]
  );
  const myReviewIds = useMemo(
    () => new Set(myReviews.map((review) => review._id)),
    [myReviews]
  );

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [reviewResponse, eligibilityResponse] = await Promise.all([
        api.get<ProductReviewsResponse>(`/reviews/product/${productId}`, {
          params: { sort },
        }),
        api
          .get<EligibilityResponse>(`/reviews/eligibility/${productId}`)
          .catch(() => ({
            data: {
              eligibleOrders: [],
              existingReviews: [],
            },
          })),
      ]);

      setSummary(reviewResponse.data.summary || emptySummary);
      setReviews(reviewResponse.data.reviews || []);
      setEligibleOrders(eligibilityResponse.data.eligibleOrders || []);
      setMyReviews(eligibilityResponse.data.existingReviews || []);
      setSelectedOrderId((current) => {
        if (current) return current;

        const nextOrder = (eligibilityResponse.data.eligibleOrders || []).find(
          (order) => !order.isReviewed
        );

        return nextOrder?._id || "";
      });
      onSummaryChangeRef.current?.(reviewResponse.data.summary || emptySummary);
    } catch (loadError) {
      setError(getApiMessage(loadError, "Unable to load reviews."));
    } finally {
      setLoading(false);
    }
  }, [productId, sort]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const applySummary = (nextSummary: ReviewSummary) => {
    setSummary(nextSummary);
    onSummaryChangeRef.current?.(nextSummary);
  };

  const handleCreateReview = async (data: { rating: number; review: string }) => {
    if (!selectedOrderId) return;

    setSaving(true);
    setError("");

    try {
      const response = await api.post<ReviewResponse>("/reviews", {
        productId,
        orderId: selectedOrderId,
        rating: data.rating,
        review: data.review,
      });

      applySummary(response.data.summary);
      setSelectedOrderId("");
      await loadReviews();
    } catch (submitError) {
      setError(getApiMessage(submitError, "Unable to submit review."));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateReview = async (data: { rating: number; review: string }) => {
    if (!editingReview) return;

    setSaving(true);
    setError("");

    try {
      const response = await api.patch<ReviewResponse>(
        `/reviews/${editingReview._id}`,
        data
      );

      applySummary(response.data.summary);
      setEditingReview(null);
      await loadReviews();
    } catch (updateError) {
      setError(getApiMessage(updateError, "Unable to update review."));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReview = async (review: ProductReview) => {
    const confirmed = window.confirm("Delete this review?");

    if (!confirmed) return;

    setSaving(true);
    setError("");

    try {
      const response = await api.delete<ReviewResponse>(`/reviews/${review._id}`);
      applySummary(response.data.summary);
      await loadReviews();
    } catch (deleteError) {
      setError(getApiMessage(deleteError, "Unable to delete review."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-6 flex items-center justify-center rounded-lg border border-orange-100 bg-orange-50/50 py-8 text-sm font-bold text-stone-500">
        <Loader2 size={17} className="mr-2 animate-spin text-orange-700" />
        Loading reviews...
      </div>
    );
  }

  return (
    <section className="mt-6 space-y-4">
      <RatingSummary summary={summary} />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      {editingReview ? (
        <ReviewForm
          initialRating={editingReview.rating}
          initialReview={editingReview.review}
          submitLabel="Save Review"
          saving={saving}
          onSubmit={handleUpdateReview}
          onCancel={() => setEditingReview(null)}
        />
      ) : reviewableOrders.length > 0 ? (
        <div className="rounded-lg border border-orange-100 bg-orange-50/40 p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-black text-stone-950">
                Review your verified purchase
              </h3>
              <p className="mt-1 text-xs font-semibold text-stone-500">
                Only completed orders are eligible.
              </p>
            </div>
            <select
              value={selectedOrderId}
              onChange={(event) => setSelectedOrderId(event.target.value)}
              className="h-10 rounded-lg border border-orange-100 bg-white px-3 text-sm font-bold text-stone-800 outline-none focus:border-orange-500"
            >
              {reviewableOrders.map((order) => (
                <option key={order._id} value={order._id}>
                  {formatOrderLabel(order)}
                </option>
              ))}
            </select>
          </div>
          <ReviewForm saving={saving} onSubmit={handleCreateReview} />
        </div>
      ) : myReviews.length > 0 ? (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          You have reviewed every completed order for this product.
        </div>
      ) : (
        <div className="rounded-lg border border-orange-100 bg-orange-50/40 px-4 py-3 text-sm font-bold text-stone-500">
          Buy this item in a completed order to leave a verified review.
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-black text-stone-950">Customer Reviews</h3>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as SortKey)}
          className="h-10 rounded-lg border border-orange-100 bg-white px-3 text-sm font-bold text-stone-800 outline-none focus:border-orange-500"
        >
          <option value="latest">Latest</option>
          <option value="highest">Highest Rating</option>
          <option value="lowest">Lowest Rating</option>
        </select>
      </div>

      <ReviewList
        reviews={reviews}
        editable
        canManage={(review) => myReviewIds.has(review._id)}
        onEdit={(review) => {
          if (myReviewIds.has(review._id)) {
            setEditingReview(review);
          }
        }}
        onDelete={(review) => {
          if (myReviewIds.has(review._id)) {
            void handleDeleteReview(review);
          }
        }}
      />
    </section>
  );
}

export default ProductReviewsPanel;
