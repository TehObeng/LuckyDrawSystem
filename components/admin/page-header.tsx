import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <header className={cn("space-y-3", className)}>
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">{eyebrow}</p> : null}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-50 md:text-4xl">{title}</h1>
        <p className="max-w-3xl text-sm text-slate-400 md:text-base">{description}</p>
      </div>
    </header>
  );
}

