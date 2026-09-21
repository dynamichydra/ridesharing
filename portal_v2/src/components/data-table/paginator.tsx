import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";

import { generatePaginationLinks } from "./generate-pages";

type PaginatorProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (pageNumber: number) => void;
  showPreviousNext?: boolean;
};

export default function Paginator({
  currentPage,
  totalPages,
  onPageChange,
  showPreviousNext = true,
}: PaginatorProps) {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <Pagination className="mx-0 justify-end">
      <PaginationContent>
        {showPreviousNext && (
          <PaginationItem>
            <PaginationPrevious
              onClick={() => canGoPrevious && onPageChange(currentPage - 1)}
              disabled={!canGoPrevious}
            />
          </PaginationItem>
        )}

        {generatePaginationLinks({
          currentPage,
          totalPages,
          onPageChange,
        })}

        {showPreviousNext && (
          <PaginationItem>
            <PaginationNext
              onClick={() => canGoNext && onPageChange(currentPage + 1)}
              disabled={!canGoNext}
            />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  );
}
