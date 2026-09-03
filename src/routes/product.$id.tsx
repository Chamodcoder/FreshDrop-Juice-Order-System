import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { QuantitySelector } from "@/components/QuantitySelector";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useFavorites, useProduct } from "@/hooks/useCatalog";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

const ADDONS = [
  { name: "Extra fruit", price: 60 },
  { name: "Ice", price: 0 },
  { name: "Milk", price: 40 },
  { name: "Honey", price: 30 },
];

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "Juice details — FreshDrop" },
      {
        name: "description",
        content: "Pick your size, flavour and add-ons, then add this fresh juice to your cart.",
      },
      { property: "og:title", content: "Juice details — FreshDrop" },
      { property: "og:description", content: "Customise your juice and order it in seconds." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const { data: product, isLoading } = useProduct(id);
  const { addItem } = useCart();
  const { user } = useAuth();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const navigate = useNavigate();

  const [size, setSize] = useState("Medium");
  const [flavor, setFlavor] = useState("Original");
  const [addons, setAddons] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  const sizes = product?.product_sizes?.slice().sort((a, b) => a.sort_order - b.sort_order) ?? [];
  const flavors = product?.product_flavors?.slice().sort((a, b) => a.sort_order - b.sort_order) ?? [];

  const unitPrice = useMemo(() => {
    if (!product) return 0;
    const sizeMod = Number(sizes.find((s) => s.name === size)?.price_modifier ?? 0);
    const flavorMod = Number(flavors.find((f) => f.name === flavor)?.price_modifier ?? 0);
    const addonTotal = addons.reduce(
      (sum, name) => sum + (ADDONS.find((a) => a.name === name)?.price ?? 0),
      0,
    );
    return Number(product.base_price) + sizeMod + flavorMod + addonTotal;
  }, [product, sizes, flavors, size, flavor, addons]);

  if (isLoading) {
    return (
      <CustomerShell>
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-4/3 w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </CustomerShell>
    );
  }

  if (!product) {
    return (
      <CustomerShell>
        <EmptyState
          icon="local_drink"
          title="This juice isn't on the menu"
          description="It may have been removed. Browse the full menu to find something fresh."
          action={
            <Link
              to="/menu"
              className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              Back to menu
            </Link>
          }
        />
      </CustomerShell>
    );
  }

  const isFavorite = favoriteIds.includes(product.id);

  const addToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      imageUrl: product.image_url,
      unitPrice,
      quantity,
      size,
      flavor,
      addons,
    });
    toast.success("Added to cart", { description: `${product.name} · ${size} · ${flavor}` });
  };

  return (
    <CustomerShell>
      <button
        type="button"
        onClick={() => navigate({ to: "/menu" })}
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <Icon name="arrow_back" size={18} /> Back to menu
      </button>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <img
            src={product.image_url ?? "/images/mixed-fruit.jpg"}
            alt={product.name}
            width={800}
            height={600}
            className="aspect-4/3 w-full object-cover"
          />
        </div>

        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-primary">{product.categories?.name}</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{product.name}</h1>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (!user) {
                  toast.error("Sign in to save favorites");
                  return;
                }
                const added = await toggleFavorite(product.id);
                toast.success(added ? "Added to favorites" : "Removed from favorites");
              }}
              aria-label={isFavorite ? "Remove from favorites" : "Save to favorites"}
              aria-pressed={isFavorite}
              className="grid h-11 w-11 place-items-center rounded-xl border border-border hover:bg-muted"
            >
              <Icon
                name="favorite"
                filled={isFavorite}
                size={20}
                className={isFavorite ? "text-primary" : "text-muted-foreground"}
              />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Icon name="star" filled size={16} className="text-warning" />
              <strong className="font-semibold text-foreground">{Number(product.rating).toFixed(1)}</strong> rating
            </span>
            <span className="flex items-center gap-1">
              <Icon name="schedule" size={16} /> {product.preparation_time} min preparation
            </span>
            <span
              className={cn(
                "flex items-center gap-1",
                product.is_available ? "text-success" : "text-destructive",
              )}
            >
              <Icon name={product.is_available ? "check_circle" : "cancel"} size={16} />
              {product.is_available ? "Available now" : "Unavailable"}
            </span>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{product.description}</p>

          <fieldset className="mt-6">
            <legend className="text-sm font-semibold">Choose size</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {sizes.map((option) => (
                <OptionChip
                  key={option.id}
                  active={size === option.name}
                  onClick={() => setSize(option.name)}
                  label={option.name}
                  hint={
                    Number(option.price_modifier) === 0
                      ? undefined
                      : `${Number(option.price_modifier) > 0 ? "+" : "−"}${formatPrice(Math.abs(Number(option.price_modifier)))}`
                  }
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold">Choose flavour</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {flavors.map((option) => (
                <OptionChip
                  key={option.id}
                  active={flavor === option.name}
                  onClick={() => setFlavor(option.name)}
                  label={option.name}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold">Add-ons (optional)</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {ADDONS.map((addon) => (
                <OptionChip
                  key={addon.name}
                  active={addons.includes(addon.name)}
                  onClick={() =>
                    setAddons((prev) =>
                      prev.includes(addon.name)
                        ? prev.filter((a) => a !== addon.name)
                        : [...prev, addon.name],
                    )
                  }
                  label={addon.name}
                  hint={addon.price ? `+${formatPrice(addon.price)}` : "Free"}
                />
              ))}
            </div>
          </fieldset>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-card">
            <div>
              <p className="text-xs text-muted-foreground">Total price</p>
              <p className="text-2xl font-bold text-primary">{formatPrice(unitPrice * quantity)}</p>
            </div>
            <QuantitySelector value={quantity} onChange={setQuantity} />
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={addToCart}
              disabled={!product.is_available}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-dark disabled:opacity-40"
            >
              <Icon name="shopping_cart" size={18} /> Add to cart
            </button>
            <button
              type="button"
              onClick={() => {
                addToCart();
                navigate({ to: "/checkout" });
              }}
              disabled={!product.is_available}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-primary px-6 text-sm font-semibold text-primary transition-colors hover:bg-primary-light disabled:opacity-40"
            >
              Buy now <Icon name="arrow_forward" size={18} />
            </button>
          </div>
        </div>
      </div>
    </CustomerShell>
  );
}

function OptionChip({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint?: string | undefined;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary-light text-primary-dark"
          : "border-border bg-card text-foreground hover:border-primary/40",
      )}
    >
      {label}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </button>
  );
}
