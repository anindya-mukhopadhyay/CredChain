import React from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost" | "success";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      primary: "bg-sky-600 text-white hover:bg-sky-700 active:bg-sky-800 shadow-sm border border-transparent",
      secondary: "bg-slate-800 text-white hover:bg-slate-900 active:bg-slate-950 shadow-sm border border-transparent",
      outline: "bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 border border-slate-300 shadow-xs",
      danger: "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm border border-transparent",
      success: "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm border border-transparent",
      ghost: "text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 border border-transparent",
    };

    const sizeClasses = {
      sm: "px-2.5 py-1.5 text-xs font-medium rounded-md gap-1.5",
      md: "px-3.5 py-2 text-sm font-medium rounded-lg gap-2",
      lg: "px-5 py-2.5 text-base font-medium rounded-lg gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center transition-all duration-150 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading && <Spinner size="sm" className="text-current" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
