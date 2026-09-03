import { useEffect, useMemo, useState } from "react";
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
import { STATUS_LABEL } from "@/lib/order-status";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/db";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({
    meta: [
      { title: "Order management — FreshDrop admin" },
      { name: "description", content: "Confirm, prepare and dispatch every FreshDrop order." },
      { property: "og:title", content: "Order management — FreshDrop admin" },
      { property: "og:description", content: "Manage the full order pipeline." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <AdminOrders />
    </RoleGate>
  ),
});

const FILTERS: ("all" | OrderStatus)[] = [
  "all",
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
};

const PAGE_SIZE = 10;

function AdminOrders() {
  const { data: orders, isLoading } = useAllOrders();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [page, setPage] = useState(0);
  const [cancelId, setCancelId] = useState<string | null>(null);

  // Subscribe to real-time database changes on the 'orders' table
  useEffect(() => {
    const channel = supabase
      .channel("admin-orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["orders"] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const filtered = useMemo(
    () => (orders ?? []).filter((order) => filter === "all" || order.status === filter),
    [orders, filter],
  );
  const paged = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const updateStatus = async (id: string, status: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) {
      toast.error(friendlyError(error, "Could not update that order."));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["orders"] });
    toast.success(`Order marked ${STATUS_LABEL[status].toLowerCase()}`);
  };

  return (
    <StaffShell variant="admin" title="Orders" subtitle={`${filtered.length} orders in this view`}>
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setFilter(value);
              setPage(0);
            }}
            aria-pressed={filter === value}
            className={cn(
              "min-h-11 shrink-0 rounded-xl border px-4 text-sm font-medium",
              filter === value
                ? "border-primary bg-primary-light text-primary-dark"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {value === "all" ? "All" : STATUS_LABEL[value]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <RowsSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="receipt_long" title="No orders in this view" description="Try another filter." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3">Order</th>
                  <th scope="col" className="px-4 py-3">Customer</th>
                  <th scope="col" className="px-4 py-3">Items</th>
                  <th scope="col" className="px-4 py-3">Type</th>
                  <th scope="col" className="px-4 py-3">Amount</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Date</th>
                  <th scope="col" className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.map((order) => {
                  const next = NEXT_STATUS[order.status];
                  const canDispatch = order.status === "ready" && order.order_type === "delivery";
                  const canComplete =
                    order.status === "out_for_delivery" || (order.status === "ready" && order.order_type === "pickup");
                  return (
                    <tr key={order.id}>
                      <td className="px-4 py-3 font-semibold">{order.order_number}</td>
                      <td className="px-4 py-3">{order.contact_name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {(order.order_items ?? []).reduce((sum, i) => sum + i.quantity, 0)} items
                      </td>
                      <td className="px-4 py-3 capitalize">{order.order_type}</td>
                      <td className="px-4 py-3 font-semibold">{formatPrice(order.total)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(order.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {next && (
                            <button
                              type="button"
                              onClick={() => updateStatus(order.id, next)}
                              className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground"
                            >
                              <Icon name="arrow_forward" size={14} /> {STATUS_LABEL[next]}
                            </button>
                          )}
                          {canDispatch && (
                            <button
                              type="button"
                              onClick={() => updateStatus(order.id, "out_for_delivery")}
                              className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground"
                            >
                              <Icon name="delivery_dining" size={14} /> Dispatch
                            </button>
                          )}
                          {canComplete && (
                            <button
                              type="button"
                              onClick={() =>
                                updateStatus(order.id, order.order_type === "pickup" ? "picked_up" : "delivered")
                              }
                              className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-success px-3 text-xs font-semibold text-success-foreground"
                            >
                              <Icon name="check_circle" size={14} /> Complete
                            </button>
                          )}
                          {order.status !== "cancelled" && order.status !== "delivered" && order.status !== "picked_up" && (
                            <button
                              type="button"
                              onClick={() => setCancelId(order.id)}
                              className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-destructive/40 px-3 text-xs font-semibold text-destructive"
                            >
                              <Icon name="cancel" size={14} /> Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page + 1} of {pages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-border px-4 text-sm font-semibold disabled:opacity-40"
              >
                <Icon name="arrow_back" size={16} /> Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                disabled={page >= pages - 1}
                className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-border px-4 text-sm font-semibold disabled:opacity-40"
              >
                Next <Icon name="arrow_forward" size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      <AlertDialog open={Boolean(cancelId)} onOpenChange={(open) => !open && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
            <AlertDialogDescription>
              The customer will see the order as cancelled. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep order</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (cancelId) await updateStatus(cancelId, "cancelled");
                setCancelId(null);
              }}
            >
              Cancel order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StaffShell>
  );
}
