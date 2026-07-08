import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  CheckCircle2,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { api } from "../../api/axios";

type Product = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image?: string;
  isAvailable: boolean;
  createdAt?: string;
};

type ProductForm = {
  name: string;
  description: string;
  price: string;
  category: string;
  image: string;
  isAvailable: boolean;
};

type AvailabilityFilter = "all" | "available" | "unavailable";

const fallbackImage =
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=480&h=360&fit=crop&q=80";

const initialForm: ProductForm = {
  name: "",
  description: "",
  price: "",
  category: "",
  image: "",
  isAvailable: true,
};

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

function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<{ products: Product[] }>("/admin/products");
      setProducts(response.data.products || []);
    } catch (loadError) {
      setError(getApiMessage(loadError, "Failed to load products"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const categories = useMemo(
    () =>
      Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort(
        (left, right) => left.localeCompare(right)
      ),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const availabilityMatch =
        availability === "all" ||
        (availability === "available" && product.isAvailable) ||
        (availability === "unavailable" && !product.isAvailable);
      const searchMatch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term) ||
        (product.description || "").toLowerCase().includes(term);

      return availabilityMatch && searchMatch;
    });
  }, [availability, products, search]);

  const availableCount = products.filter((product) => product.isAvailable).length;
  const unavailableCount = products.length - availableCount;

  const resetForm = () => {
    setForm(initialForm);
    setImageFile(null);
    setEditingProduct(null);
  };

  const openCreateForm = () => {
    resetForm();
    setError("");
    setNotice("");
    setShowForm(true);
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      category: product.category,
      image: product.image || "",
      isAvailable: product.isAvailable,
    });
    setImageFile(null);
    setError("");
    setNotice("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const updateField = (
    field: keyof ProductForm,
    value: string | boolean
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setImageFile(event.target.files?.[0] || null);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.name.trim() || !form.category.trim() || Number(form.price) <= 0) {
      setError("Name, category, and a valid price are required.");
      return;
    }

    const formData = new FormData();
    formData.append("name", form.name.trim());
    formData.append("description", form.description.trim());
    formData.append("price", form.price);
    formData.append("category", form.category.trim());
    formData.append("isAvailable", String(form.isAvailable));

    if (imageFile) {
      formData.append("image", imageFile);
    } else if (form.image.trim()) {
      formData.append("image", form.image.trim());
    }

    setSaving(true);

    try {
      if (editingProduct) {
        await api.put(`/admin/products/${editingProduct._id}`, formData);
        setNotice("Product updated.");
      } else {
        await api.post("/admin/products", formData);
        setNotice("Product added.");
      }

      closeForm();
      await loadProducts();
    } catch (saveError) {
      setError(getApiMessage(saveError, "Unable to save product"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm(`Delete ${product.name}?`);

    if (!confirmed) return;

    setDeletingId(product._id);
    setError("");
    setNotice("");

    try {
      await api.delete(`/admin/products/${product._id}`);
      setProducts((current) =>
        current.filter((item) => item._id !== product._id)
      );
      setNotice("Product deleted.");
    } catch (deleteError) {
      setError(getApiMessage(deleteError, "Unable to delete product"));
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-wide text-orange-700">
            Menu Inventory
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Products
          </h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadProducts}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-orange-100 bg-white px-4 text-sm font-bold text-stone-800 shadow-sm transition hover:border-orange-200 hover:text-orange-800"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-orange-700 px-4 text-sm font-bold text-white shadow-sm shadow-orange-900/20 transition hover:bg-orange-800"
          >
            <Plus size={17} />
            Add Product
          </button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-orange-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-stone-500">
            Total
          </p>
          <p className="mt-2 text-3xl font-black text-stone-900">
            {loading ? "..." : products.length}
          </p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
            Available
          </p>
          <p className="mt-2 text-3xl font-black text-emerald-900">
            {loading ? "..." : availableCount}
          </p>
        </div>
        <div className="rounded-lg border border-red-100 bg-red-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-red-700">
            Hidden
          </p>
          <p className="mt-2 text-3xl font-black text-red-900">
            {loading ? "..." : unavailableCount}
          </p>
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-orange-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="flex h-11 flex-1 items-center gap-3 rounded-lg border border-orange-100 bg-orange-50 px-3">
            <Search size={17} className="text-orange-600" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products"
              className="w-full bg-transparent text-sm font-semibold text-stone-900 outline-none placeholder:text-stone-400"
            />
          </label>

          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-orange-100 bg-orange-50">
            {(["all", "available", "unavailable"] as AvailabilityFilter[]).map(
              (filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setAvailability(filter)}
                  className={[
                    "h-11 px-3 text-sm font-extrabold capitalize transition",
                    availability === filter
                      ? "bg-stone-950 text-white"
                      : "text-stone-700 hover:bg-white",
                  ].join(" ")}
                >
                  {filter === "unavailable" ? "Hidden" : filter}
                </button>
              )
            )}
          </div>
        </div>
      </section>

      {error ? (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          <CheckCircle2 size={17} />
          {notice}
        </div>
      ) : null}

      <section className="mt-5 overflow-hidden rounded-lg border border-orange-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-orange-100">
            <thead className="bg-orange-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-stone-500">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-stone-500">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-stone-500">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-stone-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-stone-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm font-bold text-stone-500"
                  >
                    Loading products...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm font-bold text-stone-500"
                  >
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product._id} className="align-middle">
                    <td className="px-4 py-4">
                      <div className="flex min-w-72 items-center gap-3">
                        <img
                          src={product.image || fallbackImage}
                          alt={product.name}
                          className="size-14 rounded-lg object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-extrabold text-stone-900">
                            {product.name}
                          </p>
                          <p className="mt-1 line-clamp-1 text-sm font-medium text-stone-500">
                            {product.description || "No description"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-stone-700">
                      {product.category}
                    </td>
                    <td className="px-4 py-4 text-sm font-black text-stone-900">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={[
                          "inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide",
                          product.isAvailable
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700",
                        ].join(" ")}
                      >
                        {product.isAvailable ? "Available" : "Hidden"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(product)}
                          title="Edit product"
                          className="flex size-9 items-center justify-center rounded-lg border border-orange-100 bg-white text-stone-700 transition hover:border-orange-200 hover:text-orange-800"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(product)}
                          disabled={deletingId === product._id}
                          title="Delete product"
                          className="flex size-9 items-center justify-center rounded-lg border border-red-100 bg-white text-red-600 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === product._id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showForm ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/50 px-4 py-6">
          <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-orange-100 px-5 py-4">
              <h2 className="text-xl font-extrabold text-stone-900">
                {editingProduct ? "Edit Product" : "Add Product"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                title="Close"
                className="flex size-9 items-center justify-center rounded-lg text-stone-500 transition hover:bg-orange-50 hover:text-stone-900"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 px-5 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="product-name"
                    className="text-sm font-bold text-stone-800"
                  >
                    Name
                  </label>
                  <input
                    id="product-name"
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-stone-200 px-3 text-sm font-semibold outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="product-price"
                    className="text-sm font-bold text-stone-800"
                  >
                    Price
                  </label>
                  <input
                    id="product-price"
                    type="number"
                    min="1"
                    value={form.price}
                    onChange={(event) => updateField("price", event.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-stone-200 px-3 text-sm font-semibold outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="product-category"
                  className="text-sm font-bold text-stone-800"
                >
                  Category
                </label>
                <input
                  id="product-category"
                  list="product-categories"
                  value={form.category}
                  onChange={(event) => updateField("category", event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-stone-200 px-3 text-sm font-semibold outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  required
                />
                <datalist id="product-categories">
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>

              <div>
                <label
                  htmlFor="product-description"
                  className="text-sm font-bold text-stone-800"
                >
                  Description
                </label>
                <textarea
                  id="product-description"
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  className="mt-2 w-full resize-none rounded-lg border border-stone-200 px-3 py-3 text-sm font-semibold outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                <div>
                  <label
                    htmlFor="product-image"
                    className="text-sm font-bold text-stone-800"
                  >
                    Image URL
                  </label>
                  <input
                    id="product-image"
                    value={form.image}
                    onChange={(event) => updateField("image", event.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-stone-200 px-3 text-sm font-semibold outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>

                <label className="mt-7 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-orange-100 bg-orange-50 px-3 text-sm font-extrabold text-orange-800 transition hover:bg-orange-100">
                  <ImagePlus size={17} />
                  Upload
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleImageChange}
                    className="sr-only"
                  />
                </label>
              </div>

              {imageFile ? (
                <p className="text-sm font-bold text-stone-500">
                  Selected: {imageFile.name}
                </p>
              ) : null}

              <label className="flex items-center justify-between gap-4 rounded-lg border border-stone-200 px-4 py-3">
                <span>
                  <span className="block text-sm font-bold text-stone-900">
                    Available
                  </span>
                  <span className="block text-xs font-semibold text-stone-500">
                    Visible on customer menu
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(event) =>
                    updateField("isAvailable", event.target.checked)
                  }
                  className="size-5 accent-orange-700"
                />
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-orange-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  className="h-11 rounded-lg border border-stone-200 px-5 text-sm font-extrabold text-stone-700 transition hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-orange-700 px-5 text-sm font-extrabold text-white transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? <Loader2 size={17} className="animate-spin" /> : null}
                  {editingProduct ? "Save Changes" : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ProductsPage;
