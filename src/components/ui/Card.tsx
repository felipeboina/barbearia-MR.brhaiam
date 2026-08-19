import { HTMLAttributes } from "react";

export function Card({
  children,
  className = "",
  lift = false,
  ...rest
}: { lift?: boolean } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={`rounded-lg p-5 smooth bg-panel border border-line ${lift ? "hover-lift" : ""} ${className}`}>
      {children}
    </div>
  );
}
