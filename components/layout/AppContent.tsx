'use client';

import React from 'react';

interface AppContentProps {
  children: React.ReactNode;
  headerSlot?: React.ReactNode;
  overview?: boolean;
}

export const AppContent: React.FC<AppContentProps> = ({ children, headerSlot, overview }) => {
  return (
    <main className={overview ? 'workspace-content overview-content' : 'workspace-content'}>
      {headerSlot ? <div className="mb-6">{headerSlot}</div> : null}
      <div className={overview ? undefined : 'space-y-8'}>{children}</div>
    </main>
  );
};
