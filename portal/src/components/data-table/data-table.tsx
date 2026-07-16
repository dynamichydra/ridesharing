import React from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";

import type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import Paginator from "./paginator";
import { cn } from "@/lib/utils";
type DataTableProps<TData> = {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  pageIndex: number;
  pageSize?: number;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onRowClick?: (row: TData) => void;
  pageCount: number;
  fixedHeader?: boolean;
  needPagination?: boolean;
  isLoading?: boolean;
  isFetching?: boolean;
  isRowDisabled?: (row: TData) => boolean;
  getRowClassName?: (row: TData) => string;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (updater: any) => void;
};

export function DataTable<TData>({
  columns,
  data,
  pageIndex,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  pageCount,
  fixedHeader = false,
  needPagination = true,
  isLoading = false,
  isFetching = false,
  isRowDisabled,
  getRowClassName,
  rowSelection: controlledRowSelection,
  onRowSelectionChange: setControlledRowSelection,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [internalRowSelection, setInternalRowSelection] =
    React.useState<RowSelectionState>({});

  const rowSelection = controlledRowSelection ?? internalRowSelection;
  const onRowSelectionChange =
    setControlledRowSelection ?? setInternalRowSelection;

  const table = useReactTable<TData>({
    data,
    columns,
    manualPagination: true,
    pageCount,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange,
    getRowId: (row: any) => row.id,
    state: {
      pagination: {
        pageIndex,
        pageSize,
      },
      sorting,
      columnFilters,
      rowSelection,
    },
    onPaginationChange: (updater) => {
      const newState =
        typeof updater === "function"
          ? updater({ pageIndex, pageSize })
          : updater;
      onPageChange(newState.pageIndex);
    },
    defaultColumn: { size: undefined },
  });

  return (
    <div className="flex flex-col gap-0 border rounded-xl overflow-hidden bg-card shadow-sm relative">
      {/* Background Fetching Loader (Progress Bar) */}
      {isFetching && (
        <div className="absolute top-0 left-0 right-0 h-[2px] z-[2] bg-primary/20 overflow-hidden">
          <div
            className="h-full bg-primary animate-[loader-blink_1.5s_infinite_ease-in-out]"
            style={{
              width: "40%",
              position: "absolute",
            }}
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <Table
          containerClass={cn(
            "relative",
            fixedHeader && "max-h-[600px] overflow-y-auto",
          )}
        >
          <TableHeader
            className={cn(
              "bg-muted/60 border-b",
              fixedHeader && "sticky top-0 z-[1] backdrop-blur-md",
            )}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="hover:bg-transparent border-none"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 px-4"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading && !data.length ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-64 text-center"
                >
                  <div className="flex flex-col justify-center items-center py-12 text-muted-foreground bg-background/5 animate-pulse">
                    <div className="size-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-4" />
                    <p className="text-sm font-medium tracking-widest uppercase opacity-50">
                      Loading Data...
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const disabled = isRowDisabled?.(row.original);
                return (
                  <TableRow
                    key={row.id}
                    onClick={() => !disabled && onRowClick?.(row.original)}
                    className={cn(
                      "group transition-colors",
                      !disabled && "hover:bg-accent/40",
                      onRowClick && !disabled && "cursor-pointer",
                      isFetching && "opacity-60",
                      getRowClassName && getRowClassName(row.original),
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2.5 px-4 text-sm">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-medium">
                      No results found
                    </span>
                    <span className="text-xs opacity-60 uppercase tracking-widest">
                      Adjust filters to try again
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {needPagination && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-t">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
            {table.getFilteredSelectedRowModel().rows.length
              ? `${table.getFilteredSelectedRowModel().rows.length} SELECTED / `
              : null}
            <span>Showing</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                onPageSizeChange?.(Number(val));
              }}
            >
              <SelectTrigger className="h-7 w-[70px] text-[11px] bg-transparent border-muted-foreground/20 rounded-md">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((size) => (
                  <SelectItem
                    key={size}
                    value={String(size)}
                    className="text-[11px]"
                  >
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>
              {table.getFilteredRowModel().rows.length === 1
                ? "Result"
                : "Results"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Paginator
              currentPage={table.getState().pagination.pageIndex + 1}
              totalPages={pageCount}
              onPageChange={(pageNumber: number) =>
                onPageChange(pageNumber - 1)
              }
              showPreviousNext
            />
          </div>
        </div>
      )}
    </div>
  );
}
