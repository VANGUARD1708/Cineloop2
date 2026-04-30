import { useMemo } from "react";

interface Props {
  active: boolean;
  rgb: string;
  count?: number;
}

/**
 * Ambient depth particles — slow, sparse, palette-tinted dust.
 * Pure CSS animations, GPU-friendly. Disables when not active.
 */
export default function AmbientParticles({ active, rgb, count = 14 }: Props) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const size = 2 + Math.random() * 5;
        return {
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 12,
          duration: 14 + Math.random() * 18,
          drift: -20 + Math.random() * 40,
          size,
          opacity: 0.18 + Math.random() * 0.4,
        };
      }),
    [count],
  );

  if (!active) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
      aria-hidden
      data-testid="ambient-particles"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute block rounded-full"
          style={{
            left: `${p.left}%`,
            bottom: "-10%",
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: `rgba(${rgb}, ${p.opacity})`,
            boxShadow: `0 0 ${p.size * 3}px rgba(${rgb}, ${p.opacity * 0.6})`,
            animation: `cineloop-particle-rise ${p.duration}s linear ${p.delay}s infinite`,
            ["--drift" as any]: `${p.drift}px`,
          }}
        />
      ))}
      <style>{`
        @keyframes cineloop-particle-rise {
          0% { transform: translate3d(0, 0, 0) scale(0.6); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translate3d(var(--drift, 0px), -120vh, 0) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
