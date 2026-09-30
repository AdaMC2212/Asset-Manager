'use client';

import { createContext, useContext } from 'react';

const ReadOnlyContext = createContext(true);

export const WorkspaceModeProvider = ReadOnlyContext.Provider;
export const useReadOnly = () => useContext(ReadOnlyContext);
