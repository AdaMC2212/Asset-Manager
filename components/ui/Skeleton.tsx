import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => {
  return (
    <div 
      className={`animate-pulse bg-slate-800/50 rounded-lg ${className}`}
      style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)', backgroundSize: '200% 100%' }}
    />
  );
};

export const CardSkeleton = () => (
  <div className="glass-card rounded-3xl p-6 h-32 space-y-4">
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-8 w-48" />
  </div>
);

export const TableSkeleton = () => (
  <div className="glass-card rounded-3xl overflow-hidden">
    <div className="p-6 border-b border-white/5">
      <Skeleton className="h-6 w-32" />
    </div>
    <div className="p-6 space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  </div>
);
