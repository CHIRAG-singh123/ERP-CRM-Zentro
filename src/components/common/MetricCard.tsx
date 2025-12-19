import { ReactNode, useState, useEffect } from 'react';

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
  const delay = index * 100;
  const [showWaveAnimation, setShowWaveAnimation] = useState(true);

  useEffect(() => {
    // Trigger wave animation on mount
    setShowWaveAnimation(true);

    // Remove animation after 1.5 seconds
    const timer = setTimeout(() => {
      setShowWaveAnimation(false);
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      onClick={onClick}
      className={`card-hover float-animation animate-fade-in rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:scale-[1.03] hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10 ${onClick ? 'cursor-pointer' : ''} ${showWaveAnimation ? 'wave-border-animation' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
      title={fullValue || undefined}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground transition-colors duration-300">{label}</p>
          <p 
            className="mt-2 text-3xl font-bold text-foreground transition-all duration-300 group-hover:scale-105 group-hover:text-accent leading-tight"
            title={fullValue || undefined}
          >
            {value}
          </p>
        </div>
        {icon ? (
          <div className="ml-3 flex-shrink-0 text-foreground/60 transition-all duration-300 hover:scale-125 hover:rotate-12 hover:text-accent">
            {icon}
          </div>
        ) : null}
      </div>
      {trend ? (
        <p className="mt-3 text-xs font-medium text-accent transition-all duration-300 hover:opacity-80">{trend}</p>
      ) : null}
    </div>
  );
}

