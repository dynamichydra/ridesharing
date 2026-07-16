import type { ColumnDef } from "@tanstack/react-table";

// Reusable row-selection checkbox column — DataTable already supports controlled
// rowSelection/onRowSelectionChange, this is just the UI cell nobody had wired up yet.
export function getSelectionColumn<TData>(): ColumnDef<TData, any> {
  return {
    id: "select",
    size: 36,
    minSize: 36,
    maxSize: 36,
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        ref={(el) => {
          if (el) el.indeterminate = table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected();
        }}
        onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
        onClick={(e) => e.stopPropagation()}
        className="h-4 w-4 rounded border-border cursor-pointer"
        aria-label="Select all rows on this page"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onChange={(e) => row.toggleSelected(e.target.checked)}
        onClick={(e) => e.stopPropagation()}
        className="h-4 w-4 rounded border-border cursor-pointer"
        aria-label="Select row"
      />
    ),
  };
}
