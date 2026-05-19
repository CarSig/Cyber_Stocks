import React from 'react';
import { Button } from '@/components/ui/button';

type PaginationProps = {
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
};

export default function Pagination({ page, setPage, totalPages }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="pagination">
      <Button variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
        ← Prev
      </Button>
      <span className="pagination-info">
        Page {page + 1} of {totalPages}
      </span>
      <Button variant="ghost" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
        Next →
      </Button>
    </div>
  );
}
