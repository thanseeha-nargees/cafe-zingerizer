import type { ReviewSummary } from "../../reviews/types";
import StarRating from "./StarRating";

type RatingSummaryProps = {
  summary: ReviewSummary;
};

const breakdownRows = [
  { label: "5", key: "five" },
  { label: "4", key: "four" },
  { label: "3", key: "three" },
  { label: "2", key: "two" },
  { label: "1", key: "one" },
] as const;

function RatingSummary({ summary }: RatingSummaryProps) {
  const total = summary.reviewCount || 0;

  return (
    <section className="rounded-lg border border-orange-100 bg-orange-50/50 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="sm:w-36">
          <p className="text-4xl font-black text-stone-950">
            {summary.averageRating ? summary.averageRating.toFixed(1) : "0.0"}
          </p>
          <StarRating value={summary.averageRating} size={17} />
          <p className="mt-1 text-xs font-bold text-stone-500">
            {total} review{total === 1 ? "" : "s"}
          </p>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {breakdownRows.map((row) => {
            const count = summary.ratingBreakdown?.[row.key] || 0;
            const percent = total ? Math.round((count / total) * 100) : 0;

            return (
              <div key={row.key} className="grid grid-cols-[3.5rem_1fr_2rem] items-center gap-2">
                <span className="text-xs font-black text-stone-600">
                  {row.label} star
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-white">
                  <span
                    className="block h-full rounded-full bg-amber-400"
                    style={{ width: `${percent}%` }}
                  />
                </span>
                <span className="text-right text-xs font-bold text-stone-500">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default RatingSummary;
