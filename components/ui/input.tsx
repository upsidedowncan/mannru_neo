import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full bg-mnr-surface border border-mnr-border px-4 py-5 text-base text-mnr-text transition-all",
          "focus:outline-none focus:border-mnr-accent focus:bg-mnr-bg focus:shadow-[4px_4px_0px_var(--color-mnr-accent-dim)]",
          "rounded-none disabled:opacity-50 placeholder:text-mnr-muted",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
