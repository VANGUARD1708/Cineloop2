import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onSave: () => void;
  onShare: () => void;
}

export default function LongPressActions({
  onSave,
  onShare,
}: Props) {
  const [open, setOpen] =
    useState(false);

  const timer =
    useRef<NodeJS.Timeout>();

  const start = () => {
    timer.current = setTimeout(
      () => setOpen(true),
      450
    );
  };

  const cancel = () => {
    clearTimeout(timer.current);
  };

  return (
    <div
      className="absolute inset-0"
      onMouseDown={start}
      onMouseUp={cancel}
      onTouchStart={start}
      onTouchEnd={cancel}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.8,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              scale: 0.8,
            }}
            className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="flex gap-4">
              <button
                onClick={() => {
                  onSave();
                  setOpen(false);
                }}
                className="px-4 py-2 bg-white text-black rounded-lg"
              >
                Save
              </button>

              <button
                onClick={() => {
                  onShare();
                  setOpen(false);
                }}
                className="px-4 py-2 bg-white text-black rounded-lg"
              >
                Share
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}