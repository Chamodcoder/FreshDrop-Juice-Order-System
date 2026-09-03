import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { RoleGate } from "@/components/RoleGate";
import { StaffShell } from "@/components/layout/StaffShell";
import { RowsSkeleton } from "@/components/Skeletons";
import { useProducts, useCategories } from "@/hooks/useCatalog";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, friendlyError } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => ({
    meta: [
      { title: "Products — FreshDrop admin" },
      { name: "description", content: "Manage juice availability, pricing and stock at FreshDrop." },
      { property: "og:title", content: "Products — FreshDrop admin" },
      { property: "og:description", content: "Control the live juice menu." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <AdminProducts />
    </RoleGate>
  ),
});

function AdminProducts() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const queryClient = useQueryClient();

  // Add Product Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [prepTime, setPrepTime] = useState("5");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!basePrice || parseFloat(basePrice) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("products").insert({
        name: name.trim(),
        base_price: parseFloat(basePrice),
        category_id: categoryId || null,
        preparation_time: parseInt(prepTime) || 5,
        description: description.trim() || null,
        image_url: imageUrl.trim() || "/images/mixed-fruit.jpg",
        is_available: true,
        rating: 5.0,
      });

      if (error) throw error;

      toast.success("Juice product created successfully!");
      // Reset form
      setName("");
      setBasePrice("");
      setCategoryId("");
      setPrepTime("5");
      setDescription("");
      setImageUrl("");
      setShowAddModal(false);
      
      // Invalidate cache
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err: any) {
      console.error(err);
      toast.error(friendlyError(err, "Failed to create product."));
    } finally {
      setSubmitting(false);
    }
  };

  const toggle = async (id: string, isAvailable: boolean) => {
    const { error } = await supabase.from("products").update({ is_available: !isAvailable }).eq("id", id);
    if (error) {
      toast.error(friendlyError(error, "Could not update that product."));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["products"] });
    toast.success(!isAvailable ? "Product is back on the menu" : "Product hidden from the menu");
  };

  return (
    <StaffShell
      variant="admin"
      title="Products"
      subtitle="Toggle what customers can order right now"
      actions={
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-dark transition-colors"
        >
          <Icon name="add" size={16} /> Add Product
        </button>
      }
    >
      {isLoading ? (
        <RowsSkeleton rows={6} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3">Juice</th>
                <th scope="col" className="px-4 py-3">Base price</th>
                <th scope="col" className="px-4 py-3">Rating</th>
                <th scope="col" className="px-4 py-3">Availability</th>
                <th scope="col" className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(products ?? []).map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <img
                        src={product.image_url ?? "/images/mixed-fruit.jpg"}
                        alt={product.name}
                        loading="lazy"
                        width={96}
                        height={96}
                        className="h-10 w-10 shrink-0 rounded-xl object-cover"
                      />
                      <span className="truncate font-semibold">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold">{formatPrice(product.base_price)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{Number(product.rating).toFixed(1)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        product.is_available
                          ? "rounded-full bg-success/12 px-3 py-1 text-xs font-semibold text-success"
                          : "rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground"
                      }
                    >
                      {product.is_available ? "Available" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggle(product.id, product.is_available)}
                      className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border px-3 text-xs font-semibold"
                    >
                      <Icon name={product.is_available ? "visibility_off" : "visibility"} size={14} />
                      {product.is_available ? "Hide" : "Show"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Product Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Icon name="add_circle" className="text-primary" size={20} />
                Add New Juice Product
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Avocado Delight"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Base Price (LKR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    placeholder="500"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Prep Time (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="5"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary transition-colors"
                >
                  <option value="">Uncategorized</option>
                  {(categories ?? []).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Tell customers what is inside this juice..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Image URL (optional)
                </label>
                <input
                  type="text"
                  placeholder="Default: /images/mixed-fruit.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-11 flex-1 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting && <Icon name="progress_activity" size={16} className="animate-spin" />}
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StaffShell>
  );
}
