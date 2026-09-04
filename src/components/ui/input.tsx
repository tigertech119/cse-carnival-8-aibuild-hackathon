import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, id, className = "", ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-slate-700 tracking-tight"
          >
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full bg-white text-slate-900 placeholder:text-slate-400 border rounded-lg px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 ${
              leftIcon ? "pl-9" : ""
            } ${
              error
                ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-100"
            } disabled:bg-slate-50 disabled:text-slate-400 ${className}`}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-xs text-red-600 tracking-tight">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-500 tracking-tight">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
