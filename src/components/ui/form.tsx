import type { ReactNode } from "react";

export function SectionHeader({
  eyebrow,
  title,
  badge,
}: {
  eyebrow: string;
  title: string;
  badge: string;
}) {
  return (
    <div className="section-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <span className="badge badge-slate">{badge}</span>
    </div>
  );
}

export function FormField({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`field ${wide ? "col-span-2 max-md:col-span-1" : ""}`}>
      {label}
      {children}
    </label>
  );
}

export function SummaryItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green" | "amber";
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <strong
        className={`block max-w-[280px] truncate ${tone === "green" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : ""}`}
      >
        {value}
      </strong>
    </div>
  );
}
