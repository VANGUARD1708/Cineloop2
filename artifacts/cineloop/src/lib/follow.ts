export async function followUser(userId: string) {
  await fetch(`/api/users/${userId}/follow`, {
    method: "POST",
  });
}

export async function unfollowUser(userId: string) {
  await fetch(`/api/users/${userId}/unfollow`, {
    method: "POST",
  });
}

export async function getFollowStatus(userId: string) {
  const res = await fetch(`/api/users/${userId}/follow-status`);
  return res.json();
}