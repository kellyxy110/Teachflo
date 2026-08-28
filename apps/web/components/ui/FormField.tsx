import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "./cn";

export function FormField({
  id,
  label,
  description,
  error,
  required,
  children,
  className,
}: {
  id: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-semibold text-text">
        {label}
        {required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {description && <p id={`${id}-description`} className="text-xs leading-5 text-text-2">{description}</p>}
      {children}
      {error && <p id={`${id}-error`} role="alert" className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

const controlStyles = "min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text shadow-sm transition-colors placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-bg disabled:text-muted aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/20";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(controlStyles, className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return <select ref={ref} className={cn(controlStyles, className)} {...props}>{children}</select>;
});

export function fieldAria(id: string, options: { description?: boolean; error?: boolean } = {}) {
  const describedBy = [options.description && `${id}-description`, options.error && `${id}-error`].filter(Boolean).join(" ");
  return {
    "aria-describedby": describedBy || undefined,
    "aria-invalid": options.error || undefined,
  } as const;
}
