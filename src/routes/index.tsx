import { createFileRoute, Link } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeleton } from "@/components/Skeletons";
import { useCategories, useProducts } from "@/hooks/useCatalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FreshDrop — Fresh juices delivered on campus" },
      {
        name: "description",
        content:
          "Order cold-pressed juices, smoothies and milkshakes from the FreshDrop juice bar. Delivery to your hostel or self-pickup in minutes.",
      },
      { property: "og:title", content: "FreshDrop — Fresh juices delivered on campus" },
      {
        property: "og:description",
        content: "Skip the peak-hour queue. Fresh juice ordering for Sabaragamuwa University.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();

  const popular = (products ?? []).slice(0, 4);
  const recommended = (products ?? []).slice(4, 8);

  return (
    <CustomerShell>
      <h1 className="sr-only">FreshDrop — fresh juice ordering and delivery</h1>

      <section className="relative overflow-hidden rounded-2xl bg-primary text-primary-foreground">
        <div className="grid items-center gap-6 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="max-w-md">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-foreground/15 px-3 py-1 text-xs font-semibold">
              <Icon name="schedule" size={14} /> Ready in 10 minutes
            </span>
            <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">Freshness delivered</h2>
            <p className="mt-3 text-sm leading-relaxed text-primary-foreground/90 sm:text-base">
              Fresh juices made for your day — pressed to order at the campus juice bar and brought
              straight to you.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/menu"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-background px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary-light"
              >
                <Icon name="local_drink" size={18} /> Order now
              </Link>
              <Link
                to="/orders"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary-foreground/40 px-5 text-sm font-semibold transition-colors hover:bg-primary-foreground/10"
              >
                <Icon name="receipt_long" size={18} /> Track an order
              </Link>
            </div>
          </div>
          <div className="relative -mb-6 hidden justify-self-end lg:block">
            <img
              src="/images/hero-juices.jpg"
              alt="A row of colourful freshly made fruit juices"
              width={1400}
              height={900}
              className="h-64 w-full max-w-lg rounded-2xl object-cover shadow-card-hover"
            />
          </div>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="categories-heading">
        <h2 id="categories-heading" className="text-xl font-bold">
          Browse by category
        </h2>
        <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto pb-1">
          <Link
            to="/menu"
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
          >
            <Icon name="grid_view" size={18} /> All
          </Link>
          {(categories ?? []).map((category) => (
            <Link
              key={category.id}
              to="/menu"
              search={{ category: category.slug }}
              className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
            >
              <Icon name={category.icon ?? "local_drink"} size={18} className="text-primary" />
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="popular-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="popular-heading" className="text-xl font-bold">
              Popular today
            </h2>
            <p className="text-sm text-muted-foreground">What the campus is drinking right now</p>
          </div>
          <Link to="/menu" className="shrink-0 text-sm font-semibold text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-4">
          {isLoading ? (
            <ProductGridSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {popular.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="recommended-heading">
        <h2 id="recommended-heading" className="text-xl font-bold">
          Recommended for you
        </h2>
        <div className="mt-4">
          {isLoading ? (
            <ProductGridSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {recommended.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          { icon: "bolt", title: "No more queues", text: "Order ahead and collect when it's ready." },
          { icon: "local_shipping", title: "Campus delivery", text: "Rs. 60 flat fee to hostels and faculties." },
          { icon: "storefront", title: "Self pickup", text: "Skip the fee and grab it from the counter." },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-light text-primary">
              <Icon name={item.icon} size={20} />
            </span>
            <h3 className="mt-3 font-semibold">{item.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </section>
    </CustomerShell>
  );
}
