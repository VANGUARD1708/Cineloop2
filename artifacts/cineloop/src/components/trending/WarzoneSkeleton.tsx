export default function WarzoneSkeleton() {
  return (
    <div className="bg-zinc-900 border border-white/10 rounded-xl p-5 space-y-4 animate-pulse">
      <div className="h-4 w-32 bg-white/10 rounded" />
      <div className="h-6 w-full bg-white/10 rounded" />

      <div className="space-y-3">
        <div className="h-12 bg-white/10 rounded" />
        <div className="h-12 bg-white/10 rounded" />
      </div>

      <div className="h-2 bg-white/10 rounded" />
      <div className="h-3 w-20 bg-white/10 rounded" />
    </div>
  );
}