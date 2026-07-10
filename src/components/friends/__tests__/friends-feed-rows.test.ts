import { chunkFriendsFeedPosts } from '@/components/friends/friends-feed-rows';

describe('chunkFriendsFeedPosts', () => {
  it('returns no rows for an empty list', () => {
    expect(chunkFriendsFeedPosts([])).toEqual([]);
  });

  it('keeps exactly three posts in one row', () => {
    expect(chunkFriendsFeedPosts(['one', 'two', 'three'])).toEqual([
      ['one', 'two', 'three'],
    ]);
  });

  it('splits overflow posts into rows of at most three', () => {
    expect(chunkFriendsFeedPosts([1, 2, 3, 4, 5, 6])).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ]);
  });

  it('preserves order in an incomplete final row', () => {
    expect(chunkFriendsFeedPosts([1, 2, 3, 4, 5, 6, 7])).toEqual([
      [1, 2, 3],
      [4, 5, 6],
      [7],
    ]);
  });
});
