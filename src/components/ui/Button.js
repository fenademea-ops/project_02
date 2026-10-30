/**
 * Reusable Accessible Button Component
 */

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  className = '',
  onClick,
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 min-h-[44px]';

  const variants = {
    primary:
      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs focus-visible:outline-emerald-600 active:bg-emerald-800',
    secondary:
      'bg-slate-800 hover:bg-slate-900 text-white shadow-xs focus-visible:outline-slate-800 active:bg-black',
    amber:
      'bg-amber-600 hover:bg-amber-700 text-white shadow-xs focus-visible:outline-amber-600 active:bg-amber-800',
    outline:
      'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs focus-visible:outline-emerald-600 active:bg-slate-100',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus-visible:outline-rose-600 active:bg-rose-800',
    ghost:
      'text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-slate-500',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 min-h-[36px]',
    md: 'text-sm px-4 py-2 min-h-[44px]',
    lg: 'text-base px-6 py-3 min-h-[48px]',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          ></path>
        </svg>
      )}
      {children}
    </button>
  );
}
