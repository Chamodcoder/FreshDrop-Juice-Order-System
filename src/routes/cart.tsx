import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { EmptyState } from "@/components/EmptyState";
import { QuantitySelector } from "@/components/QuantitySelector";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/format";
import { DELIVERY_FEE } from "@/lib/order-status";
import { readCoupon, saveCoupon, validateCoupon, type AppliedCoupon } from "@/lib/coupon";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — FreshDrop" },
      { name: "description", content: "Review your juice selection, apply a promo code and checkout." },
      { property: "og:title", content: "Your cart — FreshDrop" },
      { property: "og:description", content: "Review your juices and checkout in seconds." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, subtotal, setQuantity, removeItem } = useCart();
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setCoupon(readCoupon());
  }, []);

  const discount = coupon ? Math.min(coupon.discount, subtotal) : 0;
  const total = Math.max(0, subtotal + (items.length ? DELIVERY_FEE : 0) - discount);

  const apply = async () => {
    setChecking(true);
    const result = await validateCoupon(code, subtotal);
    setChecking(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setCoupon(result.coupon);
    saveCoupon(result.coupon);
    setCode("");
    toast.success(`Promo code ${result.coupon.code} applied`);
  };

  if (items.length === 0) {
    return (
      <CustomerShell>
        <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Your cart</h1>
        <EmptyState
          icon="shopping_cart"
          title="Your cart is waiting for something fresh."
          description="Explore our juices and add your favorites."
          action={
            <Link
              to="/menu"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              <Icon name="local_drink" size={18} /> Browse the menu
            </Link>
          }
        />
      </CustomerShell>
    );
  }

  return (
    <CustomerShell>
      <h1 className="mb-4 sm:mb-6 text-xl sm:text-3xl font-bold">Your cart</h1>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <ul className="space-y-2 sm:space-y-3">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex gap-2.5 sm:gap-4 rounded-xl sm:rounded-2xl border border-border bg-card p-2 sm:p-4 shadow-card overflow-hidden"
            >
              <img
                src={item.imageUrl ?? "/images/mixed-fruit.jpg"}
                alt={item.name}
                loading="lazy"
                width={160}
                height={160}
                className="h-14 w-14 sm:h-24 sm:w-24 shrink-0 rounded-lg sm:rounded-xl object-cover"
              />
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div className="flex items-start justify-between gap-1.5 sm:gap-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-xs sm:text-base font-semibold">{item.name}</h2>
                    <p className="mt-0.5 text-[10px] sm:text-xs text-muted-foreground truncate">
                      {item.size} · {item.flavor}
                      {item.addons.length > 0 && ` · ${item.addons.join(", ")}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      removeItem(item.key);
                      toast.success("Removed from cart");
                    }}
                    aria-label={`Remove ${item.name} from cart`}
                    className="grid h-7 w-7 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-md sm:rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Icon name="delete" size={15} />
                  </button>
                </div>
                <div className="mt-1.5 sm:mt-auto flex items-center justify-between gap-1.5 sm:gap-3 pt-1.5 sm:pt-3">
                  <QuantitySelector
                    size="sm"
                    value={item.quantity}
                    onChange={(next) => setQuantity(item.key, next)}
                  />
                  <span className="text-xs sm:text-base font-bold text-primary shrink-0">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="lg:sticky lg:top-40 lg:self-start">
          <div className="rounded-xl sm:rounded-2xl border border-border bg-card p-3 sm:p-5 shadow-card">
            <h2 className="text-sm sm:text-lg font-bold">Order summary</h2>

            <div className="mt-2.5 sm:mt-4 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <Row label="Subtotal" value={formatPrice(subtotal)} />
              <Row label="Delivery fee" value={formatPrice(DELIVERY_FEE)} />
              {discount > 0 && (
                <Row label={`Discount (${coupon?.code})`} value={`− ${formatPrice(discount)}`} success />
              )}
              <div className="border-t border-border pt-2 sm:pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-semibold">Total</span>
                  <span className="text-base sm:text-xl font-bold text-primary">{formatPrice(total)}</span>
                </div>
                <p className="mt-1 text-[10px] sm:text-xs text-muted-foreground">
                  Choose self-pickup at checkout to remove the delivery fee.
                </p>
              </div>
            </div>

            <div className="mt-3 sm:mt-5">
              <label htmlFor="promo" className="text-xs sm:text-sm font-medium">
                Have a promo code?
              </label>
              <div className="mt-1.5 sm:mt-2 flex gap-1.5 sm:gap-2">
                <input
                  id="promo"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="FRESH10"
                  className="min-h-9 sm:min-h-11 min-w-0 flex-1 rounded-lg sm:rounded-xl border border-border bg-background px-2.5 sm:px-3 text-xs sm:text-sm outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={apply}
                  disabled={checking}
                  className="min-h-9 sm:min-h-11 rounded-lg sm:rounded-xl bg-secondary px-3 sm:px-4 text-xs sm:text-sm font-semibold text-secondary-foreground disabled:opacity-50"
                >
                  {checking ? "..." : "Apply"}
                </button>
              </div>
              {coupon && (
                <button
                  type="button"
                  onClick={() => {
                    setCoupon(null);
                    saveCoupon(null);
                    toast.success("Promo code removed");
                  }}
                  className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-medium text-muted-foreground underline"
                >
                  Remove {coupon.code}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate({ to: "/checkout" })}
              className="mt-3 sm:mt-5 inline-flex min-h-10 sm:min-h-12 w-full items-center justify-center gap-2 rounded-lg sm:rounded-xl bg-primary text-xs sm:text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-dark"
            >
              Proceed to checkout <Icon name="arrow_forward" size={18} />
            </button>
          </div>
        </aside>
      </div>
    </CustomerShell>
  );
}

function Row({ label, value, success }: { label: string; value: string; success?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={success ? "font-medium text-success" : "font-medium"}>{value}</span>
    </div>
  );
}
