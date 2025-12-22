import { ReactNode, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tooltip } from 'react-tooltip';

interface MetricCardProps {
  value: string | ReactNode;
  label: string;
  trend?: string | ReactNode;
  icon?: ReactNode;
  index?: number;
  onClick?: () => void;
  fullValue?: string; // Full unabbreviated value for tooltip
}

export function MetricCard({ value, label, trend, icon, index = 0, onClick, fullValue }: MetricCardProps) {
  const delay = index * 0.1;
  const [showWaveAnimation, setShowWaveAnimation] = useState(true);
  const cardId = `metric-card-${index}`;
  // Alternate glow effects: even indices get glow-accent, odd indices get glow-purple
  const glowClass = index % 2 === 0 ? 'glow-accent' : 'glow-purple';
  // Alternate icon colors: even indices get cyan, odd indices get purple
  const iconBgClass = index % 2 === 0 ? 'bg-[#A8DADC]/20' : 'bg-[#B39CD0]/20';
  const iconColorClass = index % 2 === 0 ? 'text-[#A8DADC]' : 'text-[#B39CD0]';

  useEffect(() => {
    // Trigger wave animation on mount
    setShowWaveAnimation(true);

    // Remove animation after 1.5 seconds
    const timer = setTimeout(() => {
      setShowWaveAnimation(false);
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <>
      <motion.div
        onClick={onClick}
        className={`card-gradient-hover rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6 transition-all duration-200 hover:border-[#A8DADC]/50 hover:shadow-lg ${glowClass} ${onClick ? 'cursor-pointer' : ''} ${showWaveAnimation ? 'wave-border-animation' : ''}`}
        variants={{
          hidden: { opacity: 0, y: 20, scale: 0.95 },
          visible: { opacity: 1, y: 0, scale: 1 },
        }}
        initial="hidden"
        animate="visible"
        transition={{
          duration: 0.3,
          delay: delay,
        }}
        whileHover={{ scale: 1.05, y: -4 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-1">{label}</p>
            <p className="text-2xl font-bold text-white">
              {value}
            </p>
          </div>
          {icon ? (
            <motion.div
              className={`rounded-full ${iconBgClass} p-3 icon-pulse-hover`}
              whileHover={{ scale: 1.15, rotate: 12 }}
            >
              <div className={iconColorClass}>
                {icon}
              </div>
            </motion.div>
          ) : null}
        </div>
        {trend ? (
          <p className="mt-3 text-xs font-medium text-white/60">{trend}</p>
        ) : null}
      </motion.div>
      {fullValue && (
        <Tooltip
          id={cardId}
          className="tooltip-enhanced !z-50"
          place="top"
          style={{
            backgroundColor: '#1A1A1C',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
          }}
        />
      )}
    </>
  );
}

