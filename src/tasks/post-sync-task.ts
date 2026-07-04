import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { runSync } from '@/lib/sync-manager';

export const POST_SYNC_TASK = 'fotuu-post-sync';

TaskManager.defineTask(POST_SYNC_TASK, async () => {
  try {
    await runSync();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerPostSyncTask(): Promise<void> {
  try {
    await BackgroundTask.registerTaskAsync(POST_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes in seconds
    });
  } catch {
    // Silently ignore if already registered or unavailable (e.g. simulator)
  }
}

export async function unregisterPostSyncTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(POST_SYNC_TASK);
    if (isRegistered) {
      await BackgroundTask.unregisterTaskAsync(POST_SYNC_TASK);
    }
  } catch {
    // Ignore
  }
}
