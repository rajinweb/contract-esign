'use client';
import React from "react";

interface ButtonProps {
  title?: string;
  label?: string; // Optional now
  onClick?: () => void;
  disabled?: boolean;
  inverted?: boolean;
  id?: string;
  className?: string;
  icon?: React.ReactNode;
  tabIndex?:number;
  style?: React.CSSProperties;
}

export function Button({
  title,
  label,
  onClick,
  id,
  disabled = false,
  inverted = false,
  className = "",
  icon,
  tabIndex,
  style
}: ButtonProps) {
  const isIconOnly = !label && !!icon;

  const baseClasses =
    "inline-flex items-center justify-center px-4 py-2 text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  const cursorClass = disabled ? "cursor-not-allowed" : "cursor-pointer";

  const variantClass = disabled
    ? "bg-gray-300 text-gray-500"
    : inverted
    ? "bg-white text-blue-600 border border-gray-300 hover:bg-blue-50 focus:ring-blue-500"
    : 'primary-button'
   // : "bg-blue-600 text-white hover:bg-blue-900 focus:ring-blue-500";

  const iconOnlyClass = isIconOnly ? "p-2 aspect-square w-9 h-9" : "";

  return (
    <button
      id={id}
      // type="button" todo: consider if needed
      className={`${baseClasses} ${variantClass} ${cursorClass} ${iconOnlyClass} ${className}  ${label ? "gap-2" : ""}`}
      disabled={disabled}
      onClick={onClick}
      title={title ?? label}
      aria-label={title ?? label ?? "Button"} // Accessibility support
      tabIndex={tabIndex}
      style={style}
    >
      {icon && <span>{icon}</span>}
      {label}
    </button>
  );
}
