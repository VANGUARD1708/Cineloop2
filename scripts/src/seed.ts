import { db } from "@workspace/db";
import {
  filmsTable,
  episodesTable,
} from "@workspace/db";

async function seed() {
  console.log("Seeding CineLoop feed...");

  // ---------- FILMS ----------
  const [film1] = await db.insert(filmsTable).values({
    title: "Backrooms",
    description: "You noclip into endless rooms. Something is moving.",
    genre: "Horror",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?w=800",
    creatorName: "AnalogArchive",
    creatorAvatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=AnalogArchive",
    totalEpisodes: 3,
    episodesReleased: 3,
    totalLikes: 1200,
    totalVotes: 500,
    isSerialised: true,
  }).returning();

  const [film2] = await db.insert(filmsTable).values({
    title: "The Signal",
    description: "A transmission from the future.",
    genre: "Sci-Fi",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1446776899648-aa78eefe8ed0?w=800",
    creatorName: "Axel Noir",
    creatorAvatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=AxelNoir",
    totalEpisodes: 2,
    episodesReleased: 2,
    totalLikes: 900,
    totalVotes: 300,
    isSerialised: true,
  }).returning();

  const [film3] = await db.insert(filmsTable).values({
    title: "Dark Frequency",
    description: "Dreams kill.",
    genre: "Thriller",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=800",
    creatorName: "Viktor Shade",
    creatorAvatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=ViktorShade",
    totalEpisodes: 2,
    episodesReleased: 2,
    totalLikes: 1500,
    totalVotes: 700,
    isSerialised: true,
  }).returning();

  // ---------- EPISODES ----------
  await db.insert(episodesTable).values([
    {
      filmId: film1.id,
      episodeNumber: 1,
      title: "Level 0",
      description: "The hum begins.",
      videoUrl:
        "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?w=800",
      durationSeconds: 30,
      isLocked: false,
      likes: 309,
      hasActivePoll: false,
    },
    {
      filmId: film1.id,
      episodeNumber: 2,
      title: "The Noise",
      description: "You are not alone.",
      videoUrl:
        "https://www.w3schools.com/html/mov_bbb.mp4",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800",
      durationSeconds: 30,
      isLocked: false,
      likes: 120,
      hasActivePoll: false,
    },
    {
      filmId: film2.id,
      episodeNumber: 1,
      title: "Transmission",
      description: "Future calling.",
      videoUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1446776899648-aa78eefe8ed0?w=800",
      durationSeconds: 60,
      isLocked: false,
      likes: 800,
      hasActivePoll: false,
    },
    {
      filmId: film3.id,
      episodeNumber: 1,
      title: "Dream Gate",
      description: "Sleep carefully.",
      videoUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=800",
      durationSeconds: 60,
      isLocked: false,
      likes: 2100,
      hasActivePoll: false,
    },
  ]);

  console.log("Seed complete. Multiple videos ready for scrolling.");
}

seed()
  .catch(console.error)
  .finally(() => process.exit(0));