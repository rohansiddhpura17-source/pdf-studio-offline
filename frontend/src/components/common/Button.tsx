import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  className,
  disabled,
  ...props
}) => {
  const baseStyles =
    'btn-shine inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-primary/60 focus-visible:ring-offset-2 select-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97]';

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-3.5 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-studio-primary text-white hover:bg-studio-primary-hover shadow-subtle focus:ring-studio-primary/40 active:scale-[0.98]',
    secondary:
      'bg-white text-studio-navy border border-studio-border hover:bg-slate-50 hover:border-studio-border-hover shadow-subtle focus:ring-studio-primary/30 active:scale-[0.98]',
    ghost:
      'bg-transparent text-studio-navy hover:bg-slate-100 hover:text-studio-primary focus:ring-slate-300',
    outline:
      'bg-transparent text-studio-primary border border-studio-primary hover:bg-studio-primary/10 focus:ring-studio-primary/30',
    danger:
      'bg-studio-danger text-white hover:bg-red-700 shadow-subtle focus:ring-red-400 active:scale-[0.98]',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
