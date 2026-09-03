import { cn } from "@/lib/utils";

type IconProps = {
  name: string;
  className?: string;
  filled?: boolean;
  size?: number;
  label?: string;
};

/** Google Material Symbols (Rounded) icon. */
export function Icon({ name, className, filled, size = 20, label }: IconProps) {
  return (
    <span
      className={cn("icon shrink-0 align-middle", filled && "icon-filled", className)}
      style={{ fontSize: size, width: size, height: size, overflow: "hidden" }}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    >
      {name}
    </span>
  );
}
