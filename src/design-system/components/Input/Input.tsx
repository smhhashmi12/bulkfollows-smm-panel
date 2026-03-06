import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  hint,
  containerClassName = '',
  className = '',
  ...props
}) => (
  <label className={`block text-sm text-gray-300 ${containerClassName}`.trim()}>
    {label && <span className="block mb-2 font-semibold text-gray-200">{label}</span>}
    <input
      className={`w-full bg-black/30 border border-brand-border rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-brand-purple focus:outline-none ${className}`.trim()}
      {...props}
    />
    {hint && <span className="block mt-2 text-xs text-gray-500">{hint}</span>}
  </label>
);
