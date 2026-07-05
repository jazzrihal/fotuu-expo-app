/**
 * Integration tests for sync-manager.ts.
 * Supabase, createPost, startUpload, and post-db are mocked.
 * The sync state machine (mutex, backoff, max attempts, listeners) is exercised.
 */

// ---------------------------------------------------------------------------
// Module mocks must be at the top (hoisted by jest)
// ---------------------------------------------------------------------------
jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
  },
}));

jest.mock('@/lib/posts', () => ({
  createPost: jest.fn(),
}));

// Mock for the native background-upload module
// Path is relative from this test file to the project-root modules/ directory
jest.mock('../../../modules/background-upload/src', () => ({
  startUpload: jest.fn(),
}));

jest.mock('@/lib/post-db', () => ({
  getDb: jest.fn(),
  getDueOutboxEntries: jest.fn(),
  updateLocalPostStatus: jest.fn(),
  updateOutboxEntry: jest.fn(),
  deleteOutboxEntry: jest.fn(),
}));

jest.mock('@/lib/post-manager', () => ({
  markSynced: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------
import { supabase } from '@/lib/supabase';
import { createPost } from '@/lib/posts';
import { startUpload } from '../../../modules/background-upload/src';
import * as PostDb from '@/lib/post-db';
import { markSynced } from '@/lib/post-manager';
import { runSync, addSyncListener } from '../sync-manager';

// ---------------------------------------------------------------------------
// Typed mocks
// ---------------------------------------------------------------------------
const mockGetDb = PostDb.getDb as jest.Mock;
const mockGetDue = PostDb.getDueOutboxEntries as jest.Mock;
const mockUpdateStatus = PostDb.updateLocalPostStatus as jest.Mock;
const mockUpdateOutbox = PostDb.updateOutboxEntry as jest.Mock;
const mockDeleteOutbox = PostDb.deleteOutboxEntry as jest.Mock;
const mockMarkSynced = markSynced as jest.Mock;
const mockCreatePost = createPost as jest.Mock;
const mockStartUpload = startUpload as jest.Mock;
const mockStorageFrom = supabase.storage.from as jest.Mock;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const POST = {
  id: 'post-1',
  user_id: 'user-a',
  local_image_uri: 'file:///local/img.jpg',
  captured_at: '2024-01-01T12:00:00Z',
  caption: null,
  privacy_scope: 'friends_only',
  latitude: null,
  longitude: null,
  status: 'queued',
};

const OUTBOX_ENTRY = {
  id: 'entry-1',
  local_post_id: 'post-1',
  idempotency_key: 'post-1',
  attempt_count: 0,
  next_attempt_at: Date.now() - 1000,
  last_error: null,
  created_at: Date.now() - 5000,
};

const SIGNED_DATA = {
  signedUrl: 'https://storage.example.com/signed',
  token: 'tok-abc',
  path: 'user-a/post-1.jpg',
};

// ---------------------------------------------------------------------------
// Helper: set up the "happy path" mock chain
// ---------------------------------------------------------------------------
function setupHappyPath(dbStub: { getFirstAsync: jest.Mock }) {
  mockGetDb.mockResolvedValue(dbStub);
  mockGetDue.mockResolvedValue([OUTBOX_ENTRY]);
  mockUpdateStatus.mockResolvedValue(undefined);
  mockUpdateOutbox.mockResolvedValue(undefined);
  mockDeleteOutbox.mockResolvedValue(undefined);

  const createSignedUploadUrl = jest.fn().mockResolvedValue({ data: SIGNED_DATA, error: null });
  mockStorageFrom.mockReturnValue({ createSignedUploadUrl, upload: jest.fn().mockResolvedValue({ error: null }) });

  mockStartUpload.mockResolvedValue(undefined);
  mockCreatePost.mockResolvedValue({ data: { id: 'remote-1' }, error: null });
  mockMarkSynced.mockResolvedValue({ error: null });

  return { createSignedUploadUrl };
}

function makeDbStub(post: typeof POST | null = POST) {
  return {
    getFirstAsync: jest.fn().mockResolvedValue(post),
  };
}

// ---------------------------------------------------------------------------
// Reset sync mutex between tests by re-importing the module
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
  // Reset running flag: jest.isolateModules won't work easily here since we
  // imported runSync at the top. Instead we rely on each test awaiting runSync
  // completion before the next test starts (sequential test runner).
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('sync-manager', () => {
  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------
  it('uploads via native module, creates remote post, calls markSynced', async () => {
    const dbStub = makeDbStub();
    setupHappyPath(dbStub);

    await runSync();

    expect(mockStartUpload).toHaveBeenCalledWith(
      POST.local_image_uri,
      SIGNED_DATA.signedUrl,
      SIGNED_DATA.token,
      'image/jpeg',
    );
    expect(mockCreatePost).toHaveBeenCalledWith(
      expect.objectContaining({ storagePath: SIGNED_DATA.path }),
    );
    expect(mockMarkSynced).toHaveBeenCalledWith('post-1', 'remote-1', SIGNED_DATA.path);
  });

  // -------------------------------------------------------------------------
  // Native module unavailable – JS fallback
  // -------------------------------------------------------------------------
  it('falls back to jsUploadFallback when startUpload throws', async () => {
    const dbStub = makeDbStub();
    const { createSignedUploadUrl } = setupHappyPath(dbStub);

    // startUpload throws → JS XHR fallback path runs.
    // The fallback uses supabase.storage.from().upload().
    mockStartUpload.mockRejectedValue(new Error('native unavailable'));

    // jsUploadFallback uses XMLHttpRequest; stub it so it "succeeds"
    const xhrMock = {
      responseType: '',
      onload: null as ((this: XMLHttpRequest, ev: ProgressEvent) => void) | null,
      onerror: null as ((this: XMLHttpRequest, ev: ProgressEvent) => void) | null,
      open: jest.fn(),
      send: jest.fn().mockImplementation(function (this: typeof xhrMock) {
        // Simulate XHR response
        if (typeof this.onload === 'function') {
          Object.defineProperty(this, 'response', { value: new ArrayBuffer(8) });
          (this.onload as Function).call(this, {});
        }
      }),
    };
    (globalThis as Record<string, unknown>).XMLHttpRequest = jest.fn(() => xhrMock) as unknown as typeof XMLHttpRequest;

    const uploadMock = jest.fn().mockResolvedValue({ error: null });
    mockStorageFrom.mockReturnValue({ createSignedUploadUrl, upload: uploadMock });

    await runSync();

    expect(uploadMock).toHaveBeenCalled();
    expect(mockMarkSynced).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Upload failure + backoff
  // -------------------------------------------------------------------------
  it('increments attempt_count and schedules backoff on createSignedUploadUrl failure', async () => {
    const dbStub = makeDbStub();
    mockGetDb.mockResolvedValue(dbStub);
    mockGetDue.mockResolvedValue([OUTBOX_ENTRY]);
    mockUpdateStatus.mockResolvedValue(undefined);
    mockUpdateOutbox.mockResolvedValue(undefined);

    const createSignedUploadUrl = jest.fn().mockResolvedValue({ data: null, error: { message: 'auth failed' } });
    mockStorageFrom.mockReturnValue({ createSignedUploadUrl });

    await runSync();

    expect(mockUpdateOutbox).toHaveBeenCalledWith(
      dbStub,
      'entry-1',
      expect.objectContaining({
        attempt_count: 1,
        last_error: expect.stringContaining('auth failed'),
      }),
    );
    // Status should remain queued (not failed yet – attempt 1 of 6)
    const lastStatusCall = mockUpdateStatus.mock.calls[mockUpdateStatus.mock.calls.length - 1];
    expect(lastStatusCall[2]).toBe('queued');
  });

  // -------------------------------------------------------------------------
  // Max attempts exceeded
  // -------------------------------------------------------------------------
  it('transitions post to failed after MAX_ATTEMPTS (6) failures', async () => {
    const exhaustedEntry = { ...OUTBOX_ENTRY, attempt_count: 5 };
    const dbStub = makeDbStub();
    mockGetDb.mockResolvedValue(dbStub);
    mockGetDue.mockResolvedValue([exhaustedEntry]);
    mockUpdateStatus.mockResolvedValue(undefined);
    mockUpdateOutbox.mockResolvedValue(undefined);

    const createSignedUploadUrl = jest.fn().mockResolvedValue({ data: null, error: { message: 'network timeout' } });
    mockStorageFrom.mockReturnValue({ createSignedUploadUrl });

    await runSync();

    const lastStatusCall = mockUpdateStatus.mock.calls[mockUpdateStatus.mock.calls.length - 1];
    expect(lastStatusCall[2]).toBe('failed');
  });

  // -------------------------------------------------------------------------
  // Mutex: concurrent runSync returns immediately
  // -------------------------------------------------------------------------
  it('ignores a second concurrent runSync call (mutex)', async () => {
    const dbStub = makeDbStub();

    // Make getDb block briefly so we can fire the second call while running
    let resolveDb!: (v: typeof dbStub) => void;
    const dbPromise = new Promise<typeof dbStub>((res) => { resolveDb = res; });
    mockGetDb.mockReturnValue(dbPromise);
    mockGetDue.mockResolvedValue([]);

    const first = runSync();
    const second = runSync(); // should return immediately (mutex)

    resolveDb(dbStub);
    await Promise.all([first, second]);

    // getDb called only once (second call bailed out before reaching getDb)
    expect(mockGetDb).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Stale entry: local_post no longer exists
  // -------------------------------------------------------------------------
  it('cleans up outbox entry when local_post has been deleted', async () => {
    const dbStub = makeDbStub(null); // getFirstAsync returns null (deleted post)
    mockGetDb.mockResolvedValue(dbStub);
    mockGetDue.mockResolvedValue([OUTBOX_ENTRY]);
    mockDeleteOutbox.mockResolvedValue(undefined);

    await runSync();

    expect(mockDeleteOutbox).toHaveBeenCalledWith(dbStub, 'entry-1');
    expect(mockStartUpload).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Already synced guard
  // -------------------------------------------------------------------------
  it('deletes outbox entry and skips upload when post status is synced', async () => {
    const dbStub = makeDbStub({ ...POST, status: 'synced' });
    mockGetDb.mockResolvedValue(dbStub);
    mockGetDue.mockResolvedValue([OUTBOX_ENTRY]);
    mockDeleteOutbox.mockResolvedValue(undefined);

    await runSync();

    expect(mockDeleteOutbox).toHaveBeenCalledWith(dbStub, 'entry-1');
    expect(mockStartUpload).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Listener notification
  // -------------------------------------------------------------------------
  it('fires addSyncListener callback after status transitions', async () => {
    const dbStub = makeDbStub();
    setupHappyPath(dbStub);

    const listener = jest.fn();
    const remove = addSyncListener(listener);

    await runSync();

    expect(listener).toHaveBeenCalled();

    remove();
  });
});

export {};
