import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/RoleGate";
import { StaffShell } from "@/components/layout/StaffShell";
import { StatusBadge } from "@/components/StatusBadge";
import { RowsSkeleton } from "@/components/Skeletons";
import { EmptyState } from "@/components/EmptyState";
import { useAllOrders } from "@/hooks/useOrders";
import { formatDate, formatPrice } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/delivery")({
  head: () => ({
    meta: [
      { title: "Delivery board — FreshDrop admin" },
      { name: "description", content: "Track every FreshDrop delivery currently on the road." },
      { property: "og:title", content: "Delivery board — FreshDrop admin" },
      { property: "og:description", content: "Monitor active deliveries." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <AdminDelivery />
    </RoleGate>
  ),
});

function AdminDelivery() {
  const { data: orders, isLoading } = useAllOrders();
  const deliveries = (orders ?? []).filter(
    (order) => order.order_type === "delivery" && ["ready", "out_for_delivery"].includes(order.status),
  );

  return (
    <StaffShell variant="admin" title="Delivery board" subtitle={`${deliveries.length} deliveries in progress`}>
      {isLoading ? (
        <RowsSkeleton rows={4} />
      ) : deliveries.length === 0 ? (
        <EmptyState
          icon="delivery_dining"
          title="No deliveries on the road"
          description="Orders appear here once they are ready to dispatch."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {deliveries.map((order) => (
            <article key={order.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <h2 className="truncate font-bold">{order.order_number}</h2>
                <StatusBadge status={order.status} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{order.delivery_address}</p>
              <p className="mt-2 text-sm">
                {order.contact_name} · {order.contact_phone}
              </p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{formatDate(order.created_at)}</span>
                <span className="font-semibold text-primary">{formatPrice(order.total)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </StaffShell>
  );
}
