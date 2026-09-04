import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline";
  size?: "sm" | "md";
}

export function Badge({
  children,
  className = "",
  variant = "default",
  size = "md",
  ...props
}: BadgeProps) {
  const baseStyles = "inline-flex items-center font-medium rounded-md tracking-tight select-none";

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 leading-tight",
    md: "text-xs px-2.5 py-1 leading-snug",
  };

  const variantStyles = {
    default: "bg-slate-100 text-slate-700 border border-slate-200/80",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border border-amber-200",
    danger: "bg-red-50 text-red-700 border border-red-200",
    info: "bg-sky-50 text-sky-700 border border-sky-200",
    outline: "bg-transparent text-slate-600 border border-slate-300",
  };

  return (
    <span
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
