'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TablePaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize?: number;
  itemName?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

export function TablePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  itemName = 'items',
  onPageChange,
  onPageSizeChange,
  className,
}: TablePaginationProps) {
  if (totalItems === 0) {
    return null;
  }

  const effectivePageSize = pageSize || 10;
  const startItem = totalItems === 0 ? 0 : (page - 1) * effectivePageSize + 1;
  const endItem = Math.min(page * effectivePageSize, totalItems);

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 text-xs text-muted-foreground border-t border-border/50',
        className,
      )}
    >
      <div className="flex items-center gap-2 tabular-nums">
        <span>
          Showing <strong className="text-foreground font-semibold">{startItem}–{endItem}</strong> of{' '}
          <strong className="text-foreground font-semibold">{totalItems}</strong> {itemName}
        </span>
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-muted-foreground/80">• Per page:</span>
            <select
              value={effectivePageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded border border-border bg-surface-high px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="mr-2 tabular-nums text-muted-foreground font-medium">
          Page {page} of {Math.max(1, totalPages)}
        </span>

        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-high text-foreground hover:bg-surface-bright disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="First page"
        >
          <ChevronsLeft size={13} />
        </button>

        {/* Prev Page */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-high text-foreground hover:bg-surface-bright disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Previous page"
        >
          <ChevronLeft size={13} />
        </button>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-high text-foreground hover:bg-surface-bright disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Next page"
        >
          <ChevronRight size={13} />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-high text-foreground hover:bg-surface-bright disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Last page"
        >
          <ChevronsRight size={13} />
        </button>
      </div>
    </div>
  );
}
