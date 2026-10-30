import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

export default function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while processing this request.',
  onRetry,
  className = '',
}) {
  return (
    <div
      role="alert"
      className={`p-6 bg-rose-50 border border-rose-200 rounded-xl text-center flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-12 h-12 mb-3 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-rose-900 mb-1">{title}</h3>
      <p className="text-sm text-rose-700 max-w-md mb-4">{message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}
