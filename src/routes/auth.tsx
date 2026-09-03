import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/contexts/AuthContext";
import { friendlyError } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or create an account — FreshDrop" },
      {
        name: "description",
        content: "Sign in to order fresh juices, track deliveries and save your favourite drinks.",
      },
      { property: "og:title", content: "Sign in — FreshDrop" },
      { property: "og:description", content: "Access your FreshDrop account to order and track juices." },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, { message: "Enter your full name." }).max(80),
    email: z.string().trim().email({ message: "Enter a valid email address." }).max(255),
    phone: z
      .string()
      .trim()
      .regex(/^0\d{9}$/, { message: "Enter a 10-digit phone number, e.g. 0771234567." }),
    password: z.string().min(6, { message: "Password must be at least 6 characters." }).max(72),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

type Mode = "login" | "register" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<"confirm" | "reset" | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (loading || !user) return;
    navigate({ to: role === "admin" ? "/admin" : role === "delivery" ? "/delivery" : "/", replace: true });
  }, [user, role, loading, navigate]);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    if (mode === "forgot") {
      const parsed = z.string().trim().email().safeParse(form.email);
      if (!parsed.success) return setErrors({ email: "Enter a valid email address." });
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setBusy(false);
      if (error) return toast.error(friendlyError(error));
      setSent("reset");
      return;
    }

    if (mode === "login") {
      const parsed = loginSchema.safeParse(form);
      if (!parsed.success) return setErrors(fieldErrors(parsed.error));
      setBusy(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      setBusy(false);
      if (error) return toast.error(friendlyError(error));
      toast.success("Welcome back");
      return;
    }

    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: parsed.data.fullName, phone: parsed.data.phone },
      },
    });
    setBusy(false);
    if (error) return toast.error(friendlyError(error));
    if (!data.session) {
      setSent("confirm");
      return;
    }
    toast.success("Account created");
  };

  const googleSignIn = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    setBusy(false);
    if (result.error) {
      toast.error("Google sign-in is unavailable right now.");
      return;
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col">
        <Logo className="[&_span:last-child]:text-primary-foreground" />
        <div className="mt-auto max-w-sm">
          <h2 className="text-3xl font-bold leading-tight">Fresh juice, zero queue.</h2>
          <p className="mt-3 text-sm text-primary-foreground/90">
            Order ahead from the FreshDrop juice bar, pick delivery or self-pickup, and follow every
            step of your order live.
          </p>
        </div>
        <img
          src="/images/hero-juices.jpg"
          alt="Fresh juices lined up at the counter"
          width={1400}
          height={900}
          className="mt-8 h-56 w-full rounded-2xl object-cover"
        />
      </div>

      <div className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="lg:hidden">
            <Logo />
          </div>

          <h1 className="mt-6 text-2xl font-bold sm:text-3xl">
            {mode === "login" ? "Welcome back" : mode === "register" ? "Create your account" : "Reset password"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login"
              ? "Sign in to order and track your juices."
              : mode === "register"
                ? "It takes less than a minute."
                : "We'll email you a link to set a new password."}
          </p>

          {sent ? (
            <div className="mt-8 rounded-2xl border border-border bg-surface p-6 text-center">
              <span className="grid h-12 w-12 place-items-center justify-self-center rounded-2xl bg-primary-light text-primary">
                <Icon name="mark_email_read" size={24} />
              </span>
              <h2 className="mt-4 font-semibold">Check your email</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {sent === "confirm"
                  ? "We sent a confirmation link to your inbox. Confirm your email to finish signing up."
                  : "We sent a password reset link to your inbox."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSent(null);
                  setMode("login");
                }}
                className="mt-5 min-h-11 rounded-xl border border-border px-5 text-sm font-semibold"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              {mode !== "forgot" && (
                <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                  {(["login", "register"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setMode(value);
                        setErrors({});
                      }}
                      className={cn(
                        "min-h-11 rounded-lg text-sm font-semibold transition-colors",
                        mode === value ? "bg-background text-foreground shadow-panel" : "text-muted-foreground",
                      )}
                    >
                      {value === "login" ? "Sign in" : "Register"}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
                {mode === "register" && (
                  <Field
                    id="fullName"
                    label="Full name"
                    value={form.fullName}
                    onChange={update("fullName")}
                    error={errors["fullName"]}
                    autoComplete="name"
                  />
                )}
                <Field
                  id="email"
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={update("email")}
                  error={errors["email"]}
                  autoComplete="email"
                />
                {mode === "register" && (
                  <Field
                    id="phone"
                    label="Phone number"
                    value={form.phone}
                    onChange={update("phone")}
                    error={errors["phone"]}
                    autoComplete="tel"
                    placeholder="0771234567"
                  />
                )}
                {mode !== "forgot" && (
                  <Field
                    id="password"
                    label="Password"
                    type="password"
                    value={form.password}
                    onChange={update("password")}
                    error={errors["password"]}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                )}
                {mode === "register" && (
                  <Field
                    id="confirmPassword"
                    label="Confirm password"
                    type="password"
                    value={form.confirmPassword}
                    onChange={update("confirmPassword")}
                    error={errors["confirmPassword"]}
                    autoComplete="new-password"
                  />
                )}

                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setErrors({});
                    }}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Forgot your password?
                  </button>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-dark disabled:opacity-60"
                >
                  {busy && <Icon name="progress_activity" size={18} className="animate-spin" />}
                  {mode === "login" ? "Sign in" : mode === "register" ? "Create account" : "Send reset link"}
                </button>
              </form>



              {mode === "forgot" && (
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <Icon name="arrow_back" size={18} /> Back to sign in
                </button>
              )}
            </>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground">
            <Link to="/" className="font-medium text-primary hover:underline">
              Continue browsing the menu
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string | undefined;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          "mt-1.5 min-h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary",
          error ? "border-destructive" : "border-border",
        )}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
