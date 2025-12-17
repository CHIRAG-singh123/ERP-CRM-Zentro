import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ title, description, actions, children }: PageHeaderProps) {
  return (
    <section className="card-hover mb-8 animate-fade-in rounded-2xl border border-border bg-gradient-to-br from-card via-card/50 to-card p-6 shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="animate-slide-in-left">
          <h2 className="text-2xl font-bold text-foreground transition-all duration-300 hover:text-accent">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm font-medium text-muted-foreground transition-colors duration-300">{description}</p>
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

