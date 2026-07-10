const FRIENDS_FEED_POSTS_PER_ROW = 3;

export function chunkFriendsFeedPosts<T>(posts: readonly T[]): T[][] {
  const rows: T[][] = [];

  for (let index = 0; index < posts.length; index += FRIENDS_FEED_POSTS_PER_ROW) {
    rows.push(posts.slice(index, index + FRIENDS_FEED_POSTS_PER_ROW));
  }

  return rows;
}
