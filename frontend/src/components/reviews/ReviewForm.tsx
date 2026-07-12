import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";
import StarRating from "./StarRating";

type ReviewFormProps = {
  initialRating?: number;
  initialReview?: string;
  submitLabel?: string;
  saving?: boolean;
  onSubmit: (data: { rating: number; review: string }) => Promise<void> | void;
  onCancel?: () => void;
};

function ReviewForm({
  initialRating = 5,
  initialReview = "",
  submitLabel = "Submit Review",
  saving = false,
  onSubmit,
  onCancel,
}: ReviewFormProps) {
  const [rating, setRating] = useState(initialRating);
  const [review, setReview] = useState(initialReview);

  useEffect(() => {
    setRating(initialRating);
    setReview(initialReview);
  }, [initialRating, initialReview]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit({ rating, review: review.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-orange-100 bg-white p-4">
      <label className="block">
        <span className="mb-2 block text-xs font-black uppercase text-stone-500">
          Rating
        </span>
        <StarRating value={rating} onChange={setRating} size={24} />
      </label>

      <label className="mt-4 block">
        <span className="mb-2 block text-xs font-black uppercase text-stone-500">
          Review
        </span>
        <textarea
          value={review}
          onChange={(event) => setReview(event.target.value.slice(0, 1000))}
          rows={4}
          placeholder="Share what you liked..."
          className="w-full resize-none rounded-lg border border-orange-100 px-3 py-2 text-sm font-medium text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg border border-orange-100 bg-white px-4 text-sm font-bold text-stone-700 transition hover:border-orange-200 hover:text-orange-800"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-orange-700 px-4 text-sm font-black text-white transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export default ReviewForm;
