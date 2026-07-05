/**
 * Unit tests for post-manager.ts.
 * FileSystem and post-db are mocked; getDb returns a controllable stub.
 */

import * as FileSystem from 'expo-file-system/legacy';
import {
  saveLocalPost,
  queuePostForUpload,
  getLocalPosts,
  markSynced,
  deleteLocalPost,
} from '../post-manager';

// ---------------------------------------------------------------------------
// Mock post-db so we control DB behaviour per test
// ---------------------------------------------------------------------------
jest.mock('../post-db', () => ({
  getDb: jest.fn(),
  insertLocalPost: jest.fn(),
  insertOutboxEntry: jest.fn(),
  updateLocalPostStatus: jest.fn(),
  getLocalPostsByUser: jest.fn(),
  deleteOutboxEntry: jest.fn(),
  deleteLocalPostRow: jest.fn(),
}));

import * as PostDb from '../post-db';

// ---------------------------------------------------------------------------
// Typed mocks
// ---------------------------------------------------------------------------
const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;
const mockPostDb = PostDb as jest.Mocked<typeof PostDb>;

// Minimal stub DB returned by getDb
function makeDbStub(imageUri = 'file:///documents/local-posts/img.jpg') {
  return {
    getFirstAsync: jest.fn(async () => ({ local_image_uri: imageUri })),
  };
}

