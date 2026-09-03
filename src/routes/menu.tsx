import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeleton } from "@/components/Skeletons";
import { EmptyState } from "@/components/EmptyState";
import { useCategories, useProducts } from "@/hooks/useCatalog";
import { cn } from "@/lib/utils";

type MenuSearch = { q?: string | undefined; category?: string | undefined };

export const Route = createFileRoute("/menu")({
  validateSearch: (search: Record<string, unknown>): MenuSearch => ({
    q: typeof search["q"] === "string" && search["q"] ? (search["q"] as string) : undefined,
    category:
      typeof search["category"] === "string" && search["category"]
        ? (search["category"] as string)
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Menu — FreshDrop juices, smoothies & milkshakes" },
      {
        name: "description",
        content:
          "Explore the full FreshDrop menu: fresh juices, tropical fruit juices, smoothies, milkshakes and weekly specials with campus pricing.",
      },
      { property: "og:title", content: "Menu — FreshDrop" },
      { property: "og:description", content: "Explore fresh juices, smoothies and milkshakes." },
    ],
  }),
  component: MenuPage,
});

const SORTS = [
  { value: "popular", label: "Popular" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
] as const;

function MenuPage() {
  const { q, category } = Route.useSearch();
  const navigate = useNavigate({ from: "/menu" });
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const [sort, setSort] = useState<(typeof SORTS)[number]["value"]>("popular");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState(0);
  const [minRating, setMinRating] = useState(0);

  const setSearch = (next: MenuSearch) =>
    navigate({ search: (prev: MenuSearch) => ({ ...prev, ...next }), replace: true });

  const filtered = useMemo(() => {
    let list = [...(products ?? [])];
    if (category) list = list.filter((p) => p.categories?.slug === category);
    if (q) {
      const needle = q.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          (p.description ?? "").toLowerCase().includes(needle),
      );
    }
    if (availableOnly) list = list.filter((p) => p.is_available);
    if (maxPrice > 0) list = list.filter((p) => Number(p.base_price) <= maxPrice);
    if (minRating > 0) list = list.filter((p) => Number(p.rating) >= minRating);

    switch (sort) {
      case "price-asc":
        list.sort((a, b) => Number(a.base_price) - Number(b.base_price));
        break;
      case "price-desc":
        list.sort((a, b) => Number(b.base_price) - Number(a.base_price));
        break;
      case "newest":
        list.sort((a, b) => b.created_at.localeCompare(a.created_at));
        break;
      default:
        list.sort((a, b) => Number(b.rating) - Number(a.rating));
    }
    return list;
  }, [products, category, q, sort, availableOnly, maxPrice, minRating]);

  return (
    <CustomerShell search={q ?? ""} onSearchChange={(value) => setSearch({ q: value || undefined })}>
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Explore our menu</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "drink" : "drinks"} available today
        </p>
      </header>

      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
        <FilterChip active={!category} onClick={() => setSearch({ category: undefined })}>
          <Icon name="grid_view" size={16} /> All
        </FilterChip>
        {(categories ?? []).map((c) => (
          <FilterChip key={c.id} active={category === c.slug} onClick={() => setSearch({ category: c.slug })}>
            <Icon name={c.icon ?? "local_drink"} size={16} /> {c.name}
          </FilterChip>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card">
        <label className="flex items-center gap-2 text-sm">
          <Icon name="sort" size={18} className="text-muted-foreground" />
          <span className="sr-only sm:not-sr-only">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <Icon name="payments" size={18} className="text-muted-foreground" />
          <span className="sr-only sm:not-sr-only">Max price</span>
          <select
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value={0}>Any price</option>
            <option value={280}>Under Rs. 280</option>
            <option value={330}>Under Rs. 330</option>
            <option value={400}>Under Rs. 400</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <Icon name="star" size={18} className="text-muted-foreground" />
          <span className="sr-only sm:not-sr-only">Rating</span>
          <select
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value={0}>Any rating</option>
            <option value={4.5}>4.5 and up</option>
            <option value={4.7}>4.7 and up</option>
          </select>
        </label>

        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          Available only
        </label>
      </div>

      {isLoading ? (
        <ProductGridSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="search_off"
          title="No drinks match your filters"
          description="Try a different category, or clear your search to see the full menu."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </CustomerShell>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary-light text-primary-dark"
          : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
