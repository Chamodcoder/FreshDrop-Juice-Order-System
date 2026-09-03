import { Icon } from "@/components/Icon";
import { STATUS_ICON, STATUS_LABEL } from "@/lib/order-status";
import type { OrderStatus } from "@/types/db";
import { cn } from "@/lib/utils";

const TONE: Record<OrderStatus, string> = {
  pending: "bg-warning/12 text-warning-foreground ring-warning/30",
  confirmed: "bg-primary-light text-primary-dark ring-primary/25",
  preparing: "bg-primary-light text-primary-dark ring-primary/25",
  ready: "bg-primary/12 text-primary-dark ring-primary/30",
  out_for_delivery: "bg-primary/12 text-primary-dark ring-primary/30",
  delivered: "bg-success/12 text-success ring-success/30",
  picked_up: "bg-success/12 text-success ring-success/30",
  cancelled: "bg-destructive/10 text-destructive ring-destructive/25",
};

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ring-1",
        TONE[status],
        className,
      )}
    >
      <Icon name={STATUS_ICON[status]} size={14} />
      {STATUS_LABEL[status]}
    </span>
  );
}
