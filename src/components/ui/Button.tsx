import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "brass" | "ghost" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-barber-red text-cream shadow-[0_4px_14px_-4px_rgba(47,95,224,0.55)]",
  brass: "bg-brass text-ink shadow-[0_4px_14px_-4px_rgba(204,214,234,0.4)]",
  ghost: "bg-transparent text-cream border border-line",
  danger: "bg-transparent text-danger border border-[#5c2b34]",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: { variant?: Variant } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`press-scale btn-shine px-4 py-2.5 rounded-md font-medium text-sm font-body disabled:opacity-40 disabled:active:scale-100 ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
