import { useGetMe, useGetXpHistory, useGetStreak, getGetMeQueryKey, getGetXpHistoryQueryKey, getGetStreakQueryKey } from "@workspace/api-client-react";
import { Flame, Trophy, Award, Clock, Activity } from "lucide-react";
import { format } from "date-fns";

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
            <p className="text-muted-foreground font-mono mt-1">ID: #{user.id.toString().padStart(6, '0')}</p>
          </div>

          <div className="flex items-center gap-4 relative z-10">
            <div className="flex flex-col items-center p-3 bg-black/50 rounded-md border border-white/10">
              <Flame className={streak?.isStreakAlive ? "text-accent" : "text-muted-foreground"} size={24} />
              <span className="text-xl font-bold text-white mt-1">{streak?.currentStreak || 0}</span>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">Day Streak</span>
            </div>
            
            <div className="flex flex-col items-center p-3 bg-primary/10 rounded-md border border-primary/20">
              <Trophy className="text-primary" size={24} />
              <span className="text-xl font-bold text-white mt-1">Lvl {user.level}</span>
              <span className="text-[10px] uppercase tracking-wider text-primary">Rank</span>
            </div>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="bg-card border border-border p-6 rounded-lg">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Experience Points</h3>
              <p className="text-sm text-muted-foreground">{user.xp.toLocaleString()} XP Total</p>
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
              {/* Animated glimmer effect */}
              <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
            </div>
          </div>
        </div>

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
                {user.badges.length === 0 && (
                  <span className="text-sm text-muted-foreground italic">No badges earned yet.</span>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="col-span-1 md:col-span-2 bg-card border border-border p-6 rounded-lg">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Clock size={18} /> Activity Log
            </h3>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              {history?.map((event) => (
                <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-black shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow shadow-black/50 z-10">
                    <span className="text-accent text-xs font-bold">+{event.xpAmount}</span>
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-black/40 border border-white/5 p-4 rounded-md">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-sm">{event.action}</span>
                      <time className="text-xs text-muted-foreground font-mono">
                        {format(new Date(event.createdAt), 'MMM d, HH:mm')}
                      </time>
                    </div>
                    <p className="text-sm text-zinc-400">{event.description}</p>
                  </div>
                </div>
              ))}
              
              {history?.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No activity recorded yet. Time to enter the loop.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
