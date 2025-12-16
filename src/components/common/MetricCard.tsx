import { ReactNode } from 'react';

interface MetricCardProps {
  value: string | ReactNode;
  label: string;
  trend?: string | ReactNode;
  icon?: ReactNode;
  index?: number;
  onClick?: () => void;
}

export function MetricCard({ value, label, trend, icon, index = 0, onClick }: MetricCardProps) {
  const delay = index * 100;

  return (
    <div
      onClick={onClick}
      className={`card-hover float-animation animate-fade-in rounded-2xl border border-white/10 bg-[#1A1A1C]/80 p-5 transition-all duration-300 hover:scale-[1.03] hover:border-white/20 hover:bg-[#1A1A1C] hover:shadow-xl hover:shadow-[#A8DADC]/10 ${onClick ? 'cursor-pointer' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm uppercase tracking-[0.32em] text-white/40 transition-colors duration-300">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white transition-all duration-300 group-hover:scale-105 group-hover:text-[#A8DADC] leading-tight">{value}</p>
        </div>
        {icon ? (
          <div className="ml-3 flex-shrink-0 text-white/50 transition-all duration-300 hover:scale-125 hover:rotate-12 hover:text-[#A8DADC]">
            {icon}
          </div>
        ) : null}
      </div>
      {trend ? (
        <p className="mt-3 text-xs text-[#A8DADC] transition-all duration-300 hover:text-[#BCE7E5]">{trend}</p>
      ) : null}
    </div>
  );
}

