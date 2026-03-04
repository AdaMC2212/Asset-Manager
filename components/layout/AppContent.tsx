'use client';

import React from 'react';

interface AppContentProps {
  children: React.ReactNode;
  headerSlot?: React.ReactNode;
}

export const AppContent: React.FC<AppContentProps> = ({ children, headerSlot }) => {
  return (
    <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
      {headerSlot ? <div className="motion-rise mb-6">{headerSlot}</div> : null}
      <div className="motion-rise space-y-8">{children}</div>
    </main>
  );
};
