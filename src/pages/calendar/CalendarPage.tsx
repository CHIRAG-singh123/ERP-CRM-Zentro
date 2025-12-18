import { useState, useRef, useCallback, useMemo } from 'react';
import { Download, Plus } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, DatesSetArg, DayCellMountArg, EventMountArg } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';
import { useAuth } from '../../context/AuthContext';
import { useTaskEvents, useTask } from '../../hooks/queries/useTasks';
import type { Task } from '../../services/api/tasks';
import { PageHeader } from '../../components/common/PageHeader';
import { TaskForm } from '../../components/tasks/TaskForm';
import { TaskDetailsModal } from '../../components/tasks/TaskDetailsModal';
import { DayTasksModal } from '../../components/tasks/DayTasksModal';

export function CalendarPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isEmployee = user?.role === 'employee';
  const canViewTasks = isAdmin || isEmployee;

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [dayTasksModalDate, setDayTasksModalDate] = useState<Date | null>(null);
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

  // Group events by date to count tasks per day and track first event per day
  const tasksPerDay = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((event) => {
      const dateKey = new Date(event.start).toDateString();
      counts[dateKey] = (counts[dateKey] || 0) + 1;
    });
    return counts;
  }, [events]);

  // Track first event ID for each day (to show only first event when multiple tasks exist)
  // Sort events by start time to ensure consistent first event selection
  const firstEventPerDay = useMemo(() => {
    const firstEvents: Record<string, string> = {};
    const seenDates: Record<string, boolean> = {};
    
    // Sort events by start time to ensure consistent ordering
    const sortedEvents = [...events].sort((a, b) => {
      const timeA = new Date(a.start).getTime();
      const timeB = new Date(b.start).getTime();
      return timeA - timeB;
    });
    
    sortedEvents.forEach((event) => {
      const dateKey = new Date(event.start).toDateString();
      if (!seenDates[dateKey] && tasksPerDay[dateKey] > 1) {
        firstEvents[dateKey] = event.id;
        seenDates[dateKey] = true;
      }
    });
    
    return firstEvents;
  }, [events, tasksPerDay]);

  // Check if a day has multiple tasks
  const hasMultipleTasks = useCallback((date: Date) => {
    const dateKey = date.toDateString();
    return (tasksPerDay[dateKey] || 0) > 1;
  }, [tasksPerDay]);

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

  // Handle date click for days with multiple tasks
  // Only trigger if clicking on the day cell itself, not on an event
  const handleDateClick = useCallback((arg: DateClickArg) => {
    if (!canViewTasks) return;
    
    // Check if the click target is an event element
    const target = arg.jsEvent?.target as HTMLElement;
    if (target && (target.closest('.fc-event') || target.classList.contains('fc-event'))) {
      // Click was on an event, let eventClick handle it
      return;
    }
    
    const clickedDate = arg.date;
    if (hasMultipleTasks(clickedDate)) {
      setDayTasksModalDate(clickedDate);
    }
  }, [canViewTasks, hasMultipleTasks]);

  // Custom day cell mount to add badge
  const handleDayCellDidMount = useCallback((arg: DayCellMountArg) => {
    const dateKey = arg.date.toDateString();
    const taskCount = tasksPerDay[dateKey] || 0;
    
    // Remove existing badge if any
    const existingBadge = arg.el.querySelector('.fc-day-task-badge');
    if (existingBadge) {
      existingBadge.remove();
    }
    
    // Remove clickable class if it exists
    arg.el.classList.remove('fc-day-has-multiple-tasks');
    
    if (taskCount > 1) {
      // Add class to make day clickable
      arg.el.classList.add('fc-day-has-multiple-tasks');
      
      // Add badge to the day cell
      const badge = document.createElement('div');
      badge.className = 'fc-day-task-badge';
      badge.textContent = taskCount > 9 ? '9+' : taskCount.toString();
      
      // Find the day number element and position badge relative to it
      const dayNumberEl = arg.el.querySelector('.fc-daygrid-day-number');
      if (dayNumberEl && dayNumberEl.parentElement) {
        const parent = dayNumberEl.parentElement;
        parent.style.position = 'relative';
        parent.appendChild(badge);
      }
    }
  }, [tasksPerDay]);

  // Custom event mount to hide events after the first one on days with multiple tasks
  const handleEventDidMount = useCallback((arg: EventMountArg) => {
    if (!arg.event.start) return;
    
    const eventDate = new Date(arg.event.start);
    const dateKey = eventDate.toDateString();
    const taskCount = tasksPerDay[dateKey] || 0;
    
    // If there are multiple tasks on this day, hide all events except the first one
    if (taskCount > 1) {
      const firstEventId = firstEventPerDay[dateKey];
      if (firstEventId && arg.event.id !== firstEventId) {
        // Hide this event (it's not the first one)
        arg.el.style.display = 'none';
        arg.el.classList.add('fc-event-hidden-multiple');
      } else {
        // Show the first event
        arg.el.style.display = '';
        arg.el.classList.remove('fc-event-hidden-multiple');
      }
    } else {
      // Show all events when there's only one task
      arg.el.style.display = '';
      arg.el.classList.remove('fc-event-hidden-multiple');
    }
  }, [tasksPerDay, firstEventPerDay]);


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
              dayCellDidMount={handleDayCellDidMount}
              eventDidMount={handleEventDidMount}
              dateClick={handleDateClick}
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

      {/* Day Tasks Modal */}
      {canViewTasks && (
        <DayTasksModal
          selectedDate={dayTasksModalDate}
          isOpen={!!dayTasksModalDate}
          onClose={() => setDayTasksModalDate(null)}
          onTaskDeleted={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
}
