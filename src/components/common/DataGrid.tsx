import { ReactNode } from 'react';
import { motion } from 'framer-motion';

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
    <motion.div
      className="flex flex-col overflow-hidden rounded-xl border border-border shadow-sm transition-all duration-300 hover:shadow-lg hover:border-accent/30"
      style={{ maxHeight: data.length > 0 ? `calc(${headerHeight} + ${maxBodyHeight})` : 'auto' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Fixed Header - Always visible */}
      <motion.div
        className="flex-shrink-0 grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] bg-muted px-6 py-3 text-left text-xs font-bold uppercase tracking-[0.3em] text-foreground/60 backdrop-blur-sm border-b border-border"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {columns.map((column) => (
          <motion.span
            key={column.key as string}
            style={column.width ? { width: column.width } : undefined}
            className="transition-colors duration-200"
            whileHover={{ color: 'var(--color-accent)' }}
          >
            {column.header}
          </motion.span>
        ))}
        {actions && <motion.span className="text-right" whileHover={{ color: 'var(--color-accent)' }}>Actions</motion.span>}
      </motion.div>
      
      {/* Scrollable Body - Max 8 rows visible */}
      <div
        className={`flex-1 divide-y divide-border bg-card datagrid-scrollable ${showScroll ? 'overflow-y-auto' : 'overflow-y-visible'}`}
        style={{ maxHeight: data.length > 0 ? maxBodyHeight : 'auto' }}
      >
        {data.length === 0 ? (
          <motion.div
            className="px-6 py-10 text-center text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {emptyMessage ?? 'No records to display yet.'}
          </motion.div>
        ) : (
          data.map((row, rowIndex) => {
            const rowId = getRowId ? getRowId(row) : rowIndex;

            return (
              <motion.div
                key={rowId}
                className="group table-row-enhanced"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.3,
                  delay: rowIndex * 0.03,
                  ease: [0.4, 0, 0.2, 1],
                }}
              >
                <motion.div
                  onClick={() => onRowClick?.(row)}
                  className={`grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] items-center px-6 py-4 text-sm text-foreground ${onRowClick ? 'cursor-pointer' : ''}`}
                  whileHover={{
                    backgroundColor: 'var(--color-muted)',
                    x: 4,
                    boxShadow: '-4px 0 12px rgba(168, 218, 220, 0.2)',
                    transition: { duration: 0.2 },
                  }}
                  whileTap={onRowClick ? { scale: 0.98 } : undefined}
                >
                  {columns.map((column, colIndex) => (
                    <motion.span
                      key={column.key as string}
                      className={`table-cell truncate text-foreground ${colIndex === 0 ? 'font-semibold' : 'font-medium'}`}
                      whileHover={{ scale: 1.02, color: 'var(--color-accent)' }}
                      transition={{ duration: 0.2 }}
                    >
                      {column.render ? column.render(row) : (row as Record<string, unknown>)[column.key as string]?.toString()}
                    </motion.span>
                  ))}
                  {actions && (
                    <motion.div
                      className="flex items-center justify-end gap-2"
                      initial={{ opacity: 0.7 }}
                      whileHover={{ opacity: 1 }}
                    >
                      <div className="[&>button]:icon-visible-hover [&_svg]:icon-visible-muted [&>button:hover_svg]:text-accent">
                        {actions(row)}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

