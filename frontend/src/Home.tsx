import { useState } from "react";
import Navbar from "./components/Navbar";

const categories = [
  { name: "Burgers", emoji: "🍔" },
  { name: "Wraps", emoji: "🌯" },
  { name: "Sandwiches", emoji: "🥪" },
  { name: "Nuggets", emoji: "🍗" },
  { name: "Onion Rings", emoji: "🧅" },
  { name: "Spring Rolls", emoji: "🥟" },
];

const popularItems = [
  {
    name: "Classic Zinger Burger",
    price: "₹199",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop&q=80",
  },
  {
    name: "Double Cheese Burger",
    price: "₹249",
    image:
      "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop&q=80",
  },
  {
    name: "Glazed Donuts",
    price: "₹99",
    image:
      "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=300&fit=crop&q=80",
  },
  {
    name: "Club Sandwich",
    price: "₹179",
    image:
      "https://images.unsplash.com/photo-1539252554935-80c7c3d5c3c4?w=400&h=300&fit=crop&q=80",
  },
  {
    name: "Crispy Onion Rings",
    price: "₹129",
    image:
      "https://images.unsplash.com/photo-1639024471283-03518883512d?w=400&h=300&fit=crop&q=80",
  },
  {
    name: "Choco Donut Stack",
    price: "₹149",
    image:
      "https://images.unsplash.com/photo-1582294955881-6ce32d6cf3ec?w=400&h=300&fit=crop&q=80",
  },
];

const Home = () => {
  const [activeCategory, setActiveCategory] = useState("Burgers");
  const [search, setSearch] = useState("");

  return (
    <>
      <Navbar />

      <div className="bg-orange-50 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {/* Hero */}
          <div className="grid lg:grid-cols-2 gap-10 items-center py-8 sm:py-12">
            {/* Left: heading */}
            <div>
              <span className="inline-block rounded-full bg-orange-100 px-4 py-2 text-xs font-bold uppercase tracking-wider text-orange-700">
                Premium Food Delivery
              </span>
              <h1 className="mt-6 text-5xl sm:text-6xl font-extrabold leading-[1.05] text-stone-950">
                The Smarter
                <br />
                Way to{" "}
                <span className="text-orange-700">Order</span>
              </h1>
              <p className="mt-5 max-w-md text-stone-600">
                Fresh ingredients, bold flavors, and lightning-fast delivery —
                straight from Zingerizer's kitchen to your door.
              </p>
              <button className="mt-7 inline-flex items-center gap-2 rounded-full bg-orange-700 px-7 py-3 text-sm font-semibold text-white transition hover:bg-orange-800">
                Order Now <span aria-hidden="true">→</span>
              </button>
            </div>

            {/* Right: floating offer card */}
            <div className="relative">
              <div className="relative overflow-hidden rounded-3xl bg-stone-950 p-8 sm:p-10 min-h-[320px] flex flex-col">
                <span className="inline-block self-start rounded-full bg-orange-700 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white">
                  Limited Time Offer
                </span>
                <h2 className="mt-5 text-4xl font-extrabold text-white leading-tight">
                  Summer
                  <br />
                  Sale
                </h2>
                <p className="mt-3 max-w-xs text-sm text-stone-300">
                  Experience the finest delicacies crafted with care, now at
                  unbeatable prices.
                </p>

                <img
                  src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=500&fit=crop&q=80"
                  alt="Cheeseburger"
                  className="absolute bottom-0 right-0 w-48 sm:w-60 translate-x-4 translate-y-2 object-cover rounded-tl-3xl"
                />
              </div>

              {/* Floating price tag */}
              <div className="absolute -top-4 right-6 sm:right-10 rotate-6 rounded-xl bg-white px-5 py-3 shadow-lg">
                <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                  Price
                </p>
                <p className="text-xl font-extrabold text-stone-950">₹150</p>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <span className="text-stone-400" aria-hidden="true">
                🔍
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for burgers, wraps, nuggets..."
                className="w-full bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400"
              />
            </div>
            <button
              aria-label="Filter"
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-700 text-white shadow-sm transition hover:bg-orange-800"
            >
              ⚙
            </button>
          </div>

          {/* Categories */}
          <div className="mt-8 grid grid-cols-3 sm:grid-cols-6 gap-4">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  className="flex flex-col items-center gap-2 text-center"
                >
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-2xl text-2xl transition ${
                      isActive
                        ? "border-2 border-orange-600 bg-orange-100"
                        : "border border-stone-200 bg-white"
                    }`}
                  >
                    <span aria-hidden="true">{cat.emoji}</span>
                  </div>
                  <span
                    className={`text-xs font-medium uppercase tracking-wide ${
                      isActive ? "text-orange-700" : "text-stone-600"
                    }`}
                  >
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Popular items */}
          <div className="mt-10 flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-950 uppercase tracking-wide">
              Popular Items
            </h2>
            <a
              href="/menu"
              className="text-sm font-semibold text-orange-700 hover:text-orange-800"
            >
              View All →
            </a>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pb-12">
            {popularItems.map((item) => (
              <div
                key={item.name}
                className="group relative overflow-hidden rounded-xl bg-white shadow-sm border border-stone-100"
              >
                <div className="relative h-32 sm:h-36">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                  <button
                    aria-label="Add to favorites"
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm text-stone-600 shadow-sm transition hover:text-orange-600"
                  >
                    ♡
                  </button>
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-stone-900 leading-snug">
                    {item.name}
                  </p>
                  <p className="mt-1 text-sm font-bold text-orange-700">
                    {item.price}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;