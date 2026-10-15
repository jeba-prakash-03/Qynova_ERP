import React from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Loader } from './Loader';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  page?: number;
  totalPages?: number;
  totalRecords?: number;
  onPageChange?: (page: number) => void;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  keyExtractor: (row: T) => string | number;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no entries to display matching the criteria.',
  emptyAction,
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  filters,
  actions,
  page = 1,
  totalPages = 1,
  totalRecords,
  onPageChange,
  sortField,
  sortOrder,
  onSort,
  keyExtractor,
}: DataTableProps<T>) {
  return (
    <div className="bg-[#e2e8dc] rounded-[26px] border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.28),-6px_-7px_18px_rgba(255,255,255,0.78)] overflow-hidden flex flex-col w-full min-w-0">
      {/* Table Toolbar */}
      {(onSearchChange || filters || actions) && (
        <div className="p-4 border-b border-[rgba(76,91,70,0.12)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#dbe2d5]/60">
          <div className="flex flex-1 items-center gap-3 flex-wrap">
            {onSearchChange && (
              <div className="relative min-w-[240px] max-w-sm flex-1">
                <Search className="w-4 h-4 text-[#6b7663] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchValue || ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-[#dbe2d5] border border-[rgba(76,91,70,0.18)] rounded-[16px] text-[#26301f] placeholder:text-[#6b7663] shadow-[inset_2px_3px_6px_rgba(104,118,100,0.22),inset_-2px_-2px_4px_rgba(255,255,255,0.65)] focus:outline-none focus:ring-2 focus:ring-[#14776b] focus:border-[#14776b] transition"
                />
              </div>
            )}
            {filters}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto min-h-[280px] relative">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <div className="h-8 w-full clay-skeleton" />
            {Array.from({ length: 5 }).map((_, rIdx) => (
              <div key={rIdx} className="flex gap-3">
                {columns.map((_, cIdx) => (
                  <div key={cIdx} className="h-9 flex-1 clay-skeleton" />
                ))}
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="py-12">
            <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
          </div>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm text-[#26301f] border-collapse">
            <thead className="sticky top-0 z-10 bg-[#dbe2d5]/95 backdrop-blur-xs border-b border-[rgba(76,91,70,0.14)] text-xs uppercase font-bold text-[#6b7663] tracking-wider shadow-[inset_0_-1px_3px_rgba(104,118,100,0.08)]">
              <tr>
                {columns.map((col, index) => {
                  const isSorted = sortField && col.accessorKey === sortField;
                  return (
                    <th
                      key={index}
                      scope="col"
                      className={`px-5 py-3.5 ${col.className || ''} ${
                        col.sortable && onSort ? 'cursor-pointer select-none hover:bg-[#dbe2d5] transition-colors' : ''
                      }`}
                      onClick={() => {
                        if (col.sortable && onSort && col.accessorKey) {
                          onSort(String(col.accessorKey));
                        }
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.header}</span>
                        {col.sortable && onSort && (
                          <span className="text-[#6b7663]">
                            {isSorted ? (
                              sortOrder === 'asc' ? (
                                <ChevronUp className="w-3.5 h-3.5 text-[#14776b]" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-[#14776b]" />
                              )
                            ) : (
                              <ChevronsUpDown className="w-3.5 h-3.5 text-[#8e9c85] hover:text-[#26301f]" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(76,91,70,0.10)]">
              {data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className="hover:bg-[#dbe2d5]/60 transition-colors duration-150"
                >
                  {columns.map((col, cIndex) => (
                    <td key={cIndex} className={`px-5 py-3.5 ${col.className || ''}`}>
                      {col.cell
                        ? col.cell(row)
                        : col.accessorKey
                        ? (row[col.accessorKey] as any)
                        : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && onPageChange && (
        <div className="px-5 py-3.5 border-t border-[rgba(76,91,70,0.12)] flex items-center justify-between bg-[#dbe2d5]/50 text-xs text-[#6b7663]">
          <div>
            Showing page <span className="font-bold text-[#26301f]">{page}</span> of{' '}
            <span className="font-bold text-[#26301f]">{totalPages}</span>
            {totalRecords !== undefined && (
              <>
                {' '}
                (<span className="font-bold text-[#26301f]">{totalRecords}</span> total records)
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
              className="p-1.5 rounded-full border border-[rgba(76,91,70,0.16)] bg-[#e2e8dc] hover:bg-[#dbe2d5] text-[#26301f] shadow-[2px_3px_8px_rgba(88,104,84,0.2),-2px_-2px_6px_rgba(255,255,255,0.8)] disabled:opacity-40 disabled:pointer-events-none transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
              className="p-1.5 rounded-full border border-[rgba(76,91,70,0.16)] bg-[#e2e8dc] hover:bg-[#dbe2d5] text-[#26301f] shadow-[2px_3px_8px_rgba(88,104,84,0.2),-2px_-2px_6px_rgba(255,255,255,0.8)] disabled:opacity-40 disabled:pointer-events-none transition"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
