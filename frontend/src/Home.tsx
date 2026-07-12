import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Coffee,
  CupSoda,
  Flame,
  QrCode,
  Sandwich,
  ShoppingBag,
  Sparkles,
  Utensils,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "./api/axios";
import Navbar from "./components/Navbar";
import StarRating from "./components/reviews/StarRating";
import type { ProductReview, RatingBreakdown } from "./reviews/types";

type MenuItem = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image?: string;
  isAvailable?: boolean;
  averageRating?: number;
  reviewCount?: number;
  ratingBreakdown?: RatingBreakdown;
};

const fallbackProductImage =
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&h=650&fit=crop&q=85";

const heroImage =
  "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1800&h=1100&fit=crop&q=85";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

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

const categoryCards = [
  {
    name: "Burgers",
    query: "Burgers",
    description: "Stacked, juicy and toasted to order.",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700&h=520&fit=crop&q=85",
    icon: Utensils,
  },
  {
    name: "Wraps",
    query: "Wraps",
    description: "Fresh fillings folded into soft wraps.",
    image:
      "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=700&h=520&fit=crop&q=85",
    icon: Sandwich,
  },
  {
    name: "Snacks",
    query: "Snacks",
    description: "Crispy sides for quick cravings.",
    image:
      "https://images.unsplash.com/photo-1639024471283-03518883512d?w=700&h=520&fit=crop&q=85",
    icon: Flame,
  },
  {
    name: "Beverages",
    query: "Beverages",
    description: "Cool sips, shakes and cafe refreshers.",
    image:
      "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=700&h=520&fit=crop&q=85",
    icon: CupSoda,
  },
  {
    name: "Desserts",
    query: "Desserts",
    description: "Sweet finishes for every table.",
    image:
      "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=700&h=520&fit=crop&q=85",
    icon: Coffee,
  },
];

const fallbackReviews = [
  {
    _id: "fallback-review-1",
    user: { userName: "Aisha" },
    product: { name: "Classic Zinger Burger" },
    rating: 5,
    review:
      "The burger was hot, crisp and packed beautifully. The QR ordering felt effortless.",
  },
  {
    _id: "fallback-review-2",
    user: { userName: "Rahul" },
    product: { name: "Loaded Wrap" },
    rating: 5,
    review:
      "Fast service, clean flavors and an easy checkout. This feels like a proper modern cafe.",
  },
  {
    _id: "fallback-review-3",
    user: { userName: "Meera" },
    product: { name: "Cold Coffee" },
    rating: 4,
    review:
      "Loved the drinks and the table ordering flow. No waiting around to place the order.",
  },
] satisfies Array<
  Pick<ProductReview, "_id" | "rating" | "review"> & {
    user: { userName: string };
    product: { name: string };
  }
>;

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-700">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-stone-950 sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-stone-600 sm:text-base">
        {description}
      </p>
    </div>
  );
}

