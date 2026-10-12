import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface CourseImageProps {
  src?: string;
  alt: string;
  className?: string;
  containerClassName?: string;
}

// Deterministic gradients based on course title or code
const GRADIENTS = [
  'from-blue-600 to-indigo-700',
  'from-indigo-600 to-purple-700',
  'from-teal-600 to-emerald-700',
  'from-slate-700 to-slate-900',
  'from-cyan-600 to-blue-700',
  'from-emerald-600 to-teal-800',
  'from-violet-600 to-purple-800',
  'from-blue-700 to-sky-900',
];

export function CourseImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
  containerClassName = 'w-full h-full relative overflow-hidden',
}: CourseImageProps) {
  const [hasError, setHasError] = useState(false);

  // Pick deterministic gradient fallback
  const charCode = (alt || 'Course').charCodeAt(0) + (alt || 'Course').length;
  const gradient = GRADIENTS[charCode % GRADIENTS.length];

  if (!src || hasError) {
    return (
      <div className={`${containerClassName} bg-gradient-to-br ${gradient} flex flex-col items-center justify-center p-4 text-white text-center select-none`}>
        <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center mb-1 backdrop-blur-sm">
          <BookOpen size={20} className="text-white" />
        </div>
        <span className="text-xs font-semibold tracking-wide text-white/90 line-clamp-1">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <img
        src={src}
        alt={alt}
        className={className}
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
