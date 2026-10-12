import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton h-4 ${className}`} />;
}

export function StatCardSkeleton() {
  return (
    <div className="stat-card">
      <Skeleton className="w-24 h-3 mb-2" />
      <Skeleton className="w-16 h-7 mb-1" />
      <Skeleton className="w-32 h-3" />
    </div>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex justify-between mb-3">
        <Skeleton className="w-16 h-5" />
        <Skeleton className="w-20 h-5" />
      </div>
      <Skeleton className="w-3/4 h-5 mb-2" />
      <Skeleton className="w-full h-3 mb-1" />
      <Skeleton className="w-5/6 h-3 mb-4" />
      <div className="flex gap-4">
        <Skeleton className="w-20 h-3" />
        <Skeleton className="w-20 h-3" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="table-cell">
          <Skeleton className="w-full h-4" />
        </td>
      ))}
    </tr>
  );
}
