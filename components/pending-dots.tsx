import { cn } from "@/lib/utils";

export function PendingDots({ label, className }: { label: string; className?: string }) {
  return (
    <p
      className={cn("flex h-6 items-center justify-center gap-1.5", className)}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      {[0, 1, 2, 3].map((dot) => (
        <span
          key={dot}
          aria-hidden
          className="size-1.5 animate-[seefood-dot_1.2s_ease-in-out_infinite] rounded-full bg-current"
          style={{ animationDelay: `${dot * 150}ms` }}
        />
      ))}
    </p>
  );
}
