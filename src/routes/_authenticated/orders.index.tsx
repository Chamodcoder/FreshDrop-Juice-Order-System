import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { RowsSkeleton } from "@/components/Skeletons";
import { useMyOrders } from "@/hooks/useOrders";
import { useCart } from "@/contexts/CartContext";
import { formatDate, formatPrice } from "@/lib/format";
import { ACTIVE_STATUSES } from "@/lib/order-status";
import { cn } from "@/lib/utils";
import type { Order } from "@/types/db";

export const Route = createFileRoute("/_authenticated/orders/")({
  head: () => ({
    meta: [
      { title: "My orders — FreshDrop" },
      { name: "description", content: "See your active, completed and cancelled FreshDrop orders." },
      { property: "og:title", content: "My orders — FreshDrop" },
      { property: "og:description", content: "Track and reorder your favourite juices." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

const TABS = ["Active", "Completed", "Cancelled"] as const;

function OrdersPage() {
  const { data: orders, isLoading } = useMyOrders();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Active");
  const { addItem } = useCart();

  const filtered = (orders ?? []).filter((order) => {
    if (tab === "Active") return ACTIVE_STATUSES.includes(order.status);
    if (tab === "Completed") return order.status === "delivered" || order.status === "picked_up";
    return order.status === "cancelled";
  });

  const reorder = (order: Order) => {
    for (const item of order.order_items ?? []) {
      addItem({
        productId: item.product_id ?? "",
        name: item.product_name,
        imageUrl: item.image_url,
        unitPrice: Number(item.unit_price),
        quantity: item.quantity,
        size: item.size ?? "Medium",
        flavor: item.flavor ?? "Original",
        addons: item.customization ? item.customization.split(", ") : [],
      });
    }
    toast.success("Items added to your cart");
  };

  return (
    <CustomerShell>
      <h1 className="text-2xl font-bold sm:text-3xl">My orders</h1>

      <div className="mt-5 flex gap-1 rounded-xl bg-muted p-1 sm:inline-flex">
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            aria-pressed={tab === value}
            className={cn(
              "min-h-11 flex-1 rounded-lg px-5 text-sm font-semibold transition-colors sm:flex-none",
              tab === value ? "bg-background text-foreground shadow-panel" : "text-muted-foreground",
            )}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <RowsSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="receipt_long"
            title="No orders yet."
            description="Your fresh journey starts here."
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
          <ul className="space-y-3">
            {filtered.map((order) => (
              <li key={order.id} className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                  {(order.order_items ?? [])
                    .map((item) => `${item.quantity}× ${item.product_name}`)
                    .join(", ") || "No items"}
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-lg font-bold text-primary">{formatPrice(order.total)}</span>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to="/orders/$id"
                      params={{ id: order.id }}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold"
                    >
                      <Icon name="visibility" size={18} /> View details
                    </Link>
                    <button
                      type="button"
                      onClick={() => reorder(order)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-dark"
                    >
                      <Icon name="refresh" size={18} /> Reorder
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </CustomerShell>
  );
}
