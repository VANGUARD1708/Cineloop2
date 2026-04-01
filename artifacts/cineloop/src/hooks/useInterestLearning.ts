import { useEffect, useState } from "react";

const STORAGE_KEY = "interestProfile";

export default function useInterestLearning() {
  const [profile, setProfile] =
    useState<Map<string, number>>(
      new Map()
    );

  // load
  useEffect(() => {
    const raw =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!raw) return;

    const obj = JSON.parse(raw);

    setProfile(
      new Map(
        Object.entries(obj)
      )
    );
  }, []);

  // persist
  useEffect(() => {
    const obj: Record<
      string,
      number
    > = {};

    profile.forEach(
      (v, k) => (obj[k] = v)
    );

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(obj)
    );
  }, [profile]);

  const train = (
    tags: string[],
    weight: number
  ) => {
    setProfile((prev) => {
      const next =
        new Map(prev);

      tags.forEach((tag) => {
        const current =
          next.get(tag) || 0;

        next.set(
          tag,
          current + weight
        );
      });

      return next;
    });
  };

  // public API
  const onLike = (tags: string[]) =>
    train(tags, 3);

  const onSave = (tags: string[]) =>
    train(tags, 4);

  const onComplete = (
    tags: string[]
  ) => train(tags, 2);

  const onSkip = (tags: string[]) =>
    train(tags, -2);

  return {
    interestProfile: profile,
    onLike,
    onSave,
    onComplete,
    onSkip,
  };
}