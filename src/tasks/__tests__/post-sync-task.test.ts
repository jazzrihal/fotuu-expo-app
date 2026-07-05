/**
 * Unit tests for post-sync-task.ts.
 * Verifies that the TaskManager callback returns Success on a clean sync
 * and Failed when runSync throws.
 */

// ---------------------------------------------------------------------------
// Capture the TaskManager.defineTask callback so we can invoke it directly
// ---------------------------------------------------------------------------
let taskCallback: (() => Promise<unknown>) | null = null;

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn((_name: string, cb: () => Promise<unknown>) => {
    taskCallback = cb;
  }),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
}));

jest.mock('expo-background-task', () => ({
  BackgroundTaskResult: {
    Success: 'success',
    Failed: 'failed',
  },
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/sync-manager', () => ({
  runSync: jest.fn(),
}));

// Importing the module triggers defineTask, capturing the callback
import * as BackgroundTask from 'expo-background-task';
import { runSync } from '@/lib/sync-manager';

const mockRunSync = runSync as jest.Mock;

// Force the module to load and register the task
beforeAll(() => {
  require('../post-sync-task');
});

describe('post-sync-task', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns BackgroundTaskResult.Success when runSync resolves', async () => {
    mockRunSync.mockResolvedValue(undefined);

    const result = await taskCallback!();

    expect(mockRunSync).toHaveBeenCalledTimes(1);
    expect(result).toBe(BackgroundTask.BackgroundTaskResult.Success);
  });

  it('returns BackgroundTaskResult.Failed when runSync throws', async () => {
    mockRunSync.mockRejectedValue(new Error('sync error'));

    const result = await taskCallback!();

    expect(result).toBe(BackgroundTask.BackgroundTaskResult.Failed);
  });
});

export {};
