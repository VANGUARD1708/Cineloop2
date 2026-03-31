import { useState, useRef, useEffect } from "react";
import { useGetFeed, useLikeEpisode, useCastVote, getGetFeedQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Share2, Play, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeedItem, VotePoll } from "@workspace/api-client-react/src/generated/api.schemas";

export default function FeedPage() {
  const { data: feedData, isLoading } = useGetFeed({ limit: 10 }, { query: { queryKey: getGetFeedQueryKey({ limit: 10 }) } });
  
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const items = feedData || [];

  return (
    <div className="w-full h-full snap-y snap-mandatory overflow-y-scroll no-scrollbar bg-black">
      {items.map((item, index) => (
        <FeedCard key={item.id} item={item} isActive={true} /> // In real app, we'd track active index
      ))}
      {items.length === 0 && (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground flex-col gap-4">
          <Play size={48} className="opacity-20" />
          <p className="font-serif italic text-xl">The void is empty.</p>
        </div>
      )}
    </div>
  );
}

function FeedCard({ item, isActive }: { item: FeedItem; isActive: boolean }) {
  const { episode, film, activePoll } = item;
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(episode.likes || 0);
  
  const likeMutation = useLikeEpisode();
  const queryClient = useQueryClient();

  const handleLike = () => {
    setIsLiked(true);
    setLikesCount(prev => prev + 1);
    likeMutation.mutate({ id: episode.id }, {
      onSuccess: () => {
        // Optimistic update handled, we could patch cache here
      },
      onError: () => {
        setIsLiked(false);
        setLikesCount(prev => prev - 1);
      }
    });
  };

  return (
    <div className="w-full h-[100dvh] snap-start relative bg-black overflow-hidden group">
      {/* Background Media */}
      <div className="absolute inset-0 bg-zinc-900">
        {episode.thumbnailUrl ? (
          <img 
            src={episode.thumbnailUrl} 
            alt={episode.title} 
            className="w-full h-full object-cover opacity-70 scale-105 group-hover:scale-100 transition-transform duration-1000"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-zinc-800 to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
      </div>

      {/* Main Content Overlay */}
      <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 pb-24 md:pb-10 flex flex-col justify-end gap-4 z-10">
        
        {/* Title & Info */}
        <div className="flex flex-col gap-2 max-w-[80%]">
          <div className="flex gap-2 items-center">
            <span className="px-2 py-0.5 bg-primary/20 text-primary border border-primary/50 text-xs font-bold uppercase tracking-wider rounded-sm backdrop-blur-sm">
              {film.genre}
            </span>
            {episode.isLocked && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-500 border border-amber-500/50 text-xs font-bold uppercase tracking-wider rounded-sm backdrop-blur-sm">
                Locked
              </span>
            )}
          </div>
          
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-white leading-tight drop-shadow-lg">
            {film.title}
          </h1>
          <h2 className="text-lg md:text-xl text-zinc-300 font-medium">
            Ep {episode.episodeNumber}: {episode.title}
          </h2>
          <p className="text-sm text-zinc-400 line-clamp-2 md:line-clamp-3 mt-2 max-w-lg">
            {episode.description}
          </p>
        </div>

        {/* Vote Poll Overlay */}
        {activePoll && (
          <div className="mt-6 w-full max-w-md">
            <PollWidget poll={activePoll} episodeId={episode.id} />
          </div>
        )}
      </div>

      {/* Right Action Sidebar */}
      <div className="absolute right-4 bottom-24 md:bottom-10 flex flex-col items-center gap-6 z-20">
        <div className="flex flex-col items-center gap-1">
          <button 
            onClick={handleLike}
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-black/60 transition-all group/btn"
          >
            <Heart 
              className={cn(
                "transition-all duration-300", 
                isLiked ? "fill-primary text-primary scale-110" : "text-white group-hover/btn:scale-110"
              )} 
            />
          </button>
          <span className="text-xs font-bold text-white drop-shadow-md">{likesCount}</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <button className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-black/60 transition-all group/btn">
            <MessageCircle className="text-white group-hover/btn:scale-110 transition-transform" />
          </button>
          <span className="text-xs font-bold text-white drop-shadow-md">Reply</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <button className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-black/60 transition-all group/btn">
            <Share2 className="text-white group-hover/btn:scale-110 transition-transform" />
          </button>
          <span className="text-xs font-bold text-white drop-shadow-md">Share</span>
        </div>
      </div>
    </div>
  );
}

function PollWidget({ poll, episodeId }: { poll: VotePoll; episodeId: number }) {
  const [localPoll, setLocalPoll] = useState(poll);
  const [showXpToast, setShowXpToast] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const castVoteMutation = useCastVote();
  const queryClient = useQueryClient();

  const handleVote = (optionId: number) => {
    if (localPoll.userVoted) return;

    // Optimistic update locally
    const totalVotes = localPoll.totalVotes + 1;
    const newOptions = localPoll.options.map(opt => {
      if (opt.id === optionId) {
        return { ...opt, voteCount: opt.voteCount + 1, percentage: Math.round(((opt.voteCount + 1) / totalVotes) * 100) };
      }
      return { ...opt, percentage: Math.round((opt.voteCount / totalVotes) * 100) };
    });

    setLocalPoll({
      ...localPoll,
      userVoted: true,
      userChoice: optionId,
      totalVotes,
      options: newOptions
    });

    castVoteMutation.mutate({ id: poll.id, data: { optionId } }, {
      onSuccess: (data) => {
        setLocalPoll(data.poll);
        setXpEarned(data.xpEarned);
        setShowXpToast(true);
        setTimeout(() => setShowXpToast(false), 3000);
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      }
    });
  };

  return (
    <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-lg p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />
      
      <div className="flex items-center gap-2 mb-3">
        <Flame size={16} className="text-accent" />
        <h3 className="font-bold text-white text-sm uppercase tracking-wider">Decide the fate</h3>
      </div>
      
      <p className="text-white font-medium mb-4 text-lg leading-tight">{localPoll.question}</p>
      
      <div className="flex flex-col gap-2">
        {localPoll.options.map(option => {
          const isChosen = localPoll.userChoice === option.id;
          
          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={localPoll.userVoted}
              className={cn(
                "relative w-full text-left p-3 rounded-md overflow-hidden transition-all border",
                localPoll.userVoted 
                  ? isChosen ? "border-primary/50 bg-primary/10" : "border-white/5 bg-white/5" 
                  : "border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40"
              )}
            >
              {/* Fill Bar when voted */}
              {localPoll.userVoted && (
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${option.percentage}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={cn(
                    "absolute top-0 left-0 h-full opacity-20",
                    isChosen ? "bg-primary" : "bg-white"
                  )}
                />
              )}
              
              <div className="relative z-10 flex justify-between items-center">
                <span className={cn("font-medium", isChosen ? "text-white" : "text-zinc-300")}>
                  {option.text}
                </span>
                {localPoll.userVoted && (
                  <span className="font-bold text-sm">
                    {option.percentage}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      <div className="mt-3 text-xs text-zinc-500 text-right font-mono">
        {localPoll.totalVotes.toLocaleString()} votes cast
      </div>

      {/* XP Toast */}
      <AnimatePresence>
        {showXpToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-accent-foreground px-4 py-2 rounded-full font-bold shadow-[0_0_20px_rgba(245,158,11,0.5)] flex items-center gap-2 z-50"
          >
            <Flame size={18} />
            +{xpEarned} XP Earned!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
