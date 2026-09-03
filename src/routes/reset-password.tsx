import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — FreshDrop" },
      { name: "description", content: "Choose a new password for your FreshDrop account." },
      { property: "og:title", content: "Set a new password — FreshDrop" },
      { property: "og:description", content: "Choose a new password for your FreshDrop account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const parsed = z.string().min(6, "Password must be at least 6 characters.").safeParse(password);
    if (!parsed.success) return setError(parsed.error.issues[0]!.message);
    if (password !== confirm) return setError("Passwords do not match.");

    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      toast.error(friendlyError(updateError, "That reset link is no longer valid. Request a new one."));
      return;
    }
    toast.success("Password updated");
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a password with at least 6 characters.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="new-password" className="text-sm font-medium">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="text-sm font-medium">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={Boolean(error)}
              className={cn(
                "mt-1.5 min-h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary",
                error ? "border-destructive" : "border-border",
              )}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary-dark disabled:opacity-60"
          >
            {busy && <Icon name="progress_activity" size={18} className="animate-spin" />}
            Update password
          </button>
        </form>
      </div>
    </div>
  );
}
