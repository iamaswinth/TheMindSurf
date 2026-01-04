"use client";

import React from "react";

// ============================================
// NEO-BRUTALISM BUTTON COMPONENT
// ============================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyles = `
    inline-flex items-center justify-center font-black uppercase tracking-wide
    border-4 border-black transition-all duration-100 cursor-pointer
    hover:translate-x-[-2px] hover:translate-y-[-2px]
    active:translate-x-[4px] active:translate-y-[4px] active:shadow-[2px_2px_0px_#000]
  `;

  const variants = {
    primary:
      "bg-[#FF006E] text-white shadow-[6px_6px_0px_#000] hover:shadow-[8px_8px_0px_#000]",
    secondary:
      "bg-[#FFFF00] text-black shadow-[6px_6px_0px_#000] hover:shadow-[8px_8px_0px_#000]",
    ghost:
      "bg-transparent text-black border-3 shadow-none hover:bg-[#FFFF00] hover:shadow-[4px_4px_0px_#000]",
    danger:
      "bg-[#FF0000] text-white shadow-[6px_6px_0px_#000] hover:shadow-[8px_8px_0px_#000]",
  };

  const sizes = {
    sm: "px-4 py-2 text-xs gap-2",
    md: "px-6 py-3 text-sm gap-2",
    lg: "px-8 py-4 text-base gap-3",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${
        disabled || isLoading
          ? "opacity-50 cursor-not-allowed hover:translate-x-0 hover:translate-y-0"
          : ""
      } ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span
          className="w-5 h-5 border-3 border-current border-t-transparent animate-spin"
          style={{ borderRadius: "0" }}
        />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};

// ============================================
// NEO-BRUTALISM INPUT COMPONENT
// ============================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  className = "",
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-black text-black mb-2 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-black">
            {leftIcon}
          </div>
        )}
        <input
          className={`
            w-full px-4 py-3 ${leftIcon ? "pl-12" : ""} 
            border-4 border-black bg-white text-black font-semibold
            placeholder:text-gray-500 placeholder:font-semibold placeholder:uppercase
            shadow-[4px_4px_0px_#000] 
            focus:outline-none focus:shadow-[6px_6px_0px_#000] focus:border-[#FF006E]
            transition-all duration-100
            ${error ? "border-[#FF0000] bg-red-50" : ""} 
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-2 text-sm font-bold text-[#FF0000] uppercase">
          {error}
        </p>
      )}
    </div>
  );
};

// ============================================
// NEO-BRUTALISM SELECT COMPONENT
// ============================================
interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  onChange?: (value: string) => void;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  placeholder,
  onChange,
  className = "",
  value,
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-black text-black mb-2 uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        className={`
          w-full px-4 py-3 
          border-4 border-black bg-white text-black font-bold
          shadow-[4px_4px_0px_#000] 
          focus:outline-none focus:shadow-[6px_6px_0px_#000] focus:border-[#FF006E]
          appearance-none cursor-pointer
          transition-all duration-100
          ${className}
        `}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='3'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
          paddingRight: "48px",
        }}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

// ============================================
// NEO-BRUTALISM CARD COMPONENT
// ============================================
interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  color?: "white" | "yellow" | "pink" | "cyan" | "lime";
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  onClick,
  hover = false,
  color = "white",
}) => {
  const colors = {
    white: "bg-white",
    yellow: "bg-[#FFFF00]",
    pink: "bg-[#FF006E] text-white",
    cyan: "bg-[#00FFFF]",
    lime: "bg-[#CCFF00]",
  };

  return (
    <div
      className={`
        ${colors[color]} border-4 border-black shadow-[6px_6px_0px_#000]
        ${
          hover
            ? "hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[10px_10px_0px_#000] cursor-pointer transition-all duration-100"
            : ""
        } 
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// ============================================
// NEO-BRUTALISM BADGE COMPONENT
// ============================================
interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  className = "",
}) => {
  const variants = {
    default: "bg-white text-black",
    success: "bg-[#CCFF00] text-black",
    warning: "bg-[#FF6B00] text-white",
    error: "bg-[#FF0000] text-white",
    info: "bg-[#00FFFF] text-black",
  };

  return (
    <span
      className={`
      inline-flex items-center px-3 py-1 
      border-3 border-black font-black text-xs uppercase tracking-wide
      ${variants[variant]} ${className}
    `}
    >
      {children}
    </span>
  );
};

// ============================================
// NEO-BRUTALISM TOOLTIP COMPONENT
// ============================================
interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = "top",
}) => {
  const positions = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div className="relative group inline-block">
      {children}
      <div
        className={`
        absolute ${positions[position]} px-3 py-2 
        bg-black text-[#FFFF00] text-xs font-bold uppercase
        border-3 border-[#FFFF00]
        whitespace-nowrap opacity-0 invisible 
        group-hover:opacity-100 group-hover:visible 
        transition-all duration-100 z-50
      `}
      >
        {content}
      </div>
    </div>
  );
};

// ============================================
// NEO-BRUTALISM SKELETON COMPONENT
// ============================================
interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  variant = "text",
  width,
  height,
}) => {
  return (
    <div
      className={`
        skeleton border-3 border-black
        ${className}
      `}
      style={{
        width: width ?? "100%",
        height: height ?? (variant === "text" ? "1.5rem" : undefined),
      }}
    />
  );
};

// ============================================
// NEO-BRUTALISM DIVIDER COMPONENT
// ============================================
interface DividerProps {
  className?: string;
  vertical?: boolean;
}

export const Divider: React.FC<DividerProps> = ({
  className = "",
  vertical = false,
}) => {
  return (
    <div
      className={`
        ${vertical ? "w-1 h-full bg-black" : "h-1 w-full bg-black"} 
        ${className}
      `}
    />
  );
};

// ============================================
// NEO-BRUTALISM EMPTY STATE COMPONENT
// ============================================
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="mb-6 p-6 bg-[#FFFF00] border-4 border-black shadow-[6px_6px_0px_#000]">
          {icon}
        </div>
      )}
      <h3 className="text-2xl font-black text-black mb-2 uppercase">{title}</h3>
      {description && (
        <p className="text-base font-semibold text-black mb-6 max-w-sm">
          {description}
        </p>
      )}
      {action}
    </div>
  );
};

// ============================================
// NEO-BRUTALISM SWITCH COMPONENT
// ============================================
interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
}) => {
  return (
    <label
      className={`inline-flex items-center gap-3 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative inline-flex h-8 w-14 items-center 
          border-4 border-black transition-colors duration-100
          ${checked ? "bg-[#CCFF00]" : "bg-white"}
        `}
      >
        <span
          className={`
            inline-block h-5 w-5 bg-black
            transition-transform duration-100
            ${checked ? "translate-x-7" : "translate-x-1"}
          `}
        />
      </button>
      {label && (
        <span className="text-sm font-bold text-black uppercase">{label}</span>
      )}
    </label>
  );
};

// ============================================
// NEO-BRUTALISM SLIDER COMPONENT
// ============================================
interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  showValue = true,
}) => {
  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-3">
          {label && (
            <label className="text-sm font-black text-black uppercase">
              {label}
            </label>
          )}
          {showValue && (
            <span className="px-3 py-1 bg-[#FFFF00] border-3 border-black font-black text-sm">
              {value}
            </span>
          )}
        </div>
      )}
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  );
};
