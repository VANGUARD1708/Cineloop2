import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onLike: () => void;
}

export default function DoubleTapLike({
  onLike,
}: Props) {
  const [show, setShow] =
    useState(false);

  let lastTap = 0;

  const handleTap = () => {
    const now = Date.now();
    const delta = now - lastTap;

    if (delta < 250) {
      onLike();
      setShow(true);
      setTimeout(
        () => setShow(false),
        700
      );
    }

    lastTap = now;
  };

  return (
    <div
      className="absolute inset-0"
      onClick={handleTap}
    >
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{
              scale: 0,
              opacity: 0,
            }}
            animate={{
              scale: 1.4,
              opacity: 1,
            }}
            exit={{
              scale: 2,
              opacity: 0,
            }}
            transition={{
              duration: 0.4,
            }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="text-white text-6xl">
              ❤️
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}