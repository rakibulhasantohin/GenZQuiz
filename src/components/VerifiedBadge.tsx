import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface VerifiedBadgeProps {
  size?: number;
  className?: string;
}

const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ size = 16, className }) => {
  return (
    <div 
      className={cn("relative flex items-center justify-center shrink-0", className)} 
      style={{ width: size, height: size }}
    >
      {/* Facebook-style scalloped badge background */}
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0"
      >
        <path 
          d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" 
          fill="#1877F2" 
        />
      </svg>
      
      {/* White checkmark in the middle */}
      <Check 
        size={Math.round(size * 0.6)} 
        className="relative z-10 text-white" 
        strokeWidth={4}
      />
    </div>
  );
};

export default VerifiedBadge;
