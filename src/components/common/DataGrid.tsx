import { ReactNode } from 'react';

interface DataGridColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
  width?: string;
}

interface DataGridProps<T> {
  columns: Array<DataGridColumn<T>>;
  data: T[];
  emptyMessage?: string;
  actions?: (row: T) => ReactNode;
  getRowId?: (row: T) => string | number;
  onRowClick?: (row: T) => void;
}

export function DataGrid<T>({ columns, data, emptyMessage, actions, getRowId, onRowClick }: DataGridProps<T>) {
  // Calculate height for 8 rows: each row is ~56px (py-4 = 32px + content ~24px)
  // 8 rows × 56px = 448px max height for scrollable area
  // Header is ~48px (py-3 = 24px + text ~24px)
  // Total max height: 448px (body) + 48px (header) = 496px
  const maxBodyHeight = '448px';
  const headerHeight = '48px';
  const showScroll = data.length > 8;

  return (
    <div 
      className="flex flex-col overflow-hidden rounded-xl border border-border animate-fade-in shadow-sm transition-all duration-300 hover:shadow-lg hover:border-accent/30"
      style={{ maxHeight: data.length > 0 ? `calc(${headerHeight} + ${maxBodyHeight})` : 'auto' }}
    >
      {/* Fixed Header - Always visible */}
      <div className="flex-shrink-0 grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] bg-muted px-6 py-3 text-left text-xs font-bold uppercase tracking-[0.3em] text-foreground/60 backdrop-blur-sm border-b border-border">
        {columns.map((column) => (
          <span key={column.key as string} style={column.width ? { width: column.width } : undefined} className="transition-colors duration-200">
            {column.header}
          </span>
        ))}
        {actions && <span className="text-right">Actions</span>}
      </div>
      
      {/* Scrollable Body - Max 8 rows visible */}
      <div 
        className={`flex-1 divide-y divide-border bg-card datagrid-scrollable ${showScroll ? 'overflow-y-auto' : 'overflow-y-visible'}`}
        style={{ maxHeight: data.length > 0 ? maxBodyHeight : 'auto' }}
      >
        {data.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground animate-fade-in">
            {emptyMessage ?? 'No records to display yet.'}
          </div>
        ) : (
          data.map((row, rowIndex) => {
            const rowId = getRowId ? getRowId(row) : rowIndex;

            return (
              <div key={rowId} className="group stagger-item">
                <div
                  onClick={() => onRowClick?.(row)}
                  className={`grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] items-center px-6 py-4 text-sm text-foreground transition-all duration-300 hover:bg-muted hover:shadow-md hover:-translate-y-0.5 hover:border-l-2 hover:border-l-accent ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((column, colIndex) => (
                    <span
                      key={column.key as string}
                      className={`truncate text-foreground transition-all duration-200 group-hover:text-accent ${colIndex === 0 ? 'font-semibold' : 'font-medium'}`}
                    >
                      {column.render ? column.render(row) : (row as Record<string, unknown>)[column.key as string]?.toString()}
                    </span>
                  ))}
                  {actions && (
                    <div className="flex items-center justify-end gap-2 transition-all duration-200 group-hover:opacity-100">
                      <div className="[&>button]:icon-visible-hover [&_svg]:icon-visible-muted [&>button:hover_svg]:text-accent">
                        {actions(row)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

