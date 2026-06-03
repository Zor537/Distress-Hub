import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-divider bg-bg-alt px-3 py-2 text-sm",
        "focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/40",
        "disabled:cursor-not-allowed disabled:opacity-50 appearance-none",
        "bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2020%2020%22%20fill=%22%23C9A961%22%3E%3Cpath%20fill-rule=%22evenodd%22%20d=%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.06l3.71-3.83a.75.75%200%20111.08%201.04l-4.25%204.4a.75.75%200%2001-1.08%200l-4.25-4.4a.75.75%200%2001.02-1.06z%22%20clip-rule=%22evenodd%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_0.65rem_center] bg-[length:1.1em] pr-8",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
