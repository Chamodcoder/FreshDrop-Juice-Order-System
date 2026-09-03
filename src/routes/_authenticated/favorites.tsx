import { createFileRoute, Link } from "@tanstack/react-router";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { EmptyState } from "@/components/EmptyState";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeleton } from "@/components/Skeletons";
import { useFavorites, useProducts } from "@/hooks/useCatalog";

export const Route = createFileRoute("/_authenticated/favorites")({
  head: () => ({
    meta: [
      { title: "My favorites — FreshDrop" },
      { name: "description", content: "The juices you saved for later at the FreshDrop juice bar." },
      { property: "og:title", content: "My favorites — FreshDrop" },
      { property: "og:description", content: "Your saved juices, one tap from the cart." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { favoriteIds, isLoading: loadingFavorites } = useFavorites();
  const { data: products, isLoading } = useProducts();

  const favorites = (products ?? []).filter((product) => favoriteIds.includes(product.id));

  return (
    <CustomerShell>
      <h1 className="text-2xl font-bold sm:text-3xl">My favorites</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {favorites.length} saved {favorites.length === 1 ? "drink" : "drinks"}
      </p>

      <div className="mt-6">
        {isLoading || loadingFavorites ? (
          <ProductGridSkeleton count={4} />
        ) : favorites.length === 0 ? (
          <EmptyState
            icon="favorite"
            title="Save your favorite juices for later."
            description="Tap the heart on any drink and it will show up here."
            action={
              <Link
                to="/menu"
                className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
              >
                Browse the menu
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {favorites.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
