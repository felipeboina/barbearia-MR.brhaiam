export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 smooth"
      aria-pressed={checked}
    >
      <span
        className="relative inline-flex h-6 w-11 items-center rounded-full smooth border border-line"
        style={{ background: checked ? "var(--brass)" : "var(--ink)" }}
      >
        <span
          className="inline-block h-4 w-4 transform rounded-full bg-cream smooth"
          style={{ transform: checked ? "translateX(22px)" : "translateX(4px)" }}
        />
      </span>
      {label && <span className="text-sm text-cream font-body">{label}</span>}
    </button>
  );
}
