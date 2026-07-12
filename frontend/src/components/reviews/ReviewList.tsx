import { CalendarDays, ShieldCheck, Trash2, Pencil } from "lucide-react";
import type { ProductReview } from "../../reviews/types";
import StarRating from "./StarRating";

type ReviewListProps = {
  reviews: ProductReview[];
  editable?: boolean;
  canManage?: (review: ProductReview) => boolean;
  onEdit?: (review: ProductReview) => void;
  onDelete?: (review: ProductReview) => void;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value));

function ReviewList({
  reviews,
  editable = false,
  canManage,
  onEdit,
  onDelete,
}: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-lg border border-orange-100 bg-white p-5 text-center text-sm font-bold text-stone-500">
        No reviews yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <article key={review._id} className="rounded-lg border border-orange-100 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-black text-stone-950">
                  {review.user?.userName || "Customer"}
                </p>
                {review.verifiedPurchase ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700 ring-1 ring-emerald-100">
                    <ShieldCheck size={12} />
                    Verified
                  </span>
                ) : null}
                {review.isHidden ? (
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-black uppercase text-stone-600">
                    Hidden
                  </span>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StarRating value={review.rating} size={15} />
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500">
                  <CalendarDays size={13} />
                  {formatDate(review.createdAt)}
                </span>
              </div>
            </div>

            {editable && (!canManage || canManage(review)) ? (
              <div className="flex shrink-0 items-center gap-1">
                {onEdit ? (
                  <button
                    type="button"
                    onClick={() => onEdit(review)}
                    className="flex size-8 items-center justify-center rounded-lg border border-orange-100 text-stone-700 transition hover:border-orange-200 hover:text-orange-800"
                    title="Edit review"
                  >
                    <Pencil size={14} />
                  </button>
                ) : null}
                {onDelete ? (
                  <button
                    type="button"
                    onClick={() => onDelete(review)}
                    className="flex size-8 items-center justify-center rounded-lg border border-red-100 text-red-600 transition hover:border-red-200 hover:bg-red-50"
                    title="Delete review"
                  >
                    <Trash2 size={14} />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {review.product ? (
            <p className="mt-3 text-xs font-bold uppercase text-orange-700">
              {review.product.name}
            </p>
          ) : null}

          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-stone-600">
            {review.review || "No written review."}
          </p>
        </article>
      ))}
    </div>
  );
}

export default ReviewList;
