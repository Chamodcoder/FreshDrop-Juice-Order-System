import { Icon } from "@/components/Icon";
import { STATUS_ICON, flowFor, stepLabel } from "@/lib/order-status";
import { formatDate } from "@/lib/format";
import type { Order, OrderStatusHistory } from "@/types/db";
import { cn } from "@/lib/utils";

export function OrderTimeline({ order, history }: { order: Order; history?: OrderStatusHistory[] }) {
  const flow = flowFor(order.order_type);

  if (order.status === "cancelled") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-destructive/8 p-4 text-destructive">
        <Icon name="cancel" size={22} />
        <div>
          <p className="text-sm font-semibold">Order cancelled</p>
          <p className="text-xs">This order was cancelled and will not be prepared.</p>
        </div>
      </div>
    );
  }

  const currentIndex = flow.indexOf(order.status);

  return (
    <ol className="relative space-y-0">
      {flow.map((status, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        const at = history?.find((h) => h.status === status)?.created_at;
        return (
          <li key={status} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full ring-2 transition-colors",
                  done && "bg-success text-success-foreground ring-success/25",
                  current && "bg-primary text-primary-foreground ring-primary/25",
                  !done && !current && "bg-muted text-muted-foreground ring-transparent",
                )}
              >
                <Icon name={done ? "check" : STATUS_ICON[status]} size={18} />
              </span>
              {index < flow.length - 1 && (
                <span className={cn("my-1 w-0.5 flex-1", done ? "bg-success" : "bg-border")} />
              )}
            </div>
            <div className={cn("pb-6", index === flow.length - 1 && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-semibold",
                  current ? "text-primary" : done ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {stepLabel(status, order.order_type)}
                {current && <span className="ml-2 text-xs font-medium text-primary">In progress</span>}
              </p>
              <p className="text-xs text-muted-foreground">{at ? formatDate(at) : "Pending"}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
