import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  hint,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("panel flex flex-col", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="label-xs text-foreground/80">{title}</h2>}
            {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn("flex-1 p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "positive" | "negative" | "finance";
}) {
  const toneClass =
    tone === "positive"
      ? "text-positive"
      : tone === "negative"
        ? "text-negative"
        : tone === "finance"
          ? "text-finance"
          : "text-foreground";
  return (
    <div className="panel relative overflow-hidden px-4 py-3">
      <span className="label-xs">{label}</span>
      <div className={cn("num mt-1 text-2xl font-semibold md:text-[1.75rem]", toneClass)}>
        {value}
      </div>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Ring({
  ratio,
  size = 34,
  stroke = 3,
  color = "var(--habit)",
  children,
}: {
  ratio: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, ratio));
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          style={{ transition: "stroke-dashoffset 400ms ease" }}
        />
      </svg>
      <span className="absolute text-[10px] font-medium">{children}</span>
    </span>
  );
}

export function Delta({ value, invert = false }: { value: number; invert?: boolean }) {
  if (!value) return <span className="text-xs text-muted-foreground">no change</span>;
  const good = invert ? value < 0 : value > 0;
  return (
    <span className={cn("num text-xs", good ? "text-positive" : "text-negative")}>
      {value > 0 ? "+" : ""}
      {value}
    </span>
  );
}

export const accentVar = (accent: string) =>
  accent === "finance" ? "var(--finance)" : accent === "metric" ? "var(--metric)" : "var(--habit)";
