import { useState, useRef, useCallback, useMemo } from 'react';
import { Download, Plus } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, DatesSetArg } from '@fullcalendar/core';
import { useAuth } from '../../context/AuthContext';
import { useTaskEvents, useTask } from '../../hooks/queries/useTasks';
import type { Task } from '../../services/api/tasks';
import { PageHeader } from '../../components/common/PageHeader';
import { TaskForm } from '../../components/tasks/TaskForm';
import { TaskDetailsModal } from '../../components/tasks/TaskDetailsModal';

export function CalendarPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isEmployee = user?.role === 'employee';
  const canViewTasks = isAdmin || isEmployee;

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  });

  // Track previous date range to prevent unnecessary updates
  const previousDateRangeRef = useRef<{ start: string; end: string } | null>(null);

  const { data, isLoading, refetch } = useTaskEvents(dateRange.start, dateRange.end);
  const { data: taskData } = useTask(selectedTaskId || undefined);

  // Memoize events to prevent unnecessary re-renders
  const events = useMemo(() => {
    if (!data || !('events' in data)) return [];
    return data.events || [];
  }, [data]);

  // Calendar is view-only - date clicks are disabled
  // Tasks can only be created via the "New Task" button in the header
  // No handleDateClick needed - dateClick is set to undefined in FullCalendar config

  // Optimized datesSet callback - only updates state if date range actually changed
  // This prevents unnecessary re-renders that interfere with FullCalendar navigation
  const handleDatesSet = useCallback((dateInfo: DatesSetArg) => {
    const start = dateInfo.start.toISOString();
    const end = new Date(dateInfo.end.getTime() - 1).toISOString();
    const newRange = { start, end };

    // Only update state if the date range actually changed
    const prevRange = previousDateRangeRef.current;
    if (
      !prevRange ||
      prevRange.start !== newRange.start ||
      prevRange.end !== newRange.end
    ) {
      previousDateRangeRef.current = newRange;
      setDateRange(newRange);
    }
  }, []);

  const handleEventClick = useCallback((arg: EventClickArg) => {
    if (!canViewTasks) return; // Only admin and employees can view tasks
    const taskId = arg.event.id;
    setSelectedTaskId(taskId);
  }, [canViewTasks]);

  const handleNewTask = useCallback(() => {
    if (!isAdmin) return; // Only admin can create tasks
    setSelectedDate(undefined);
    setShowTaskForm(true);
  }, [isAdmin]);

  const handleFormSuccess = useCallback(() => {
    setShowTaskForm(false);
    setEditingTask(null);
    setSelectedDate(undefined);
    refetch();
  }, [refetch]);

  const handleFormCancel = useCallback(() => {
    setShowTaskForm(false);
    setEditingTask(null);
    setSelectedDate(undefined);
  }, []);

  const handleTaskDetailsClose = useCallback(() => {
    setSelectedTaskId(null);
  }, []);

  const handleTaskDetailsEdit = useCallback((task: Task) => {
    // Pass task directly to form - same as dashboard approach
    // The TaskForm component will handle the data normalization
    setEditingTask(task);
    setSelectedTaskId(null);
    setShowTaskForm(true);
  }, []);

  const handleTaskDetailsDelete = useCallback(() => {
    setSelectedTaskId(null);
    refetch();
  }, [refetch]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Calendar & Scheduler"
        description="View your tasks and events. Use the 'New Task' button to create tasks."
        actions={
          <>
            <button className="button-press flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 transition-all duration-300 hover:border-white/20 hover:text-white hover:scale-105 hover:shadow-lg hover:shadow-[#A8DADC]/20">
              <Download className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
              Export ICS
            </button>
            {isAdmin && (
              <button
                onClick={handleNewTask}
                className="button-press flex items-center gap-2 rounded-full bg-[#A8DADC] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition-all duration-300 hover:bg-[#BCE7E5] hover:scale-105 hover:shadow-lg hover:shadow-[#A8DADC]/30"
              >
                <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                New Task
              </button>
            )}
          </>
        }
      />

      <div className="rounded-2xl border border-white/10 bg-[#1A1A1C]/70 p-6 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.4)] transition-all duration-300 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] animate-fade-in">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-[#A8DADC]"></div>
              <div className="text-white/60 animate-pulse">Loading calendar...</div>
            </div>
          </div>
        ) : (
          <div className="animate-slide-fade">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay',
              }}
              events={events}
              eventClick={handleEventClick}
              height="auto"
              eventDisplay="block"
              editable={false}
              selectable={false}
              selectMirror={false}
              unselectAuto={false}
              dayMaxEvents={true}
              moreLinkClick="popover"
              themeSystem="standard"
              datesSet={handleDatesSet}
              eventClassNames="cursor-pointer transition-all duration-200 hover:scale-105"
              dayCellClassNames="calendar-view-only"
              // Disable date click entirely - calendar is view-only
              dateClick={undefined}
            />
          </div>
        )}
      </div>

      {/* Task Form Modal */}
      {isAdmin && (
        <TaskForm
          task={editingTask || undefined}
          isOpen={showTaskForm}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
          initialDueDate={selectedDate}
        />
      )}

      {/* Task Details Modal */}
      {canViewTasks && taskData?.task && (
        <TaskDetailsModal
          task={taskData.task}
          isOpen={!!selectedTaskId}
          onClose={handleTaskDetailsClose}
          onEdit={() => handleTaskDetailsEdit(taskData.task)}
          onDelete={handleTaskDetailsDelete}
          hideEditButton={true}
        />
      )}
    </div>
  );
}
