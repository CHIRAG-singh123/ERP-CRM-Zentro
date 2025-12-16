import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ title, description, actions, children }: PageHeaderProps) {
  return (
    <section className="card-hover mb-8 animate-fade-in rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-transparent to-white/5 p-6 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-white/20 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_30px_rgba(168,218,220,0.1)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="animate-slide-in-left">
          <h2 className="text-2xl font-semibold text-white transition-all duration-300 hover:text-[#A8DADC]">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-white/60 transition-colors duration-300">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2 animate-slide-in-right">
            {actions}
          </div>
        ) : null}
      </div>
      {children ? <div className="mt-6 animate-fade-in loading-fade-in">{children}</div> : null}
    </section>
  );
}

