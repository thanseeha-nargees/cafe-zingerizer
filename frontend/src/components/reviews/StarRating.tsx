import { Star } from "lucide-react";

type StarRatingProps = {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  label?: string;
};

function StarRating({ value, onChange, size = 18, label }: StarRatingProps) {
  const roundedValue = Math.round(value);

  return (
    <div className="inline-flex items-center gap-1" aria-label={label}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= roundedValue;

        if (!onChange) {
          return (
            <Star
              key={star}
              size={size}
              className={filled ? "fill-amber-400 text-amber-400" : "text-stone-300"}
            />
          );
        }

        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="rounded-sm text-amber-400 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-100"
            aria-label={`${star} star`}
          >
            <Star
              size={size}
              className={filled ? "fill-amber-400" : "text-stone-300"}
            />
          </button>
        );
      })}
    </div>
  );
}

export default StarRating;
