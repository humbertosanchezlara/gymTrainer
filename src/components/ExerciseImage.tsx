// Componente lazy con fallback cuando la imagen falla o no está disponible
import { useState } from 'react';
import { Dumbbell } from 'lucide-react';

interface Props {
  src: string;
  alt: string;
  className?: string;
}

export function ExerciseImage({ src, alt, className }: Props) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-surface-container-low rounded-lg ${className}`}>
        <Dumbbell size={32} className="text-on-surface-variant/40" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setError(true)}
      className={className}
    />
  );
}
