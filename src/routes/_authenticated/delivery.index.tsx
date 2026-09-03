import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { RoleGate } from "@/components/RoleGate";
import { StaffShell } from "@/components/layout/StaffShell";
import { StatusBadge } from "@/components/StatusBadge";
import { RowsSkeleton } from "@/components/Skeletons";
import { EmptyState } from "@/components/EmptyState";
import { useAllOrders } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatPrice, friendlyError } from "@/lib/format";
import type { OrderStatus } from "@/types/db";
import { useAuth } from "@/contexts/AuthContext";
import { DeliveryLocationMap } from "@/components/DeliveryLocationMap";

export const Route = createFileRoute("/_authenticated/delivery/")({
  head: () => ({
    meta: [
      { title: "Delivery dashboard — FreshDrop" },
      { name: "description", content: "Pick up assigned juice orders and mark them delivered." },
      { property: "og:title", content: "Delivery dashboard — FreshDrop" },
      { property: "og:description", content: "Your delivery run for today." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RoleGate allow="delivery">
      <DeliveryDashboard />
    </RoleGate>
  ),
});

function DeliveryDashboard() {
  const { data: orders, isLoading } = useAllOrders();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [expandedMaps, setExpandedMaps] = useState<Record<string, boolean>>({});

  const toggleMap = (orderId: string) => {
    setExpandedMaps((p) => ({ ...p, [orderId]: !p[orderId] }));
  };

  const list = (orders ?? []).filter(
    (order) => order.order_type === "delivery" && ["ready", "out_for_delivery", "delivered"].includes(order.status),
  );
  const active = list.filter((order) => order.status !== "delivered");
  const done = list.filter((order) => order.status === "delivered");

  const update = async (id: string, status: OrderStatus) => {
    const updateData: Record<string, any> = { status };
    if (status === "out_for_delivery" && user) {
      updateData.delivery_person_id = user.id;
    }
    const { error } = await supabase.from("orders").update(updateData).eq("id", id);
    if (error) {
      toast.error(friendlyError(error, "Could not update that delivery."));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["orders"] });
    toast.success(status === "delivered" ? "Delivery completed" : "Delivery started");
  };

  return (
    <StaffShell
      variant="delivery"
      title="Today's deliveries"
      subtitle={`${active.length} active · ${done.length} completed`}
    >
      {isLoading ? (
        <RowsSkeleton rows={4} />
      ) : active.length === 0 && done.length === 0 ? (
        <EmptyState
          icon="delivery_dining"
          title="Nothing to deliver yet"
          description="New deliveries show up here as soon as the juice bar marks them ready."
        />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-bold">Active</h2>
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground">All caught up.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {active.map((order) => (
                  <article key={order.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                      <h3 className="truncate font-bold">{order.order_number}</h3>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="mt-2 flex gap-2 text-sm text-muted-foreground">
                      <Icon name="location_on" size={18} className="shrink-0 text-primary" />
                      {order.delivery_address}
                    </p>
                    <p className="mt-2 flex gap-2 text-sm">
                      <Icon name="call" size={18} className="shrink-0 text-primary" />
                      {order.contact_name} · {order.contact_phone}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-primary">
                      {formatPrice(order.total)} · cash on delivery
                    </p>

                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => toggleMap(order.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
                      >
                        <Icon name={expandedMaps[order.id] ? "close" : "map"} size={14} />
                        {expandedMaps[order.id] ? "Hide destination map" : "View destination on map"}
                      </button>
                    </div>

                    {expandedMaps[order.id] && order.delivery_address && (
                      <div className="mt-3">
                        <DeliveryLocationMap address={order.delivery_address} />
                      </div>
                    )}

                    <div className="mt-4 flex gap-2">
                      {order.status === "ready" ? (
                        <button
                          type="button"
                          onClick={() => update(order.id, "out_for_delivery")}
                          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
                        >
                          <Icon name="two_wheeler" size={18} /> Start delivery
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => update(order.id, "delivered")}
                          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-success text-sm font-semibold text-success-foreground"
                        >
                          <Icon name="check_circle" size={18} /> Mark delivered
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold">Completed</h2>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card px-5 shadow-card">
              {done.length === 0 ? (
                <li className="py-4 text-sm text-muted-foreground">No completed deliveries yet.</li>
              ) : (
                done.map((order) => (
                  <li key={order.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{order.order_number}</p>
                      <p className="truncate text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                    </div>
                    <span className="text-sm font-semibold">{formatPrice(order.total)}</span>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      )}
    </StaffShell>
  );
}
