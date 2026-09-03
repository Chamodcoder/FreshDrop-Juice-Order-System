import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useCatalog";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/types/db";
import { cn } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { user } = useAuth();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const isFavorite = favoriteIds.includes(product.id);

  const quickAdd = () => {
    addItem({
      productId: product.id,
      name: product.name,
      imageUrl: product.image_url,
      unitPrice: Number(product.base_price),
      quantity: 1,
      size: "Medium",
      flavor: "Original",
      addons: [],
    });
    toast.success("Added to cart", { description: `${product.name} · Medium` });
  };

  const onFavorite = async () => {
    if (!user) {
      toast.error("Sign in to save favorites");
      return;
    }
    try {
      const added = await toggleFavorite(product.id);
      toast.success(added ? "Added to favorites" : "Removed from favorites");
    } catch {
      toast.error("Could not update favorites");
    }
  };

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="relative block aspect-4/3 overflow-hidden bg-surface"
      >
        <img
          src={product.image_url ?? "/images/mixed-fruit.jpg"}
          alt={product.name}
          loading="lazy"
          width={800}
          height={600}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {!product.is_available && (
          <span className="absolute inset-x-0 bottom-0 bg-secondary/85 py-1.5 text-center text-xs font-semibold text-secondary-foreground z-10">
            Currently unavailable
          </span>
        )}

        {/* Rating Floating Badge overlay */}
        {product.rating && (
          <span className="absolute left-2.5 top-2.5 z-10 flex items-center gap-0.5 rounded-lg bg-background/95 px-1.5 py-0.5 text-[10px] font-bold text-foreground shadow-panel backdrop-blur-sm">
            <Icon name="star" filled size={11} className="text-warning" />
            {Number(product.rating).toFixed(1)}
          </span>
        )}
      </Link>

      <button
        type="button"
        onClick={onFavorite}
        aria-label={isFavorite ? `Remove ${product.name} from favorites` : `Save ${product.name} to favorites`}
        aria-pressed={isFavorite}
        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/90 shadow-panel backdrop-blur transition-colors hover:bg-background z-10"
      >
        <Icon
          name="favorite"
          filled={isFavorite}
          size={16}
          className={cn(isFavorite ? "text-primary" : "text-muted-foreground")}
        />
      </button>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm sm:text-base font-bold leading-snug">
            <Link to="/product/$id" params={{ id: product.id }} className="hover:text-primary">
              {product.name}
            </Link>
          </h3>
          <p className="mt-0.5 text-[10px] sm:text-xs text-muted-foreground">{product.categories?.name ?? "Juice"}</p>
        </div>
        
        <p className="mt-1.5 hidden sm:line-clamp-2 text-xs sm:text-sm text-muted-foreground">
          {product.description}
        </p>

        <div className="mt-3 sm:mt-4 flex items-center justify-between gap-2">
          <span className="text-base sm:text-lg font-extrabold text-primary shrink-0">
            {formatPrice(product.base_price)}
          </span>
          <button
            type="button"
            onClick={quickAdd}
            disabled={!product.is_available}
            aria-label={`Add ${product.name} to cart`}
            className="grid h-9 w-9 sm:h-11 sm:w-11 place-items-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40 shrink-0"
          >
            <Icon name="add" size={18} className="sm:hidden" />
            <Icon name="add" size={20} className="hidden sm:block" />
          </button>
        </div>
      </div>
    </article>
  );
}
