import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

const base =
  "w-full rounded-md px-3 py-2.5 text-[15px] outline-none border smooth bg-ink border-line text-cream font-body focus:border-brass placeholder:text-muted";

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput(
  { className = "", ...props },
  ref
) {
  return <input ref={ref} {...props} className={`${base} ${className}`} />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea(
  { className = "", ...props },
  ref
) {
  return <textarea ref={ref} {...props} className={`${base} ${className}`} />;
});

export function Select({ className = "", children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${base} ${className}`}>
      {children}
    </select>
  );
}