// ---------------------------------------------------------------------------
// Shared input
// ---------------------------------------------------------------------------
const INPUT = {
  userId: 'user-a',
  localImageUri: 'file:///camera/photo.jpg',
  capturedAt: '2024-01-01T12:00:00Z',
  caption: 'hello',
  privacyScope: 'friends_only',
} as const;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('post-manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // saveLocalPost
  // -------------------------------------------------------------------------
  describe('saveLocalPost', () => {
    it('copies image, inserts row, returns localPost with status local', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: false, isDirectory: false, uri: '' });
      mockFileSystem.makeDirectoryAsync.mockResolvedValue(undefined);
      mockFileSystem.copyAsync.mockResolvedValue(undefined);
      const dbStub = makeDbStub();
      (mockPostDb.getDb as jest.Mock).mockResolvedValue(dbStub);
      (mockPostDb.insertLocalPost as jest.Mock).mockResolvedValue(undefined);

      const result = await saveLocalPost(INPUT);

      expect(result.error).toBeNull();
      expect(result.localPost).not.toBeNull();
      expect(result.localPost!.status).toBe('local');
      expect(result.localPost!.user_id).toBe('user-a');
      expect(mockFileSystem.copyAsync).toHaveBeenCalledTimes(1);
      expect(mockPostDb.insertLocalPost).toHaveBeenCalledTimes(1);
    });

    it('returns error when FileSystem.copyAsync throws', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true, isDirectory: false, uri: '', size: 0, modificationTime: 0, md5: undefined });
      mockFileSystem.copyAsync.mockRejectedValue(new Error('disk full'));
      const dbStub = makeDbStub();
      (mockPostDb.getDb as jest.Mock).mockResolvedValue(dbStub);

      const result = await saveLocalPost(INPUT);

      expect(result.localPost).toBeNull();
      expect(result.error).toBe('disk full');
    });
  });

  // -------------------------------------------------------------------------
  // queuePostForUpload
  // -------------------------------------------------------------------------
  describe('queuePostForUpload', () => {
    it('inserts outbox entry and transitions status to queued', async () => {
      const dbStub = makeDbStub();
      (mockPostDb.getDb as jest.Mock).mockResolvedValue(dbStub);
      (mockPostDb.insertOutboxEntry as jest.Mock).mockResolvedValue(undefined);
      (mockPostDb.updateLocalPostStatus as jest.Mock).mockResolvedValue(undefined);

      const result = await queuePostForUpload('post-1');

      expect(result.error).toBeNull();
      expect(mockPostDb.insertOutboxEntry).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          local_post_id: 'post-1',
          idempotency_key: 'post-1',
          attempt_count: 0,
        }),
      );
      expect(mockPostDb.updateLocalPostStatus).toHaveBeenCalledWith(
        expect.anything(),
        'post-1',
        'queued',
      );
    });

    it('second call with same localPostId is a no-op (idempotency_key dedup)', async () => {
      // The second insertOutboxEntry silently ignores duplicate keys (INSERT OR IGNORE).
      // queuePostForUpload delegates to post-db which handles dedup; both calls succeed.
      const dbStub = makeDbStub();
      (mockPostDb.getDb as jest.Mock).mockResolvedValue(dbStub);
      (mockPostDb.insertOutboxEntry as jest.Mock).mockResolvedValue(undefined);
      (mockPostDb.updateLocalPostStatus as jest.Mock).mockResolvedValue(undefined);

      const r1 = await queuePostForUpload('post-1');
      const r2 = await queuePostForUpload('post-1');

      expect(r1.error).toBeNull();
      expect(r2.error).toBeNull();
      expect(mockPostDb.insertOutboxEntry).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  // getLocalPosts
  // -------------------------------------------------------------------------
  describe('getLocalPosts', () => {
    it('delegates to getLocalPostsByUser', async () => {
      const posts = [{ id: 'post-1', user_id: 'user-a', status: 'local' }];
      const dbStub = makeDbStub();
      (mockPostDb.getDb as jest.Mock).mockResolvedValue(dbStub);
      (mockPostDb.getLocalPostsByUser as jest.Mock).mockResolvedValue(posts);

      const result = await getLocalPosts('user-a');

      expect(result).toEqual(posts);
      expect(mockPostDb.getLocalPostsByUser).toHaveBeenCalledWith(dbStub, 'user-a');
    });
  });

  // -------------------------------------------------------------------------
  // markSynced
  // -------------------------------------------------------------------------
  describe('markSynced', () => {
    it('updates status, deletes outbox entry, deletes local image file', async () => {
      const imageUri = 'file:///documents/local-posts/img.jpg';
      const dbStub = makeDbStub(imageUri);
      (mockPostDb.getDb as jest.Mock).mockResolvedValue(dbStub);
      (mockPostDb.updateLocalPostStatus as jest.Mock).mockResolvedValue(undefined);
      (mockPostDb.deleteOutboxEntry as jest.Mock).mockResolvedValue(undefined);
      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true, isDirectory: false, uri: imageUri, size: 100, modificationTime: 0 });
      mockFileSystem.deleteAsync.mockResolvedValue(undefined);

      const result = await markSynced('post-1', 'remote-1', 'user-a/post-1.jpg');

      expect(result.error).toBeNull();
      expect(mockPostDb.updateLocalPostStatus).toHaveBeenCalledWith(
        dbStub,
        'post-1',
        'synced',
        expect.objectContaining({ remote_post_id: 'remote-1' }),
      );
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(imageUri, { idempotent: true });
    });

    it('does not throw when image has already been deleted', async () => {
      const imageUri = 'file:///documents/local-posts/img.jpg';
      const dbStub = makeDbStub(imageUri);
      (mockPostDb.getDb as jest.Mock).mockResolvedValue(dbStub);
      (mockPostDb.updateLocalPostStatus as jest.Mock).mockResolvedValue(undefined);
      (mockPostDb.deleteOutboxEntry as jest.Mock).mockResolvedValue(undefined);
      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: false, isDirectory: false, uri: '' });

      const result = await markSynced('post-1', 'remote-1', 'user-a/post-1.jpg');

      expect(result.error).toBeNull();
      expect(mockFileSystem.deleteAsync).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // deleteLocalPost
  // -------------------------------------------------------------------------
  describe('deleteLocalPost', () => {
    it('deletes image file and DB row', async () => {
      const imageUri = 'file:///documents/local-posts/img.jpg';
      const dbStub = makeDbStub(imageUri);
      (mockPostDb.getDb as jest.Mock).mockResolvedValue(dbStub);
      (mockPostDb.deleteLocalPostRow as jest.Mock).mockResolvedValue(undefined);
      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true, isDirectory: false, uri: imageUri, size: 100, modificationTime: 0 });
      mockFileSystem.deleteAsync.mockResolvedValue(undefined);

      const result = await deleteLocalPost('post-1');

      expect(result.error).toBeNull();
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(imageUri, { idempotent: true });
      expect(mockPostDb.deleteLocalPostRow).toHaveBeenCalledWith(dbStub, 'post-1');
    });

    it('does not throw when post does not exist', async () => {
      const dbStub = { getFirstAsync: jest.fn(async () => null) };
      (mockPostDb.getDb as jest.Mock).mockResolvedValue(dbStub);
      (mockPostDb.deleteLocalPostRow as jest.Mock).mockResolvedValue(undefined);

      const result = await deleteLocalPost('no-such-post');

      expect(result.error).toBeNull();
      expect(mockFileSystem.deleteAsync).not.toHaveBeenCalled();
    });
  });
});

export {};
