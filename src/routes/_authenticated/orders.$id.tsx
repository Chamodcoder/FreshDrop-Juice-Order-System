import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { EmptyState } from "@/components/EmptyState";
import { OrderTimeline } from "@/components/OrderTimeline";
import { StatusBadge } from "@/components/StatusBadge";
import { RowsSkeleton } from "@/components/Skeletons";
import { useOrder } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatPrice } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/order-status";
import type { OrderStatusHistory } from "@/types/db";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  head: () => ({
    meta: [
      { title: "Order tracking — FreshDrop" },
      { name: "description", content: "Follow your FreshDrop order from preparation to delivery." },
      { property: "og:title", content: "Order tracking — FreshDrop" },
      { property: "og:description", content: "Live status updates for your juice order." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderTrackingPage,
});

function OrderTrackingPage() {
  const { id } = Route.useParams();
  const { data: order, isLoading } = useOrder(id);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: history } = useQuery({
    queryKey: ["order-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_status_history")
        .select("*")
        .eq("order_id", id)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as OrderStatusHistory[];
    },
  });

  // Live status updates
  useEffect(() => {
    const channel = supabase
      .channel(`order-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        (payload) => {
          const next = payload.new as { status: keyof typeof STATUS_LABEL };
          void queryClient.invalidateQueries({ queryKey: ["order", id] });
          void queryClient.invalidateQueries({ queryKey: ["order-history", id] });
          void queryClient.invalidateQueries({ queryKey: ["orders"] });
          if (next?.status === "preparing") toast.success("Your order is now being prepared.");
          else if (next?.status) toast.success(`Order update: ${STATUS_LABEL[next.status]}`);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  if (isLoading) {
    return (
      <CustomerShell>
        <RowsSkeleton rows={6} />
      </CustomerShell>
    );
  }

  if (!order) {
    return (
      <CustomerShell>
        <EmptyState
          icon="receipt_long"
          title="Order not found"
          description="This order may belong to another account."
          action={
            <Link
              to="/orders"
              className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              Back to my orders
            </Link>
          }
        />
      </CustomerShell>
    );
  }

  return (
    <CustomerShell>
      <button
        type="button"
        onClick={() => navigate({ to: "/orders" })}
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <Icon name="arrow_back" size={18} /> My orders
      </button>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold sm:text-3xl">Order {order.order_number}</h1>
          <p className="text-sm text-muted-foreground">Placed {formatDate(order.created_at)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
          <h2 className="mb-5 text-lg font-bold">Order status</h2>
          <OrderTimeline order={order} history={history ?? []} />
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-lg font-bold">Items</h2>
            <ul className="mt-3 divide-y divide-border">
              {(order.order_items ?? []).map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <img
                    src={item.image_url ?? "/images/mixed-fruit.jpg"}
                    alt={item.product_name}
                    loading="lazy"
                    width={120}
                    height={120}
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.size} · {item.flavor} · ×{item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{formatPrice(item.subtotal)}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <Line label="Subtotal" value={formatPrice(order.subtotal)} />
              <Line label="Delivery fee" value={order.delivery_fee ? formatPrice(order.delivery_fee) : "Free"} />
              {Number(order.discount) > 0 && (
                <Line label="Discount" value={`− ${formatPrice(order.discount)}`} />
              )}
              <div className="flex items-center justify-between border-t border-border pt-2">
                <dt className="font-semibold">Total</dt>
                <dd className="text-lg font-bold text-primary">{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-lg font-bold">
              {order.order_type === "delivery" ? "Delivery details" : "Pickup details"}
            </h2>
            <ul className="mt-3 space-y-3 text-sm">
              {order.order_type === "delivery" ? (
                <>
                  <Detail icon="location_on" label="Address" value={order.delivery_address ?? "—"} />
                  <Detail icon="schedule" label="Estimated time" value="30–40 minutes" />
                  <Detail
                    icon="delivery_dining"
                    label="Delivery person"
                    value={order.delivery_person_id ? "Assigned — on the way" : "Not assigned yet"}
                  />
                </>
              ) : (
                <>
                  <Detail
                    icon="storefront"
                    label="Pickup point"
                    value="FreshDrop Juice Bar, main canteen walkway"
                  />
                  <Detail icon="schedule" label="Pickup time" value={order.pickup_time ?? "As soon as ready"} />
                </>
              )}
              <Detail icon="person" label="Contact" value={order.contact_name ?? "—"} />
              <Detail icon="call" label="Phone" value={order.contact_phone ?? "—"} />
              <Detail
                icon="payments"
                label="Payment"
                value={order.order_type === "delivery" ? "Cash on delivery" : "Cash at pickup"}
              />
              {order.notes && <Detail icon="sticky_note_2" label="Notes" value={order.notes} />}
            </ul>
          </section>
        </div>
      </div>
    </CustomerShell>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Detail({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <li className="flex gap-3">
      <Icon name={icon} size={18} className="mt-0.5 text-primary" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </li>
  );
}
