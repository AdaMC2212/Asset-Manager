import { AsyncLocalStorage } from 'node:async_hooks';

// Shared by every action in this Node process, including nested rule updates.
const state = globalThis as typeof globalThis & {
  assetManagerLocks?: Map<string, Promise<void>>;
  assetManagerLockContext?: AsyncLocalStorage<string>;
};
const locks = state.assetManagerLocks ??= new Map();
const context = state.assetManagerLockContext ??= new AsyncLocalStorage<string>();

export async function withSpreadsheetLock<T>(spreadsheetId: string, operation: () => Promise<T>): Promise<T> {
  if (context.getStore() === spreadsheetId) return operation();
  const previous = locks.get(spreadsheetId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  locks.set(spreadsheetId, current);
  await previous;
  try {
    return await context.run(spreadsheetId, operation);
  } finally {
    release();
    if (locks.get(spreadsheetId) === current) locks.delete(spreadsheetId);
  }
}
