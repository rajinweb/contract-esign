'use client';
import React from "react";

interface ButtonProps {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  inverted?: boolean;
  id?: string;
}
export function Button({
  title,
  onClick,
  id,
  disabled = false, 
}: ButtonProps) {
  return (
    <button
      id={id}
      className={`inline-flex mr-4 items-center px-4 py-1 text-sm rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed`}
      disabled={disabled}
      onClick={onClick}
    >
      {title}
    </button>
  );
}
