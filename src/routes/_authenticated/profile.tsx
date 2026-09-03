import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { Icon } from "@/components/Icon";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My profile — FreshDrop" },
      { name: "description", content: "Update your name, phone number and account details." },
      { property: "og:title", content: "My profile — FreshDrop" },
      { property: "og:description", content: "Manage your FreshDrop account details." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name.").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^0\d{9}$/, "Enter a 10-digit phone number, e.g. 0771234567."),
});

function ProfilePage() {
  const { user, profile, role, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ full_name: profile?.full_name ?? "", phone: profile?.phone ?? "" });
  }, [profile]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: parsed.data.full_name, phone: parsed.data.phone })
      .eq("id", user!.id);
    setSaving(false);
    if (error) {
      toast.error(friendlyError(error, "We couldn't save your profile. Please try again."));
      return;
    }
    await refreshProfile();
    toast.success("Profile updated");
  };

  return (
    <CustomerShell>
      <h1 className="text-2xl font-bold sm:text-3xl">My profile</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={save} className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6" noValidate>
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-light text-primary">
              <Icon name="person" size={28} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{profile?.full_name || "Your account"}</p>
              <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="full_name" className="text-sm font-medium">
                Full name
              </label>
              <input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                className={cn(
                  "mt-1.5 min-h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary",
                  errors["full_name"] ? "border-destructive" : "border-border",
                )}
              />
              {errors["full_name"] && <p className="mt-1 text-xs text-destructive">{errors["full_name"]}</p>}
            </div>
            <div>
              <label htmlFor="phone" className="text-sm font-medium">
                Phone number
              </label>
              <input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className={cn(
                  "mt-1.5 min-h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary",
                  errors["phone"] ? "border-destructive" : "border-border",
                )}
              />
              {errors["phone"] && <p className="mt-1 text-xs text-destructive">{errors["phone"]}</p>}
            </div>
            <div>
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                value={user?.email ?? ""}
                readOnly
                className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-muted px-3 text-sm text-muted-foreground"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary-dark disabled:opacity-60"
          >
            {saving && <Icon name="progress_activity" size={18} className="animate-spin" />}
            Save changes
          </button>
        </form>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-semibold">Account</h2>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Icon name="badge" size={18} className="text-primary" />
              Role: <strong className="font-semibold capitalize text-foreground">{role ?? "customer"}</strong>
            </p>
            {role === "admin" && (
              <button
                type="button"
                onClick={() => navigate({ to: "/admin" })}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold"
              >
                <Icon name="dashboard" size={18} /> Admin dashboard
              </button>
            )}
            {role === "delivery" && (
              <button
                type="button"
                onClick={() => navigate({ to: "/delivery" })}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold"
              >
                <Icon name="delivery_dining" size={18} /> Delivery dashboard
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-semibold">Session</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Signing out clears your session on this device. Your cart is kept.
            </p>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate({ to: "/", replace: true });
              }}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 text-sm font-semibold text-destructive hover:bg-destructive/8"
            >
              <Icon name="logout" size={18} /> Sign out
            </button>
          </div>
        </aside>
      </div>
    </CustomerShell>
  );
}
