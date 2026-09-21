import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

import type { ElementRef, HTMLAttributes, AnchorHTMLAttributes } from "react";

type PaginationProps = HTMLAttributes<HTMLElement>;

const Pagination = React.forwardRef<HTMLElement, PaginationProps>(
  ({ className, ...props }, ref) => (
    <nav
      ref={ref}
      role="navigation"
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
);
Pagination.displayName = "Pagination";

type PaginationContentProps = React.HTMLAttributes<HTMLUListElement>;

const PaginationContent = React.forwardRef<
  ElementRef<"ul">,
  PaginationContentProps
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
));
PaginationContent.displayName = "PaginationContent";

type PaginationItemProps = React.HTMLAttributes<HTMLLIElement>;

const PaginationItem = React.forwardRef<ElementRef<"li">, PaginationItemProps>(
  ({ className, ...props }, ref) => (
    <li
      ref={ref}
      className={cn("hover:cursor-pointer", className)}
      {...props}
    />
  )
);
PaginationItem.displayName = "PaginationItem";

interface PaginationLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  isActive?: boolean;
  size?: "default" | "icon" | "sm" | "lg";
  disabled?: boolean;
}

const PaginationLink = React.forwardRef<HTMLAnchorElement, PaginationLinkProps>(
  ({ className, isActive, size = "icon", disabled = false, ...props }, ref) => (
    <a
      ref={ref}
      aria-current={isActive ? "page" : undefined}
      role="link"
      aria-disabled={disabled}
      className={cn(
        buttonVariants({
          variant: isActive ? "default" : "ghost",
          size,
        }),
        disabled && "cursor-not-allowed pointer-events-none",
        className
      )}
      {...props}
    />
  )
);
PaginationLink.displayName = "PaginationLink";

type PaginationControlProps = Omit<PaginationLinkProps, "isActive" | "size">;

const PaginationPrevious = React.forwardRef<
  HTMLAnchorElement,
  PaginationControlProps
>(({ className, ...props }, ref) => (
  <PaginationLink
    ref={ref}
    aria-label="Go to previous page"
    size="default"
    className={cn("gap-1 pl-2.5", className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
));
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = React.forwardRef<
  HTMLAnchorElement,
  PaginationControlProps
>(({ className, ...props }, ref) => (
  <PaginationLink
    ref={ref}
    aria-label="Go to next page"
    size="default"
    className={cn("gap-1 pr-2.5", className)}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
));
PaginationNext.displayName = "PaginationNext";

const PaginationEllipsis = ({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
