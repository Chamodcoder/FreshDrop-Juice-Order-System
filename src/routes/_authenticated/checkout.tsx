import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { Icon } from "@/components/Icon";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, friendlyError } from "@/lib/format";
import { DELIVERY_FEE } from "@/lib/order-status";
import { readCoupon, saveCoupon } from "@/lib/coupon";
import { cn } from "@/lib/utils";
import { AddressPickerMap } from "@/components/AddressPickerMap";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — FreshDrop" },
      { name: "description", content: "Choose delivery or pickup and place your FreshDrop order." },
      { property: "og:title", content: "Checkout — FreshDrop" },
      { property: "og:description", content: "Choose delivery or pickup and place your order." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

const STEPS = ["Delivery", "Order", "Payment", "Confirmation"] as const;

const PICKUP_TIMES = ["As soon as ready", "10:30 AM", "12:30 PM", "3:00 PM", "5:00 PM"];

const deliverySchema = z.object({
  contactName: z.string().trim().min(2, "Enter the name for this order.").max(80),
  contactPhone: z
    .string()
    .trim()
    .regex(/^0\d{9}$/, "Enter a 10-digit phone number, e.g. 0771234567."),
  address: z.string().trim().min(6, "Enter where we should deliver.").max(200),
  notes: z.string().trim().max(200).optional(),
});

function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [pickupTime, setPickupTime] = useState(PICKUP_TIMES[0]!);
  const [payment, setPayment] = useState("cash");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<{ id: string; number: string } | null>(null);
  const [form, setForm] = useState({ contactName: "", contactPhone: "", address: "", notes: "" });
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      contactName: prev.contactName || (profile?.full_name ?? ""),
      contactPhone: prev.contactPhone || (profile?.phone ?? ""),
    }));
  }, [profile]);

  const coupon = useMemo(() => (typeof window === "undefined" ? null : readCoupon()), []);
  const deliveryFee = orderType === "delivery" ? DELIVERY_FEE : 0;
  const discount = coupon ? Math.min(coupon.discount, subtotal) : 0;
  const total = Math.max(0, subtotal + deliveryFee - discount);

  if (items.length === 0 && !placed) {
    return (
      <CustomerShell>
        <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Checkout</h1>
        <EmptyState
          icon="shopping_cart"
          title="Nothing to check out yet"
          description="Add a juice to your cart and come back."
          action={
            <Link
              to="/menu"
              className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              Browse the menu
            </Link>
          }
        />
      </CustomerShell>
    );
  }

  const validateDelivery = () => {
    if (orderType === "pickup") return true;
    const parsed = deliverySchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return false;
    }
    setErrors({});
    return true;
  };

  const placeOrder = async () => {
    if (!user) return;
    setPlacing(true);
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_type: orderType,
          contact_name: form.contactName || profile?.full_name || null,
          contact_phone: form.contactPhone || profile?.phone || null,
          delivery_address: orderType === "delivery" ? form.address : null,
          pickup_time: orderType === "pickup" ? pickupTime : null,
          payment_method: payment,
          subtotal,
          delivery_fee: deliveryFee,
          discount,
          total,
          notes: form.notes || null,
        })
        .select("id, order_number")
        .single();

      if (error || !order) throw error ?? new Error("order failed");

      const { error: itemsError } = await supabase.from("order_items").insert(
        items.map((item) => ({
          order_id: order.id,
          product_id: item.productId,
          product_name: item.name,
          image_url: item.imageUrl,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          size: item.size,
          flavor: item.flavor,
          customization: item.addons.length ? item.addons.join(", ") : null,
          subtotal: item.unitPrice * item.quantity,
        })),
      );
      if (itemsError) throw itemsError;

      clear();
      saveCoupon(null);
      setPlaced({ id: order.id, number: order.order_number });
      setStep(3);
      toast.success("Order placed successfully");
    } catch (error) {
      toast.error(friendlyError(error, "We couldn't place your order. Please try again."));
    } finally {
      setPlacing(false);
    }
  };

  return (
    <CustomerShell>
      <h1 className="text-2xl font-bold sm:text-3xl">Checkout</h1>

      <ol className="mt-5 flex flex-wrap items-center gap-2 text-sm" aria-label="Checkout progress">
        {STEPS.map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "grid h-7 w-7 place-items-center rounded-full text-xs font-bold",
                index < step
                  ? "bg-success text-success-foreground"
                  : index === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {index < step ? <Icon name="check" size={14} /> : index + 1}
            </span>
            <span className={cn("font-medium", index === step ? "text-primary" : "text-muted-foreground")}>
              {label}
            </span>
            {index < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
          </li>
        ))}
      </ol>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
          {step === 0 && (
            <section aria-labelledby="step-delivery">
              <h2 id="step-delivery" className="text-lg font-bold">
                How would you like it?
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    { value: "delivery", label: "Delivery", hint: `Rs. ${DELIVERY_FEE} fee · 30–40 min`, icon: "local_shipping" },
                    { value: "pickup", label: "Self pickup", hint: "No fee · collect at counter", icon: "storefront" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setOrderType(option.value)}
                    aria-pressed={orderType === option.value}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                      orderType === option.value
                        ? "border-primary bg-primary-light"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <Icon name={option.icon} size={22} className="text-primary" />
                    <span>
                      <span className="block font-semibold">{option.label}</span>
                      <span className="block text-xs text-muted-foreground">{option.hint}</span>
                    </span>
                  </button>
                ))}
              </div>

              {orderType === "delivery" ? (
                <div className="mt-5 space-y-4">
                  <TextField
                    id="contactName"
                    label="Contact name"
                    value={form.contactName}
                    onChange={(v) => setForm((p) => ({ ...p, contactName: v }))}
                    error={errors["contactName"]}
                  />
                  <TextField
                    id="contactPhone"
                    label="Contact number"
                    value={form.contactPhone}
                    onChange={(v) => setForm((p) => ({ ...p, contactPhone: v }))}
                    error={errors["contactPhone"]}
                    placeholder="0771234567"
                  />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="address" className="text-sm font-medium">
                        Delivery address
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowMap(!showMap)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <Icon name={showMap ? "close" : "map"} size={16} />
                        {showMap ? "Hide map" : "Locate on map"}
                      </button>
                    </div>
                    <input
                      id="address"
                      value={form.address}
                      onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                      placeholder="Hostel block, room number, faculty…"
                      aria-invalid={Boolean(errors["address"])}
                      className={cn(
                        "min-h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary",
                        errors["address"] ? "border-destructive" : "border-border",
                      )}
                    />
                    {errors["address"] && <p className="text-xs text-destructive">{errors["address"]}</p>}
                    
                    {showMap && (
                      <div className="mt-2">
                        <AddressPickerMap
                          onAddressSelect={(address) => setForm((p) => ({ ...p, address }))}
                          initialAddress={form.address}
                        />
                      </div>
                    )}
                  </div>
                  <TextField
                    id="notes"
                    label="Delivery notes (optional)"
                    value={form.notes}
                    onChange={(v) => setForm((p) => ({ ...p, notes: v }))}
                    error={errors["notes"]}
                    placeholder="Call when you arrive"
                  />
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-border bg-surface p-4">
                  <p className="flex items-center gap-2 font-semibold">
                    <Icon name="storefront" size={20} className="text-primary" /> Pickup from FreshDrop
                    Juice Bar
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Main canteen walkway, Sabaragamuwa University, Belihuloya.
                  </p>
                  <label htmlFor="pickupTime" className="mt-4 block text-sm font-medium">
                    Pickup time
                  </label>
                  <select
                    id="pickupTime"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  >
                    {PICKUP_TIMES.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={() => validateDelivery() && setStep(1)}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary-dark sm:w-auto sm:px-8"
              >
                Continue <Icon name="arrow_forward" size={18} />
              </button>
            </section>
          )}

          {step === 1 && (
            <section aria-labelledby="step-order">
              <h2 id="step-order" className="text-lg font-bold">
                Review your order
              </h2>
              <ul className="mt-4 divide-y divide-border">
                {items.map((item) => (
                  <li key={item.key} className="flex items-center gap-3 py-3">
                    <img
                      src={item.imageUrl ?? "/images/mixed-fruit.jpg"}
                      alt={item.name}
                      loading="lazy"
                      width={120}
                      height={120}
                      className="h-14 w-14 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.size} · {item.flavor}
                        {item.addons.length > 0 && ` · ${item.addons.join(", ")}`}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">×{item.quantity}</span>
                    <span className="w-20 text-right font-semibold">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border px-6 text-sm font-semibold"
                >
                  <Icon name="arrow_back" size={18} /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary-dark"
                >
                  Continue to payment <Icon name="arrow_forward" size={18} />
                </button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section aria-labelledby="step-payment">
              <h2 id="step-payment" className="text-lg font-bold">
                Payment
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Online payment is coming soon. For now, pay when you receive your order.
              </p>
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => setPayment("cash")}
                  aria-pressed={payment === "cash"}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-4 text-left",
                    payment === "cash" ? "border-primary bg-primary-light" : "border-border",
                  )}
                >
                  <Icon name="payments" size={22} className="text-primary" />
                  <span>
                    <span className="block font-semibold">
                      {orderType === "delivery" ? "Cash on delivery" : "Cash at pickup"}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Pay {formatPrice(total)} when you get your juice.
                    </span>
                  </span>
                </button>
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border px-6 text-sm font-semibold"
                >
                  <Icon name="arrow_back" size={18} /> Back
                </button>
                <button
                  type="button"
                  onClick={placeOrder}
                  disabled={placing}
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary-dark disabled:opacity-60"
                >
                  {placing && <Icon name="progress_activity" size={18} className="animate-spin" />}
                  Place order · {formatPrice(total)}
                </button>
              </div>
            </section>
          )}

          {step === 3 && placed && (
            <section aria-labelledby="step-done" className="text-center">
              <span className="grid h-14 w-14 place-items-center justify-self-center rounded-2xl bg-success/12 text-success">
                <Icon name="check_circle" size={30} />
              </span>
              <h2 id="step-done" className="mt-4 text-lg font-bold">
                Order {placed.number} placed
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {orderType === "delivery"
                  ? "We'll start preparing right away and bring it to you."
                  : "We'll have it ready at the counter for you."}
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate({ to: "/orders/$id", params: { id: placed.id } })}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary-dark"
                >
                  <Icon name="local_shipping" size={18} /> Track this order
                </button>
                <Link
                  to="/menu"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border px-6 text-sm font-semibold"
                >
                  Order something else
                </Link>
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-40 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-lg font-bold">Summary</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery fee</span>
                <span className="font-medium">{deliveryFee ? formatPrice(deliveryFee) : "Free"}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount ({coupon?.code})</span>
                  <span className="font-medium text-success">− {formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold text-primary">{formatPrice(total)}</span>
              </div>
            </div>
            <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
              <Icon name="schedule" size={16} className="text-primary" />
              {orderType === "delivery"
                ? "Estimated delivery 30–40 minutes."
                : `Ready for pickup: ${pickupTime}.`}
            </p>
          </div>
        </aside>
      </div>
    </CustomerShell>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={cn(
          "mt-1.5 min-h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary",
          error ? "border-destructive" : "border-border",
        )}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
