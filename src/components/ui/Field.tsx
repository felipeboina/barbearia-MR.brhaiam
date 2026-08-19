import { ReactNode } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block text-xs uppercase tracking-wider mb-1.5 text-muted font-body">{label}</span>
      {children}
    </label>
  );
}
