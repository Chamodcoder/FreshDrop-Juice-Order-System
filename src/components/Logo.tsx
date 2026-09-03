import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2", className)} aria-label="FreshDrop home">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Icon name="water_drop" filled size={20} />
      </span>
      {!compact && (
        <span className="text-lg font-bold tracking-tight">
          Fresh<span className="text-primary">Drop</span>
        </span>
      )}
    </Link>
  );
}
