import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getCatalogEntry } from '../data/exerciseCatalog';

interface Props {
  exerciseName: string;
  onClose: () => void;
}

export default function ExerciseDetailModal({ exerciseName, onClose }: Props) {
  const entry = getCatalogEntry(exerciseName);
  const [imgIdx, setImgIdx] = useState(0);
  const [imgError, setImgError] = useState(false);

  if (!entry) return null;

  const hasImages = entry.images.length > 0 && !imgError;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" />

        {/* Panel */}
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-md mx-4 mb-4 sm:mb-0 bg-surface-container rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h3 className="text-lg font-headline font-extrabold tracking-tight text-on-surface leading-tight pr-4">
              {exerciseName}
            </h3>
            <button
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
            >
              <X size={18} />
            </button>
          </div>

          <div className="overflow-y-auto px-5 pb-5 space-y-4">
            {/* Images */}
            {hasImages && (
              <div className="relative aspect-[4/3] bg-surface-container-high rounded-xl overflow-hidden">
                <img
                  src={entry.images[imgIdx]}
                  alt={`${exerciseName} - posición ${imgIdx + 1}`}
                  className="w-full h-full object-contain"
                  onError={() => setImgError(true)}
                />
                {entry.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setImgIdx(imgIdx === 0 ? entry.images.length - 1 : imgIdx - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-on-surface/50 text-surface hover:bg-on-surface/70 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setImgIdx(imgIdx === entry.images.length - 1 ? 0 : imgIdx + 1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-on-surface/50 text-surface hover:bg-on-surface/70 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {entry.images.map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${
                            i === imgIdx ? 'bg-primary' : 'bg-on-surface/30'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Instructions */}
            <div>
              <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest block mb-2">
                Instrucciones
              </span>
              <p className="text-on-surface font-body text-sm leading-relaxed">
                {entry.instructions}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
