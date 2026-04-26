import { useGetMe, useGetXpHistory, useGetStreak, getGetMeQueryKey, getGetXpHistoryQueryKey, getGetStreakQueryKey } from "@workspace/api-client-react";
import { Flame, Trophy, Award, Clock, Activity, Users } from "lucide-react";
import { format } from "date-fns";
import FollowButton from "@/components/social/FollowButton";
import TipJarButton from "@/components/profile/TipJarButton";
import { Link } from "wouter";
import { Crown } from "lucide-react";

export default function ProfilePage() {
  const { data: user, isLoading: userLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: history } = useGetXpHistory({ query: { queryKey: getGetXpHistoryQueryKey() } });
  const { data: streak } = useGetStreak({ query: { queryKey: getGetStreakQueryKey() } });

  if (userLoading || !user) {
    return <div className="p-8 text-white">Loading dossier...</div>;
  }

  const progressPercentage = (user.xp / (user.xp + user.xpToNextLevel)) * 100;

  return (
    <div className="w-full min-h-screen bg-background p-4 md:p-8 pt-8 pb-24">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 bg-card border border-border p-6 rounded-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20" />

          <div className="w-24 h-24 rounded-full border-2 border-primary overflow-hidden relative z-10 bg-zinc-900">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-serif text-white">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 text-center md:text-left relative z-10">
            <h1 className="text-3xl font-bold text-white">{user.username}</h1>
            <p className="text-muted-foreground font-mono mt-1">
              ID: #{user.id.toString().padStart(6, '0')}
            </p>

            {/* Followers */}
            <div className="flex items-center justify-center md:justify-start gap-6 mt-3 text-sm">
              <div className="text-center">
                <div className="font-bold text-white">
                  {user.followersCount || 0}
                </div>
                <div className="text-muted-foreground">
                  Followers
                </div>
              </div>

              <div className="text-center">
                <div className="font-bold text-white">
                  {user.followingCount || 0}
                </div>
                <div className="text-muted-foreground">
                  Following
                </div>
              </div>
            </div>
          </div>

          {/* Follow / Tip / Upgrade */}
          <div className="relative z-10 flex flex-wrap gap-2 justify-center md:justify-start">
            <FollowButton userId={user.id} />
            <TipJarButton username={user.username} />
            <Link href="/pricing">
              <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-primary to-accent rounded-md text-white font-bold text-sm shadow-[0_0_15px_rgba(220,20,60,0.4)] hover:opacity-90 transition-all">
                <Crown size={14} />
                Go Pro
              </button>
            </Link>
          </div>

          <div className="flex items-center gap-4 relative z-10">
            <div className="flex flex-col items-center p-3 bg-black/50 rounded-md border border-white/10">
              <Flame className={streak?.isStreakAlive ? "text-accent" : "text-muted-foreground"} size={24} />
              <span className="text-xl font-bold text-white mt-1">
                {streak?.currentStreak || 0}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                Day Streak
              </span>
            </div>

            <div className="flex flex-col items-center p-3 bg-primary/10 rounded-md border border-primary/20">
              <Trophy className="text-primary" size={24} />
              <span className="text-xl font-bold text-white mt-1">
                Lvl {user.level}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-primary">
                Rank
              </span>
            </div>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="bg-card border border-border p-6 rounded-lg">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">
                Experience Points
              </h3>
              <p className="text-sm text-muted-foreground">
                {user.xp.toLocaleString()} XP Total
              </p>
            </div>
            <div className="text-sm font-mono text-accent">
              {user.xpToNextLevel.toLocaleString()} XP to Level {user.level + 1}
            </div>
          </div>

          <div className="h-4 w-full bg-black rounded-sm border border-white/10 overflow-hidden relative">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent relative"
              style={{ width: `${progressPercentage}%` }}
            >
              <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
            </div>
          </div>
        </div>

        {/* Rest unchanged */}
        {/* (stats + badges + timeline remain exactly same) */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Stats */}
          <div className="col-span-1 space-y-6">
            <div className="bg-card border border-border p-6 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Activity size={18} /> Stats
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Votes Cast</span>
                  <span className="text-white font-bold">{user.totalVotes}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Episodes Watched</span>
                  <span className="text-white font-bold">{user.totalWatched}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Likes Given</span>
                  <span className="text-white font-bold">{user.totalLikes}</span>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Award size={18} /> Badges
              </h3>
              <div className="flex flex-wrap gap-2">
                {user.badges.map((badge, i) => (
                  <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-zinc-300">
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="col-span-1 md:col-span-2 bg-card border border-border p-6 rounded-lg">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Clock size={18} /> Activity Log
            </h3>

            <div className="space-y-6">
              {history?.map((event) => (
                <div key={event.id} className="border border-white/5 p-4 rounded-md">
                  <div className="flex justify-between">
                    <span className="text-white font-bold text-sm">
                      {event.action}
                    </span>
                    <time className="text-xs text-muted-foreground">
                      {format(new Date(event.createdAt), 'MMM d, HH:mm')}
                    </time>
                  </div>
                  <p className="text-sm text-zinc-400 mt-1">
                    {event.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}