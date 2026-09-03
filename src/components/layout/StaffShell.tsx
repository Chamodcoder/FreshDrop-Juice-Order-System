import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: string };

const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: "dashboard" },
  { to: "/admin/orders", label: "Orders", icon: "receipt_long" },
  { to: "/admin/products", label: "Products", icon: "inventory_2" },
  { to: "/admin/delivery", label: "Delivery", icon: "delivery_dining" },
];

const DELIVERY_NAV: NavItem[] = [{ to: "/delivery", label: "Dashboard", icon: "dashboard" }];

export function StaffShell({
  children,
  variant,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  variant: "admin" | "delivery";
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const nav = variant === "admin" ? ADMIN_NAV : DELIVERY_NAV;
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/", replace: true });
  };

  const sidebar = (
    <div className="flex h-full flex-col gap-1 p-4">
      <div className="mb-4 px-1">
        <Logo />
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {variant === "admin" ? "Admin console" : "Delivery staff"}
        </p>
      </div>
      {nav.map((item) => {
        const active = pathname === item.to || (item.to !== "/admin" && item.to !== "/delivery" && pathname.startsWith(item.to));
        return (
          <Link
            key={item.to}
            to={item.to as "/admin"}
            onClick={() => setOpen(false)}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
              active
                ? "bg-primary-light text-primary-dark"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon name={item.icon} filled={active} size={20} />
            {item.label}
          </Link>
        );
      })}
      <div className="mt-auto space-y-1 border-t border-border pt-3">
        <Link
          to="/"
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Icon name="storefront" size={20} /> Customer site
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Icon name="logout" size={20} /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-sidebar lg:block">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-secondary/40"
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-sidebar shadow-card-hover">{sidebar}</div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:px-8">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
              className="grid h-11 w-11 place-items-center rounded-xl hover:bg-muted lg:hidden"
            >
              <Icon name="menu" size={22} />
            </button>
            <div className="min-w-0 lg:col-start-2">
              <h1 className="truncate text-xl font-bold lg:text-2xl">{title}</h1>
              {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">
              {actions}
              <span className="hidden truncate text-sm text-muted-foreground sm:block">
                {profile?.full_name ?? ""}
              </span>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
