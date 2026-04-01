import { useEffect, useState } from "react";
import {
  followUser,
  unfollowUser,
  getFollowStatus,
} from "@/lib/follow";

export default function useFollow(userId: string) {
  const [isFollowing, setIsFollowing] =
    useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await getFollowStatus(userId);
      setIsFollowing(data.following);
      setLoading(false);
    };
    load();
  }, [userId]);

  const follow = async () => {
    setIsFollowing(true);
    await followUser(userId);
  };

  const unfollow = async () => {
    setIsFollowing(false);
    await unfollowUser(userId);
  };

  return {
    isFollowing,
    loading,
    follow,
    unfollow,
  };
}