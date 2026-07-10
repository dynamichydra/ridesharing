import React from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import type {
  ColumnDef,
  SortingState,
  RowSelectionState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import Paginator from "./paginator";
import { cn } from "@/lib/utils";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  pageIndex: number;
  onPageChange: (pageIndex: number) => void;
  onRowClick?: (row: TData) => void;
  pageCount: number;
  totalRecords?: number;
  fixedHeader?: boolean;
  needPagination?: boolean;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState | ((old: SortingState) => SortingState)) => void;
}

export function DataTable<TData>({
  columns,
  data,
  pageIndex,
  onPageChange,
  onRowClick,
  pageCount,
  totalRecords = 0,
  fixedHeader = false,
  needPagination = true,
  sorting = [],
  onSortingChange,
}: DataTableProps<TData>) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const table = useReactTable<TData>({
    data,
    columns,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: onSortingChange as any,
    onRowSelectionChange: setRowSelection,
    state: {
      pagination: {
        pageIndex,
        pageSize: 10,
      },
      sorting,
      rowSelection,
    },
    onPaginationChange: (updater) => {
      const newState =
        typeof updater === "function"
          ? updater({ pageIndex, pageSize: 10 })
          : updater;
      onPageChange(newState.pageIndex);
    },
  });

  return (
    <div className="flex flex-col space-y-4">
      <div className="overflow-hidden rounded-md border flex-1 flex flex-col min-h-0 bg-white">
        <div className="overflow-auto flex-1 relative">
          <Table
            containerClass={cn(fixedHeader && "h-full")}
            className="relative"
          >
            <TableHeader
              className={cn(
                "bg-muted/50",
                fixedHeader && "sticky top-0 z-20 shadow-sm backdrop-blur-3xl"
              )}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead 
                      key={header.id}
                      onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                      className={cn(header.column.getCanSort() && "cursor-pointer select-none")}
                    >
                      <div className="flex items-center gap-2 w-full">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        {{
                          asc: " 🔼",
                          desc: " 🔽",
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() => onRowClick?.(row.original)}
                    data-state={row.getIsSelected() && "selected"}
                    className={cn(onRowClick && "cursor-pointer")}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={{
                          maxWidth: cell.column.columnDef.size
                            ? cell.column.columnDef.size
                            : undefined,
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {needPagination && (
        <div className="flex items-center justify-between shrink-0 px-1 py-1">
          <div className="text-xs text-muted-foreground font-medium">
            Total {totalRecords || table.getFilteredRowModel().rows.length} record(s)
          </div>
          <Paginator
            currentPage={pageIndex + 1}
            totalPages={pageCount}
            onPageChange={(pageNumber: number) => onPageChange(pageNumber - 1)}
            showPreviousNext
          />
        </div>
      )}
    </div>
  );
}
