import React from 'react';
import {
  Cpu,
  Disc,
  Droplets,
  GlassWater,
  Hammer,
  PaintRoller,
  ShieldAlert,
  Snowflake,
  Sparkles,
  Wind,
  Wrench,
  Zap,
} from 'lucide-react';

export const ServiceIcon: React.FC<{
  iconName: string;
  className?: string;
}> = ({ iconName, className = 'w-5 h-5' }) => {
  switch (iconName) {
    case 'Wind':
      return <Wind className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    case 'Droplets':
      return <Droplets className={className} />;
    case 'Hammer':
      return <Hammer className={className} />;
    case 'Disc':
      return <Disc className={className} />;
    case 'Snowflake':
      return <Snowflake className={className} />;
    case 'GlassWater':
      return <GlassWater className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'PaintRoller':
      return <PaintRoller className={className} />;
    case 'ShieldAlert':
      return <ShieldAlert className={className} />;
    case 'Cpu':
      return <Cpu className={className} />;
    default:
      return <Wrench className={className} />;
  }
};
