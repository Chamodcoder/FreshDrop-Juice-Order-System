import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DESKTOP_LINKS = [
  { to: "/", label: "Home", icon: "home" },
  { to: "/menu", label: "Menu", icon: "local_drink" },
  { to: "/orders", label: "My Orders", icon: "receipt_long" },
  { to: "/favorites", label: "Favorites", icon: "favorite" },
] as const;

const MOBILE_LINKS = [
  { to: "/", label: "Home", icon: "home" },
  { to: "/menu", label: "Menu", icon: "local_drink" },
  { to: "/orders", label: "Orders", icon: "receipt_long" },
  { to: "/cart", label: "Cart", icon: "shopping_cart" },
  { to: "/profile", label: "Profile", icon: "person" },
] as const;

export function CustomerShell({
  children,
  search,
  onSearchChange,
}: {
  children: ReactNode;
  search?: string;
  onSearchChange?: (value: string) => void;
}) {
  const { count } = useCart();
  const { user, profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [localSearch, setLocalSearch] = useState("");

  const searchValue = onSearchChange ? (search ?? "") : localSearch;
  const handleSearch = (value: string) => {
    if (onSearchChange) onSearchChange(value);
    else setLocalSearch(value);
  };
  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!onSearchChange) navigate({ to: "/menu", search: { q: localSearch || undefined } });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-3 sm:px-4 py-3 lg:gap-6 lg:px-8">
          <Logo />

          <form onSubmit={submitSearch} className="hidden min-w-0 flex-1 md:block" role="search">
            <label htmlFor="site-search" className="sr-only">
              Search juices
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 focus-within:border-primary">
              <Icon name="search" size={20} className="text-muted-foreground" />
              <input
                id="site-search"
                value={searchValue}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="What would you like to drink?"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1 lg:gap-2">
            <span className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-muted-foreground xl:flex">
              <Icon name="location_on" size={18} className="text-primary" />
              Sabaragamuwa University
            </span>

            <Link
              to="/cart"
              aria-label={`Cart, ${count} items`}
              className="relative grid h-11 w-11 place-items-center rounded-xl text-foreground transition-colors hover:bg-muted"
            >
              <Icon name="shopping_cart" size={22} />
              {count > 0 && (
                <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </Link>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Account menu"
                  className="grid h-11 w-11 place-items-center rounded-xl bg-primary-light text-primary transition-colors hover:bg-primary/15"
                >
                  <Icon name="person" size={22} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">
                    {profile?.full_name || user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
                    <Icon name="person" size={18} /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ to: "/orders" })}>
                    <Icon name="receipt_long" size={18} /> My orders
                  </DropdownMenuItem>
                  {role === "admin" && (
                    <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
                      <Icon name="dashboard" size={18} /> Admin dashboard
                    </DropdownMenuItem>
                  )}
                  {role === "delivery" && (
                    <DropdownMenuItem onClick={() => navigate({ to: "/delivery" })}>
                      <Icon name="delivery_dining" size={18} /> Delivery dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <Icon name="logout" size={18} /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                to="/auth"
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-dark"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>

        <nav aria-label="Main" className="hidden border-t border-border md:block">
          <div className="mx-auto flex max-w-[1400px] gap-1 px-4 lg:px-8">
            {DESKTOP_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                activeOptions={{ exact: link.to === "/" }}
                className="flex items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-primary data-[status=active]:text-primary"
              >
                <Icon name={link.icon} size={18} />
                {link.label}
              </Link>
            ))}
          </div>
        </nav>

        <form onSubmit={submitSearch} className="border-t border-border px-4 py-3 md:hidden" role="search">
          <label htmlFor="site-search-mobile" className="sr-only">
            Search juices
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 focus-within:border-primary">
            <Icon name="search" size={20} className="text-muted-foreground" />
            <input
              id="site-search-mobile"
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search juices..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </form>
      </header>

      <main className="mx-auto max-w-[1400px] px-3 sm:px-4 pb-28 pt-5 md:pb-16 lg:px-8">{children}</main>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background md:hidden"
      >
        <div className="mx-auto flex max-w-md">
          {MOBILE_LINKS.map((link) => {
            const active = link.to === "/" ? pathname === "/" : pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon name={link.icon} filled={active} size={22} />
                {link.label}
                {link.to === "/cart" && count > 0 && (
                  <span className="absolute right-[22%] top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
