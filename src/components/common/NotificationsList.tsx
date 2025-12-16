import { useState } from 'react';
import { X, CheckCheck, Trash2 } from 'lucide-react';
import { useNotifications, useMarkAsRead, useMarkAllAsRead, useDeleteNotification } from '../../hooks/queries/useNotifications';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '../../services/api/notifications';

interface NotificationsListProps {
  onClose: () => void;
}

export function NotificationsList({ onClose }: NotificationsListProps) {
  const navigate = useNavigate();
  const { data, isLoading } = useNotifications({ limit: 10, unreadOnly: false });
  const notifications = data?.notifications || [];
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead.mutate(notification._id);
    }

    if (notification.relatedTo) {
      const { type, id } = notification.relatedTo;
      if (type === 'Lead') navigate(`/leads/${id}`);
      else if (type === 'Deal') navigate(`/opportunities/${id}`);
      else if (type === 'Contact') navigate(`/contacts/${id}`);
      else if (type === 'Company') navigate(`/accounts/${id}`);
      else if (type === 'Invoice') navigate(`/invoices/${id}`);
      else if (type === 'Quote') navigate(`/quotes/${id}`);
      else if (type === 'Task') navigate(`/tasks/${id}`);
    }
    onClose();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification.mutate(id);
  };

  const getTypeColor = (type: Notification['type']) => {
    const colors = {
      info: 'bg-blue-500/20 text-blue-300',
      success: 'bg-green-500/20 text-green-300',
      warning: 'bg-yellow-500/20 text-yellow-300',
      error: 'bg-red-500/20 text-red-300',
      task: 'bg-purple-500/20 text-purple-300',
      lead: 'bg-cyan-500/20 text-cyan-300',
      deal: 'bg-indigo-500/20 text-indigo-300',
      comment: 'bg-gray-500/20 text-gray-300',
    };
    return colors[type] || colors.info;
  };

  return (
    <div className="absolute right-0 top-12 z-50 w-96 rounded-md border border-white/10 bg-[#1F1F21] shadow-lg">
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Notifications</h3>
          <div className="flex items-center gap-2">
            {notifications.filter((n) => !n.isRead).length > 0 && (
              <button
                onClick={() => markAllAsRead.mutate()}
                className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                title="Mark all as read"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-white/60">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-white/60">No notifications</div>
        ) : (
          <div className="divide-y divide-white/10">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                onClick={() => handleNotificationClick(notification)}
                className={`cursor-pointer p-4 transition hover:bg-white/5 ${
                  !notification.isRead ? 'bg-white/5' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${getTypeColor(notification.type)}`}>
                        {notification.type}
                      </span>
                      {!notification.isRead && (
                        <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                      )}
                    </div>
                    <div className="font-medium text-white">{notification.title}</div>
                    <div className="mt-1 text-sm text-white/70">{notification.message}</div>
                    <div className="mt-1 text-xs text-white/50">
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, notification._id)}
                    className="rounded-md p-1 text-white/40 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

