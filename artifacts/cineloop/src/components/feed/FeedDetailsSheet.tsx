import { motion, AnimatePresence } from "framer-motion";
import type { FeedItem } from "@workspace/api-client-react/src/generated/api.schemas";

interface Props {
  item: FeedItem | null;
  open: boolean;
  onClose: () => void;
}

export default function FeedDetailsSheet({
  item,
  open,
  onClose,
}: Props) {
  if (!item) return null;

  const { film } = item;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25 }}
          className="fixed inset-0 z-50 bg-black text-white"
        >
          <div className="p-6 pt-16 overflow-y-auto h-full">
            <h2 className="text-2xl font-semibold">
              {film.title}
            </h2>

            {film.releaseDate && (
              <p className="opacity-70 mt-1">
                {new Date(
                  film.releaseDate
                ).getFullYear()}
              </p>
            )}

            {film.overview && (
              <p className="mt-4 text-sm leading-relaxed opacity-90">
                {film.overview}
              </p>
            )}

            {film.voteAverage && (
              <div className="mt-6">
                ⭐ {film.voteAverage.toFixed(1)} / 10
              </div>
            )}

            <button
              onClick={onClose}
              className="mt-8 px-4 py-2 bg-white text-black rounded-md"
            >
              Close
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}