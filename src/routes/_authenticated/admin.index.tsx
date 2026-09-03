import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Icon } from "@/components/Icon";
import { RoleGate } from "@/components/RoleGate";
import { StaffShell } from "@/components/layout/StaffShell";
import { StatCardsSkeleton } from "@/components/Skeletons";
import { StatusBadge } from "@/components/StatusBadge";
import { useAllOrders } from "@/hooks/useOrders";
import { formatDate, formatPrice } from "@/lib/format";
import { ACTIVE_STATUSES } from "@/lib/order-status";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — FreshDrop" },
      { name: "description", content: "Orders, revenue and product performance for the FreshDrop juice bar." },
      { property: "og:title", content: "Admin dashboard — FreshDrop" },
      { property: "og:description", content: "Operational overview for the juice bar team." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <AdminDashboard />
    </RoleGate>
  ),
});

function AdminDashboard() {
  const { data: orders, isLoading } = useAllOrders();
  const list = orders ?? [];
  const queryClient = useQueryClient();

  // Listen for real-time database changes to update sales, revenue, and recent orders stats
  useEffect(() => {
    const channel = supabase
      .channel("admin-dashboard-realtime")
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

  const today = new Date().toDateString();
  const todays = list.filter((o) => new Date(o.created_at).toDateString() === today);
  const pending = list.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const completed = list.filter((o) => o.status === "delivered" || o.status === "picked_up");
  const revenue = todays
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.total), 0);

  const byDay = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toDateString();
    const dayOrders = list.filter((o) => new Date(o.created_at).toDateString() === key);
    return {
      day: date.toLocaleDateString("en-GB", { weekday: "short" }),
      orders: dayOrders.length,
      revenue: dayOrders.reduce((sum, o) => sum + Number(o.total), 0),
    };
  });

  const productCounts = new Map<string, number>();
  for (const order of list) {
    for (const item of order.order_items ?? []) {
      productCounts.set(item.product_name, (productCounts.get(item.product_name) ?? 0) + item.quantity);
    }
  }
  const popular = [...productCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <StaffShell variant="admin" title={`${greeting}, Admin`} subtitle="Here's how FreshDrop is doing today">
      {isLoading ? (
        <StatCardsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon="receipt_long" label="Today's orders" value={String(todays.length)} />
          <StatCard icon="pending" label="Pending orders" value={String(pending.length)} tone="warning" />
          <StatCard icon="check_circle" label="Completed orders" value={String(completed.length)} tone="success" />
          <StatCard icon="payments" label="Today's revenue" value={formatPrice(revenue)} />
        </div>
      )}

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Panel title="Orders overview" subtitle="Last 7 days">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, borderColor: "var(--border)" }} />
              <Bar dataKey="orders" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Revenue overview" subtitle="Last 7 days">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 12, borderColor: "var(--border)" }} />
              <Bar dataKey="revenue" fill="var(--warning)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Popular products" subtitle="Units sold">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={popular} layout="vertical" margin={{ left: 24 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={130} stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 12, borderColor: "var(--border)" }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {popular.map((entry) => (
                  <Cell key={entry.name} fill="var(--primary)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Latest orders" subtitle="Most recent activity">
          <ul className="divide-y divide-border">
            {list.slice(0, 6).map((order) => (
              <li key={order.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{order.order_number}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {order.contact_name ?? "Customer"} · {formatDate(order.created_at)}
                  </p>
                </div>
                <StatusBadge status={order.status} />
                <span className="w-20 text-right text-sm font-semibold">{formatPrice(order.total)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </StaffShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  tone?: "warning" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "bg-warning/12 text-warning-foreground"
      : tone === "success"
        ? "bg-success/12 text-success"
        : "bg-primary-light text-primary";
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${toneClass}`}>
        <Icon name={icon} size={20} />
      </span>
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h2 className="text-lg font-bold">{title}</h2>
      {subtitle && <p className="mb-3 text-sm text-muted-foreground">{subtitle}</p>}
      {children}
    </section>
  );
}