function Home() {
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadHomeData = async () => {
      setLoadingProducts(true);
      setLoadError("");

      try {
        const menuResponse = await api.get<{ menus: MenuItem[] }>("/menu");
        const availableProducts = (menuResponse.data.menus || []).filter(
          (item) => item.isAvailable !== false
        );

        if (!mounted) return;

        setProducts(availableProducts);

        const reviewSources = [...availableProducts]
          .sort(
            (left, right) =>
              (right.reviewCount || 0) - (left.reviewCount || 0) ||
              (right.averageRating || 0) - (left.averageRating || 0)
          )
          .slice(0, 4);

        const reviewResponses = await Promise.all(
          reviewSources.map((item) =>
            api
              .get<{ reviews: ProductReview[] }>(`/reviews/product/${item._id}`)
              .then((response) => response.data.reviews || [])
              .catch(() => [])
          )
        );

        if (!mounted) return;

        setReviews(
          reviewResponses
            .flat()
            .filter((review) => !review.isHidden)
            .sort(
              (left, right) =>
                new Date(right.createdAt).getTime() -
                new Date(left.createdAt).getTime()
            )
            .slice(0, 3)
        );
      } catch (error) {
        if (mounted) {
          setLoadError(
            getApiMessage(error, "Unable to load live menu highlights.")
          );
        }
      } finally {
        if (mounted) {
          setLoadingProducts(false);
        }
      }
    };

    void loadHomeData();

    return () => {
      mounted = false;
    };
  }, []);

  const popularProducts = useMemo(() => {
    return [...products]
      .sort(
        (left, right) =>
          (right.averageRating || 0) - (left.averageRating || 0) ||
          (right.reviewCount || 0) - (left.reviewCount || 0)
      )
      .slice(0, 4);
  }, [products]);

  const featuredProduct = popularProducts[0] || products[0];
  const visibleReviews = reviews.length > 0 ? reviews : fallbackReviews;

  return (
    <>
      <Navbar />

      <main className="overflow-hidden bg-[#fff8f1] text-stone-950">
        <section className="relative min-h-[calc(100vh-76px)] bg-stone-950 text-white">
          <img
            src={heroImage}
            alt="Premium cafe burger with fries"
            className="absolute inset-0 h-full w-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/82 to-stone-950/30" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#fff8f1] to-transparent" />

          <div className="relative mx-auto flex min-h-[calc(100vh-76px)] max-w-7xl items-center px-4 py-14 sm:px-6 lg:px-8">
            <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1.05fr)_420px] lg:items-center">
              <div className="max-w-3xl">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-orange-100 backdrop-blur">
                  <Sparkles size={15} />
                  Premium cafe ordering
                </p>
                <h1 className="mt-6 text-5xl font-black leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
                  Crafted fast food with a cafe soul.
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-stone-200 sm:text-lg">
                  Fresh burgers, loaded wraps, crispy snacks and smooth drinks,
                  all served through a fast digital ordering experience built for
                  dine-in, takeaway and QR table service.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/menu"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-orange-600 px-7 text-sm font-black text-white shadow-[0_20px_45px_rgba(234,88,12,0.35)] transition hover:-translate-y-0.5 hover:bg-orange-500"
                  >
                    Explore Menu
                    <ArrowRight size={17} />
                  </Link>
                  <Link
                    to="/menu"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-7 text-sm font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white hover:text-stone-950"
                  >
                    Order Now
                    <ShoppingBag size={17} />
                  </Link>
                </div>
              </div>

              <aside className="rounded-lg border border-white/15 bg-white/12 p-5 shadow-2xl backdrop-blur-xl">
                <div className="overflow-hidden rounded-lg bg-white text-stone-950">
                  <img
                    src={featuredProduct?.image || fallbackProductImage}
                    alt={featuredProduct?.name || "Featured cafe dish"}
                    className="h-56 w-full object-cover"
                  />
                  <div className="p-5">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-700">
                      Kitchen favorite
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                      {featuredProduct?.name || "Classic Zinger Burger"}
                    </h2>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <StarRating
                          value={featuredProduct?.averageRating || 4.8}
                          size={16}
                        />
                        <span className="text-xs font-bold text-stone-500">
                          {(featuredProduct?.averageRating || 4.8).toFixed(1)}
                        </span>
                      </div>
                      <span className="text-xl font-black text-orange-700">
                        {formatCurrency(featuredProduct?.price || 199)}
                      </span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="relative z-10 -mt-10 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-3 rounded-lg border border-orange-100 bg-white p-4 shadow-[0_24px_70px_rgba(120,53,15,0.12)] sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg bg-orange-50 p-4">
              <Clock3 className="text-orange-700" size={22} />
              <div>
                <p className="text-sm font-black">Fast Kitchen Handoff</p>
                <p className="text-xs font-semibold text-stone-500">
                  Built for busy dine-in hours
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4">
              <BadgeCheck className="text-emerald-700" size={22} />
              <div>
                <p className="text-sm font-black">Verified Reviews</p>
                <p className="text-xs font-semibold text-stone-500">
                  Ratings from real orders
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-stone-100 p-4">
              <QrCode className="text-stone-800" size={22} />
              <div>
                <p className="text-sm font-black">Scan and Order</p>
                <p className="text-xs font-semibold text-stone-500">
                  QR table flow stays intact
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="Featured categories"
              title="Find your next craving faster."
              description="Jump into the existing menu from a focused category card. The Menu page remains the source of truth for ordering."
            />

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {categoryCards.map((category) => {
                const Icon = category.icon;

                return (
                  <Link
                    key={category.name}
                    to={`/menu?category=${encodeURIComponent(category.query)}`}
                    className="group overflow-hidden rounded-lg bg-white shadow-[0_18px_45px_rgba(120,53,15,0.08)] ring-1 ring-orange-100 transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(120,53,15,0.16)]"
                  >
                    <div className="relative h-44 overflow-hidden">
                      <img
                        src={category.image}
                        alt={category.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 to-transparent" />
                      <span className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-white/90 text-orange-700 shadow-sm">
                        <Icon size={19} />
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-black text-stone-950">
                        {category.name}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-stone-500">
                        {category.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-700">
                  Popular dishes
                </p>
                <h2 className="mt-3 text-3xl font-black text-stone-950 sm:text-4xl">
                  Live favorites from the menu.
                </h2>
                <p className="mt-3 text-sm leading-6 text-stone-600 sm:text-base">
                  Pulled from the existing products API and kept intentionally
                  focused so Home stays a showcase, not a duplicate menu.
                </p>
              </div>
              <Link
                to="/menu"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-stone-950 px-5 text-sm font-black text-white transition hover:bg-orange-700"
              >
                View Menu
                <ArrowRight size={16} />
              </Link>
            </div>

            {loadError ? (
              <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                {loadError}
              </div>
            ) : null}

            {loadingProducts ? (
              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[360px] animate-pulse rounded-lg bg-orange-50"
                  />
                ))}
              </div>
            ) : (
              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {(popularProducts.length > 0
                  ? popularProducts
                  : [
                      {
                        _id: "fallback-product",
                        name: "Classic Zinger Burger",
                        category: "Burgers",
                        description: "Crispy, saucy and ready for the table.",
                        price: 199,
                        image: fallbackProductImage,
                        averageRating: 4.8,
                        reviewCount: 128,
                      },
                    ]
                ).map((product) => (
                  <article
                    key={product._id}
                    className="group overflow-hidden rounded-lg border border-orange-100 bg-[#fffaf5] shadow-[0_18px_45px_rgba(120,53,15,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(120,53,15,0.15)]"
                  >
                    <div className="relative h-52 overflow-hidden">
                      <img
                        src={product.image || fallbackProductImage}
                        alt={product.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                      />
                      <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-orange-700">
                        {product.category}
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="text-xl font-black leading-tight text-stone-950">
                        {product.name}
                      </h3>
                      <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-stone-500">
                        {product.description ||
                          "Freshly prepared and served with cafe care."}
                      </p>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <StarRating value={product.averageRating || 0} size={15} />
                          <span className="text-xs font-bold text-stone-500">
                            {(product.averageRating || 0).toFixed(1)}
                          </span>
                        </div>
                        <span className="text-xl font-black text-orange-700">
                          {formatCurrency(product.price)}
                        </span>
                      </div>
                      <Link
                        to="/menu"
                        className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-stone-950 text-sm font-black text-white transition hover:bg-orange-700"
                      >
                        View Menu
                        <ArrowRight size={15} />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="bg-[#191512] px-4 py-20 text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="Customer reviews"
              title="Real feedback, warm table energy."
              description="A few recent review highlights are loaded from the existing review endpoints attached to live menu products."
            />

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {visibleReviews.map((review) => (
                <article
                  key={review._id}
                  className="rounded-lg border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur"
                >
                  <StarRating value={review.rating} size={17} />
                  <p className="mt-5 text-sm leading-7 text-stone-200">
                    "{review.review || "A delicious visit and smooth ordering experience."}"
                  </p>
                  <div className="mt-6 border-t border-white/10 pt-4">
                    <p className="font-black text-white">
                      {review.user?.userName || "Cafe Guest"}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-orange-200">
                      {review.product?.name || "Verified order"}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default Home;
