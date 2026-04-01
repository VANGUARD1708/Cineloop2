import { motion, useAnimation } from "framer-motion";
import { useEffect, useRef } from "react";

export default function FeedProgress({
  duration = 5000,
  isActive,
  onComplete,
}: {
  duration?: number;
  isActive: boolean;
  onComplete?: () => void;
}) {
  const controls = useAnimation();
  const startTime = useRef<number | null>(null);
  const elapsed = useRef(0);

  useEffect(() => {
    if (isActive) {
      startTime.current = Date.now();

      controls.start({
        width: "100%",
        transition: {
          duration: (duration - elapsed.current) / 1000,
          ease: "linear",
        },
      });
    } else {
      controls.stop();
      if (startTime.current) {
        elapsed.current += Date.now() - startTime.current;
      }
    }
  }, [isActive, controls, duration]);

  return (
    <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 z-50">
      <motion.div
        initial={{ width: "0%" }}
        animate={controls}
        onAnimationComplete={onComplete}
        className="h-full bg-white"
      />
    </div>
  );
}