import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 20,
  size = "md",
  label = "Quantity",
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  label?: string;
}) {
  const button =
    size === "sm"
      ? "h-7 w-7 min-h-7 rounded-md"
      : "h-11 w-11 min-h-11";

  return (
    <div className={cn("inline-flex items-center rounded-xl border border-border bg-background", size === "sm" ? "p-0.5 gap-0.5" : "p-1 gap-1")}>
      <button
        type="button"
        aria-label={`Decrease ${label.toLowerCase()}`}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className={cn(
          "grid place-items-center rounded-lg text-foreground transition-colors hover:bg-muted disabled:opacity-40",
          button,
        )}
      >
        <Icon name="remove" size={size === "sm" ? 14 : 20} />
      </button>
      <span
        className={cn("min-w-6 text-center font-semibold", size === "sm" ? "text-xs" : "text-base")}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={`Increase ${label.toLowerCase()}`}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={cn(
          "grid place-items-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary-dark disabled:opacity-40",
          button,
        )}
      >
        <Icon name="add" size={size === "sm" ? 14 : 20} />
      </button>
    </div>
  );
}
