// import React from "react";
// import {
//   PaginationEllipsis,
//   PaginationItem,
//   PaginationLink,
// } from "@/components/data-table/pagination";

// type GeneratePaginationLinksProps = {
//   currentPage: number;
//   totalPages: number;
//   onPageChange: (page: number) => void;
// };

// /**
//  * Generates pagination link components based on the current page and total pages.
//  * Includes logic for showing ellipses for large page sets.
//  */
// export const generatePaginationLinks = ({
//   currentPage,
//   totalPages,
//   onPageChange,
// }: GeneratePaginationLinksProps): React.ReactNode[] => {
//   const pages: React.ReactNode[] = [];

//   if (totalPages <= 6) {
//     // Show all pages if the count is small
//     for (let i = 1; i <= totalPages; i++) {
//       pages.push(
//         <PaginationItem key={`page-${i}`}>
//           <PaginationLink
//             onClick={() => onPageChange(i)}
//             isActive={i === currentPage}
//           >
//             {i}
//           </PaginationLink>
//         </PaginationItem>
//       );
//     }
//   } else {
//     // Show first two pages
//     for (let i = 1; i <= 3; i++) {
//       pages.push(
//         <PaginationItem key={`page-${i}`}>
//           <PaginationLink
//             onClick={() => onPageChange(i)}
//             isActive={i === currentPage}
//           >
//             {i}
//           </PaginationLink>
//         </PaginationItem>
//       );
//     }

//     // Show ellipsis and current page (if it's in the middle)
//     if (currentPage > 3 && currentPage < totalPages - 2) {
//       pages.push(<PaginationEllipsis key="start-ellipsis" />);
//       pages.push(
//         <PaginationItem key={`page-${currentPage}`}>
//           <PaginationLink onClick={() => onPageChange(currentPage)} isActive>
//             {currentPage}
//           </PaginationLink>
//         </PaginationItem>
//       );
//       pages.push(<PaginationEllipsis key="end-ellipsis" />);
//     } else {
//       // Show middle ellipsis if needed
//       pages.push(<PaginationEllipsis key="middle-ellipsis" />);
//     }

//     // Show last two pages
//     for (let i = totalPages - 1; i <= totalPages; i++) {
//       pages.push(
//         <PaginationItem key={`page-${i}`}>
//           <PaginationLink
//             onClick={() => onPageChange(i)}
//             isActive={i === currentPage}
//           >
//             {i}
//           </PaginationLink>
//         </PaginationItem>
//       );
//     }
//   }

//   return pages;
// };

import React from "react";
import {
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/data-table/pagination";

type GeneratePaginationLinksProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

/**
 * Generates pagination link components based on the current page and total pages.
 * Dynamically shows pages around the current page with ellipses for large page sets.
 */
export const generatePaginationLinks = ({
  currentPage,
  totalPages,
  onPageChange,
}: GeneratePaginationLinksProps): React.ReactNode[] => {
  const pages: React.ReactNode[] = [];
  const siblingCount = 1;

  const getPageNumbers = (): number[] => {
    const totalPageNumbers = siblingCount * 2 + 3;

    if (totalPages <= totalPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const showLeftEllipsis = leftSiblingIndex > 2;
    const showRightEllipsis = rightSiblingIndex < totalPages - 1;

    const leftRange = Array.from(
      { length: rightSiblingIndex - leftSiblingIndex + 1 },
      (_, i) => leftSiblingIndex + i
    );

    if (showLeftEllipsis && showRightEllipsis) {
      return [1, ...leftRange, totalPages];
    }

    if (!showLeftEllipsis) {
      const extendedRange = Array.from(
        { length: Math.min(totalPageNumbers - 1, totalPages - 1) },
        (_, i) => i + 1
      );
      return [...extendedRange, totalPages];
    }

    const extendedRange = Array.from(
      { length: Math.min(totalPageNumbers - 1, totalPages - 1) },
      (_, i) => totalPages - i
    ).reverse();
    return [1, ...extendedRange];
  };

  const pageNumbers = getPageNumbers();
  let prevPage = 0;

  pageNumbers.forEach((pageNum) => {
    if (pageNum - prevPage === 2) {
      pages.push(
        <PaginationItem key={`page-${prevPage + 1}`}>
          <PaginationLink
            onClick={() => onPageChange(prevPage + 1)}
            isActive={prevPage + 1 === currentPage}
          >
            {prevPage + 1}
          </PaginationLink>
        </PaginationItem>
      );
    } else if (pageNum - prevPage > 2) {
      pages.push(<PaginationEllipsis key={`ellipsis-${prevPage}`} />);
    }

    pages.push(
      <PaginationItem key={`page-${pageNum}`}>
        <PaginationLink
          onClick={() => onPageChange(pageNum)}
          isActive={pageNum === currentPage}
        >
          {pageNum}
        </PaginationLink>
      </PaginationItem>
    );

    prevPage = pageNum;
  });

  return pages;
};