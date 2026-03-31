import { db } from "@workspace/db";
import {
  filmsTable,
  episodesTable,
  votePollsTable,
  voteOptionsTable,
  usersTable,
  userBadgesTable,
  xpEventsTable,
  charactersTable,
} from "@workspace/db";

async function seed() {
  console.log("Seeding CineLoop database...");

  const [user1] = await db
    .insert(usersTable)
    .values({
      username: "CineObsessed",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=CineObsessed",
      level: 7,
      xp: 340,
      xpToNextLevel: 500,
      streakDays: 12,
      longestStreak: 21,
      totalVotes: 45,
      totalWatched: 128,
      totalLikes: 89,
      lastActiveDate: new Date(),
    })
    .onConflictDoNothing()
    .returning();

  if (user1) {
    await db.insert(userBadgesTable).values([
      { userId: user1.id, badge: "First Vote" },
      { userId: user1.id, badge: "Streak Master" },
      { userId: user1.id, badge: "Cliffhanger King" },
    ]).onConflictDoNothing();

    await db.insert(xpEventsTable).values([
      { userId: user1.id, action: "vote", xpAmount: 15, description: "Voted on The Signal - Episode 3" },
      { userId: user1.id, action: "watch", xpAmount: 10, description: "Watched Dark Frequency - Episode 1" },
      { userId: user1.id, action: "like", xpAmount: 5, description: "Liked The Last Signal - Episode 2" },
      { userId: user1.id, action: "streak", xpAmount: 25, description: "7-day streak bonus" },
      { userId: user1.id, action: "vote", xpAmount: 15, description: "Voted on Meridian - Episode 5" },
    ]);
  }

  const [user2] = await db.insert(usersTable).values({
    username: "FilmHunter",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=FilmHunter",
    level: 12,
    xp: 1280,
    xpToNextLevel: 1500,
    streakDays: 31,
    longestStreak: 45,
    totalVotes: 120,
    totalWatched: 340,
    totalLikes: 200,
    lastActiveDate: new Date(),
  }).onConflictDoNothing().returning();

  const [user3] = await db.insert(usersTable).values({
    username: "NightReel",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=NightReel",
    level: 5,
    xp: 210,
    xpToNextLevel: 300,
    streakDays: 4,
    longestStreak: 10,
    totalVotes: 22,
    totalWatched: 64,
    totalLikes: 31,
    lastActiveDate: new Date(),
  }).onConflictDoNothing().returning();

  const [film1] = await db.insert(filmsTable).values({
    title: "The Signal",
    description: "A radio operator in 2041 starts receiving transmissions from a future version of himself — warning of an event that will change everything. Each episode ends with a choice that shapes the next.",
    genre: "Sci-Fi Thriller",
    thumbnailUrl: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&q=80",
    creatorName: "Axel Noir",
    creatorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=AxelNoir",
    totalEpisodes: 8,
    episodesReleased: 3,
    totalLikes: 4821,
    totalVotes: 2134,
    isSerialised: true,
  }).returning();

  const [film2] = await db.insert(filmsTable).values({
    title: "Meridian",
    description: "A former detective wakes up with no memory in a city that doesn't exist on any map. The only clue? Everyone she meets seems to know who she is.",
    genre: "Mystery",
    thumbnailUrl: "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?w=800&q=80",
    creatorName: "Luna Voss",
    creatorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=LunaVoss",
    totalEpisodes: 6,
    episodesReleased: 5,
    totalLikes: 3290,
    totalVotes: 1876,
    isSerialised: true,
  }).returning();

  const [film3] = await db.insert(filmsTable).values({
    title: "Dark Frequency",
    description: "Two strangers discover they're linked by a shared dream. When one of them dies in the dream, the other dies in real life.",
    genre: "Horror",
    thumbnailUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=800&q=80",
    creatorName: "Viktor Shade",
    creatorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ViktorShade",
    totalEpisodes: 5,
    episodesReleased: 5,
    totalLikes: 6711,
    totalVotes: 3444,
    isSerialised: true,
  }).returning();

  const [film4] = await db.insert(filmsTable).values({
    title: "Cascade",
    description: "A street photographer captures something impossible on camera — and now the subject knows.",
    genre: "Thriller",
    thumbnailUrl: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&q=80",
    creatorName: "Maya Renn",
    creatorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=MayaRenn",
    totalEpisodes: 4,
    episodesReleased: 2,
    totalLikes: 2100,
    totalVotes: 980,
    isSerialised: true,
  }).returning();

  if (film1) {
    const [ep1] = await db.insert(episodesTable).values({
      filmId: film1.id,
      episodeNumber: 1,
      title: "First Contact",
      description: "The first transmission arrives at 3:17 AM. The voice is unmistakably his own.",
      videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
      thumbnailUrl: "https://images.unsplash.com/photo-1446776899648-aa78eefe8ed0?w=800&q=80",
      durationSeconds: 52,
      isLocked: false,
      likes: 1240,
      cliffhangerText: "The voice said: 'Don't open the door.' But who's knocking?",
      hasActivePoll: true,
    }).returning();

    const [ep2] = await db.insert(episodesTable).values({
      filmId: film1.id,
      episodeNumber: 2,
      title: "The Warning",
      description: "He ignores the warning. Chaos follows. Now he must choose who to tell.",
      videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
      thumbnailUrl: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&q=80",
      durationSeconds: 58,
      isLocked: false,
      likes: 980,
      cliffhangerText: "Tell Maya — or go alone?",
      hasActivePoll: true,
    }).returning();

    const [ep3] = await db.insert(episodesTable).values({
      filmId: film1.id,
      episodeNumber: 3,
      title: "Recursion",
      description: "The transmissions grow more desperate. Something is hunting the future version of him.",
      videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
      thumbnailUrl: "https://images.unsplash.com/photo-1484417894907-623942c8ee29?w=800&q=80",
      durationSeconds: 61,
      isLocked: false,
      likes: 1421,
      cliffhangerText: "He found the archive. Should he destroy it or broadcast everything?",
      hasActivePoll: false,
    }).returning();

    if (ep1) {
      const [poll1] = await db.insert(votePollsTable).values({
        episodeId: ep1.id,
        filmTitle: "The Signal",
        question: "He opens the door. What's on the other side?",
        totalVotes: 2134,
        isActive: true,
        endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }).returning();
      if (poll1) {
        await db.insert(voteOptionsTable).values([
          { pollId: poll1.id, text: "Another version of himself", voteCount: 1089 },
          { pollId: poll1.id, text: "An empty room with a message on the wall", voteCount: 634 },
          { pollId: poll1.id, text: "The agent he's been running from", voteCount: 411 },
        ]);
      }
    }

    if (ep2) {
      const [poll2] = await db.insert(votePollsTable).values({
        episodeId: ep2.id,
        filmTitle: "The Signal",
        question: "He must tell someone. Who does he trust?",
        totalVotes: 1876,
        isActive: true,
        endsAt: new Date(Date.now() + 18 * 60 * 60 * 1000),
      }).returning();
      if (poll2) {
        await db.insert(voteOptionsTable).values([
          { pollId: poll2.id, text: "Tell Maya — she deserves the truth", voteCount: 1124 },
          { pollId: poll2.id, text: "Go alone — it's too dangerous", voteCount: 752 },
        ]);
      }
    }
  }

  if (film2) {
    await db.insert(episodesTable).values([
      {
        filmId: film2.id,
        episodeNumber: 1,
        title: "Waking in Nowhere",
        description: "She opens her eyes. No ID. No memory. But everyone knows her name.",
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
        thumbnailUrl: "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?w=800&q=80",
        durationSeconds: 48,
        isLocked: false,
        likes: 870,
        cliffhangerText: "The old man whispers a name — but it's not hers.",
        hasActivePoll: false,
      },
      {
        filmId: film2.id,
        episodeNumber: 2,
        title: "The Map That Isn't There",
        description: "The city doesn't exist in any database. But the murders do.",
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
        thumbnailUrl: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80",
        durationSeconds: 54,
        isLocked: false,
        likes: 743,
        cliffhangerText: "She finds a photo of herself — taken 40 years before she was born.",
        hasActivePoll: true,
      },
    ]);
  }

  if (film3) {
    const [ep3_1] = await db.insert(episodesTable).values({
      filmId: film3.id,
      episodeNumber: 1,
      title: "The Dream Gate",
      description: "First contact inside the shared dream. The rules are simple: die in the dream, die for real.",
      videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
      thumbnailUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=800&q=80",
      durationSeconds: 44,
      isLocked: false,
      likes: 2100,
      cliffhangerText: "Something is following them that wasn't there before.",
      hasActivePoll: true,
    }).returning();

    if (ep3_1) {
      const [poll3] = await db.insert(votePollsTable).values({
        episodeId: ep3_1.id,
        filmTitle: "Dark Frequency",
        question: "They split up inside the dream. Who do you follow?",
        totalVotes: 3444,
        isActive: true,
        endsAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      }).returning();
      if (poll3) {
        await db.insert(voteOptionsTable).values([
          { pollId: poll3.id, text: "Follow Zara — she knows something she won't say", voteCount: 2012 },
          { pollId: poll3.id, text: "Follow Marco — he's already being hunted", voteCount: 1432 },
        ]);
      }
    }
  }

  if (film1 && film2 && film3) {
    await db.insert(charactersTable).values([
      {
        name: "Ethan Cross",
        filmId: film1.id,
        filmTitle: "The Signal",
        avatarUrl: "https://api.dicebear.com/7.x/personas/svg?seed=EthanCross",
        bio: "Radio operator. Insomniac. The only person in 2041 who receives transmissions from himself — and the only one who doesn't know why.",
        followerCount: 12430,
        latestUpdate: "Just intercepted a new frequency. The coordinates point to a location that was demolished 10 years ago.",
      },
      {
        name: "Detective Asha Kane",
        filmId: film2.id,
        filmTitle: "Meridian",
        avatarUrl: "https://api.dicebear.com/7.x/personas/svg?seed=AshaKane",
        bio: "Former homicide detective with a perfect record — she never lost a case. Until she woke up in Meridian with no memory and everyone knowing her name.",
        followerCount: 9821,
        latestUpdate: "Found a second photograph. The same impossible age. She's starting to think Meridian chose her.",
      },
      {
        name: "Zara Venn",
        filmId: film3.id,
        filmTitle: "Dark Frequency",
        avatarUrl: "https://api.dicebear.com/7.x/personas/svg?seed=ZaraVenn",
        bio: "She doesn't talk about what she sees in the dream. She's been in the frequency before — before Marco even knew it existed.",
        followerCount: 18200,
        latestUpdate: "She left a message: 'Don't follow me tonight.' Nobody knows what happens if they do.",
      },
      {
        name: "Marco Reyes",
        filmId: film3.id,
        filmTitle: "Dark Frequency",
        avatarUrl: "https://api.dicebear.com/7.x/personas/svg?seed=MarcoReyes",
        bio: "Musician. Doesn't remember the accident. Only knows that every time he sleeps, something in the dream gets a little closer.",
        followerCount: 7640,
        latestUpdate: "He drew something in his sleep. A door. The same door from Episode 1.",
      },
    ]);
  }

  console.log("Seed complete.");
}

seed().catch(console.error).finally(() => process.exit(0));
