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
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      {(onSearchChange || filters || actions) && (
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/40">
          <div className="flex flex-1 items-center gap-3 flex-wrap">
            {onSearchChange && (
              <div className="relative min-w-[240px] max-w-sm flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchValue || ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
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
          <div className="py-20">
            <Loader text="Loading records..." />
          </div>
        ) : data.length === 0 ? (
          <div className="py-12">
            <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
          </div>
        ) : (
          <table className="w-full text-left text-sm text-slate-600 border-collapse">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-xs uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                {columns.map((col, index) => {
                  const isSorted = sortField && col.accessorKey === sortField;
                  return (
                    <th
                      key={index}
                      scope="col"
                      className={`px-5 py-3.5 ${col.className || ''} ${
                        col.sortable && onSort ? 'cursor-pointer select-none hover:bg-slate-100/60' : ''
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
                          <span className="text-slate-400">
                            {isSorted ? (
                              sortOrder === 'asc' ? (
                                <ChevronUp className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                              )
                            ) : (
                              <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className="hover:bg-slate-50/60 transition duration-150"
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
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 text-xs text-slate-500">
          <div>
            Showing page <span className="font-semibold text-slate-800">{page}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalPages}</span>
            {totalRecords !== undefined && (
              <>
                {' '}
                (<span className="font-semibold text-slate-800">{totalRecords}</span> total records)
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
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
