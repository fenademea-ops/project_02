import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 6,
  onPageChange,
  className = '',
}) {
  if (totalPages <= 1 && totalItems === 0) return null;

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 ${className}`}
    >
      <div className="text-sm text-slate-500">
        Showing <span className="font-semibold text-slate-800">{startItem}</span> to{' '}
        <span className="font-semibold text-slate-800">{endItem}</span> of{' '}
        <span className="font-semibold text-slate-800">{totalItems}</span> results
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="inline-flex items-center px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-[44px] min-w-[44px] justify-center"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </button>

        <span className="px-3 py-2 text-sm text-slate-700 font-medium">
          Page {currentPage} of {totalPages || 1}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="inline-flex items-center px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-[44px] min-w-[44px] justify-center"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </nav>
  );
}
