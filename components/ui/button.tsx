import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary" | "danger"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-between whitespace-nowrap text-base uppercase tracking-[1px] font-bold transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-mnr-accent text-black hover:bg-[#b3e600] active:bg-[#a3d600] border-none": variant === "default",
            "border border-mnr-border bg-transparent hover:border-mnr-accent active:border-mnr-accent/80 text-mnr-text": variant === "outline",
            "hover:bg-mnr-surface active:bg-mnr-surface-hover/80 text-mnr-muted hover:text-mnr-text": variant === "ghost",
            "bg-mnr-surface text-mnr-text hover:bg-mnr-surface-hover active:bg-mnr-surface-hover/80": variant === "secondary",
            "bg-transparent border border-mnr-error text-mnr-error hover:bg-mnr-error/10 active:bg-mnr-error/20": variant === "danger",
            "h-[64px] px-5": size === "default",
            "h-12 px-4": size === "sm",
            "h-20 px-6 text-lg": size === "lg",
            "h-[64px] w-[64px] justify-center": size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
