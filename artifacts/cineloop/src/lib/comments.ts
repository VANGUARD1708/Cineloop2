export interface Comment {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  content: string;
  createdAt: string;
}

export async function getComments(postId: string) {
  const res = await fetch(`/api/posts/${postId}/comments`);
  return res.json();
}

export async function createComment(
  postId: string,
  content: string
) {
  await fetch(`/api/posts/${postId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });
}