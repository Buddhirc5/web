"use client";

import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--pab-red)] text-white hover:bg-[var(--pab-red-deep)] shadow-sm",
  secondary:
    "bg-white text-ink border border-[var(--hairline)] hover:bg-[var(--surface-secondary)]",
  ghost: "bg-transparent text-ink hover:bg-black/5",
  danger: "bg-[var(--red-rag)] text-white hover:opacity-90",
  soft: "bg-[var(--pab-red-soft)] text-[var(--pab-red-deep)] hover:bg-[#f8d4d5]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const sizes = {
    sm: "h-8 px-3 text-xs rounded-[8px]",
    md: "h-10 px-4 text-sm rounded-[10px]",
    lg: "h-12 px-5 text-[15px] rounded-[12px]",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
