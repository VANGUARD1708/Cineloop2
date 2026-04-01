import { motion, AnimatePresence } from "framer-motion";
import useComments from "@/hooks/useComments";
import CommentItem from "./CommentItem";
import CommentInput from "./CommentInput";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CommentsSheet({ open, onClose }: Props) {
  const { comments, addComment, count } = useComments();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120) onClose();
            }}
            className="fixed bottom-0 left-0 right-0 h-[70vh] bg-zinc-900 rounded-t-2xl z-50 flex flex-col"
          >
            <div className="w-12 h-1.5 bg-zinc-600 rounded-full mx-auto mt-3 mb-4" />

            <div className="px-4 text-white font-semibold">
              Comments ({count})
            </div>

            <div className="flex-1 overflow-y-auto px-4">
              {comments.map((c) => (
                <CommentItem key={c.id} comment={c} />
              ))}
            </div>

            <CommentInput onSend={addComment} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}