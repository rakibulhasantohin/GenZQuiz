import React from 'react';
import { motion } from 'motion/react';
import { Zap } from 'lucide-react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ className, iconOnly = false, size = 'md' }) => {
  const sizes = {
    sm: { icon: 16, text: 'text-lg', box: 'w-8 h-8 rounded-lg', gap: 'gap-2' },
    md: { icon: 20, text: 'text-2xl', box: 'w-10 h-10 rounded-xl', gap: 'gap-2' },
    lg: { icon: 32, text: 'text-4xl', box: 'w-16 h-16 rounded-2xl', gap: 'gap-3' },
  };

  const currentSize = sizes[size];

  return (
    <div className={cn("flex items-center", currentSize.gap, className)}>
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0",
          currentSize.box
        )}
      >
        <Zap size={currentSize.icon} fill="currentColor" />
      </motion.div>
      {!iconOnly && (
        <span className={cn("font-black tracking-tight text-gray-900", currentSize.text)}>
          GenZ<span className="text-indigo-600">Quiz</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
