"use client";

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-zinc-800" />

        <div>
          <h1 className="text-xl font-semibold">Your Profile</h1>
          <p className="text-white/60 text-sm">
            Your activity & interests
          </p>
        </div>
      </div>

      <div className="mt-8 text-white/50">
        No activity yet.
      </div>
    </div>
  );
}