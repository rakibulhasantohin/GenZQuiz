import React from 'react';
import { 
  Play, Globe, MoonStar, Landmark, Atom, Compass, Library, Facebook, Brain 
} from 'lucide-react';

interface CategoryIconProps {
  icon: string;
  size: number;
}

const CategoryIcon: React.FC<CategoryIconProps> = ({ icon, size }) => {
  switch (icon) {
    case 'Globe': return <Globe size={size} fill="currentColor" />;
    case 'MoonStar': return <MoonStar size={size} fill="currentColor" />;
    case 'Landmark': return <Landmark size={size} fill="currentColor" />;
    case 'Atom': return <Atom size={size} fill="currentColor" />;
    case 'Compass': return <Compass size={size} fill="currentColor" />;
    case 'Library': return <Library size={size} fill="currentColor" />;
    case 'Facebook': return <Facebook size={size} fill="currentColor" />;
    case 'Brain': return <Brain size={size} fill="currentColor" />;
    default: return <Play size={size} fill="currentColor" />;
  }
};

export default CategoryIcon;
