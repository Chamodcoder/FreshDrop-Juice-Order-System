import { supabase } from "@/integrations/supabase/client";

export type AppliedCoupon = { code: string; discount: number };

const KEY = "freshdrop.coupon.v1";

export function readCoupon(): AppliedCoupon | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AppliedCoupon) : null;
  } catch {
    return null;
  }
}

export function saveCoupon(coupon: AppliedCoupon | null) {
  try {
    if (coupon) window.localStorage.setItem(KEY, JSON.stringify(coupon));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}

export async function validateCoupon(code: string, subtotal: number) {
  const clean = code.trim().toUpperCase();
  if (!clean) return { ok: false as const, message: "Enter a promo code." };

  const { data, error } = await supabase
    .from("coupons")
    .select("code, discount_type, discount_value, minimum_order, expiry_date, is_active")
    .eq("code", clean)
    .maybeSingle();

  if (error) return { ok: false as const, message: "Could not check that code. Please try again." };
  if (!data || !data.is_active) return { ok: false as const, message: "That promo code isn't valid." };
  if (data.expiry_date && new Date(data.expiry_date) < new Date())
    return { ok: false as const, message: "That promo code has expired." };
  if (subtotal < Number(data.minimum_order))
    return {
      ok: false as const,
      message: `Spend at least Rs. ${Number(data.minimum_order)} to use this code.`,
    };

  const discount =
    data.discount_type === "percent"
      ? Math.round((subtotal * Number(data.discount_value)) / 100)
      : Number(data.discount_value);

  return { ok: true as const, coupon: { code: clean, discount } };
}
