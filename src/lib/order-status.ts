import type { OrderStatus, OrderType } from "@/types/db";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  picked_up: "Picked up",
  cancelled: "Cancelled",
};

export const DELIVERY_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
];

export const PICKUP_FLOW: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "picked_up"];

export function flowFor(type: OrderType) {
  return type === "pickup" ? PICKUP_FLOW : DELIVERY_FLOW;
}

export function stepLabel(status: OrderStatus, type: OrderType) {
  if (status === "pending") return "Order placed";
  if (status === "ready") return type === "pickup" ? "Ready for pickup" : "Ready";
  return STATUS_LABEL[status];
}

export const STATUS_ICON: Record<OrderStatus, string> = {
  pending: "pending",
  confirmed: "check_circle",
  preparing: "blender",
  ready: "shopping_bag",
  out_for_delivery: "delivery_dining",
  delivered: "check_circle",
  picked_up: "check_circle",
  cancelled: "cancel",
};

export const ACTIVE_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
];

export const DELIVERY_FEE = 60;
