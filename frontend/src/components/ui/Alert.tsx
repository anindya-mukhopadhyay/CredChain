import React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "danger";
  title?: string;
}

export function Alert({
  className,
  variant = "info",
  title,
  children,
  ...props
}: AlertProps) {
  const icons = {
    info: <Info className="w-5 h-5 text-sky-600 shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
    danger: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
  };

  const variantClasses = {
    info: "bg-sky-50/70 border-sky-200 text-sky-900",
    success: "bg-emerald-50/70 border-emerald-200 text-emerald-900",
    warning: "bg-amber-50/70 border-amber-200 text-amber-900",
    danger: "bg-rose-50/70 border-rose-200 text-rose-900",
  };

  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border p-4 flex gap-3.5 shadow-2xs",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {icons[variant]}
      <div className="space-y-1 text-sm flex-1">
        {title && <h5 className="font-semibold leading-none tracking-tight">{title}</h5>}
        <div className="text-slate-700 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
