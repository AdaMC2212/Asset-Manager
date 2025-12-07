import React from 'react';

// This component is being phased out in favor of Tailwind direct styling for the new glass aesthetic,
// but kept for backward compatibility if any legacy components use it.
// It renders a basic container now.

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = "",
  spotlightColor,
  ...props
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/5 bg-slate-900/50 backdrop-blur-md ${className}`}
      {...props}
    >
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
};
