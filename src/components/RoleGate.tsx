import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRole } from "@/types/db";

export function RoleGate({ allow, children }: { allow: AppRole; children: ReactNode }) {
  const { role, loading } = useAuth();

  if (loading || role === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface">
        <Icon name="progress_activity" size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (role !== allow) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface px-4">
        <div className="max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <span className="grid h-12 w-12 place-items-center justify-self-center rounded-2xl bg-destructive/10 text-destructive">
            <Icon name="lock" size={24} />
          </span>
          <h1 className="mt-4 text-lg font-bold">Restricted area</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your account doesn't have access to this dashboard.
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Back to FreshDrop
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
