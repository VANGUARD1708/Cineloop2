import { Link } from "wouter";
import { Film, ArrowRight, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-background text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="relative inline-block mb-6">
          <div className="text-[120px] font-black leading-none tracking-tighter bg-gradient-to-b from-white to-zinc-700 bg-clip-text text-transparent">
            404
          </div>
          <Film
            size={48}
            className="absolute -top-2 -right-6 text-rose-500/40 -rotate-12"
          />
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          This scene was cut.
        </h1>
        <p className="text-sm text-zinc-400 mb-8">
          The page you're looking for didn't make the final edit.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-rose-500 hover:bg-rose-600 rounded-md font-bold text-sm transition-all"
          >
            Back to the feed
            <ArrowRight size={14} />
          </Link>
          <Link
            href="/discover"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md font-bold text-sm transition-all"
          >
            <Compass size={14} />
            Explore the archive
          </Link>
        </div>
      </div>
    </div>
  );
}
