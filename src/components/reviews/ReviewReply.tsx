import { useState } from 'react';
import { Edit2, Trash2, Reply, X, Send } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { useAuth } from '../../context/AuthContext';
import { useCreateNestedReply, useUpdateReply, useDeleteReply } from '../../hooks/queries/useReviews';
import type { Reply as ReplyType } from '../../types/reviews';
import { formatDate } from '../../utils/formatting';

interface ReviewReplyProps {
  reply: ReplyType;
  reviewId: string;
  depth?: number;
  onReplyAdded?: () => void;
}

export function ReviewReply({ reply, reviewId, depth = 0, onReplyAdded }: ReviewReplyProps) {
  const { user } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyText, setReplyText] = useState(reply.comment);
  const [newReplyText, setNewReplyText] = useState('');

  const createNestedReplyMutation = useCreateNestedReply();
  const updateReplyMutation = useUpdateReply();
  const deleteReplyMutation = useDeleteReply();

  const isReplyOwner = user?._id === (typeof reply.userId === 'object' ? reply.userId._id : reply.userId);
  const maxDepth = 3; // Limit nesting depth for better UX

  const handleReply = async () => {
    if (!newReplyText.trim()) return;

    try {
      await createNestedReplyMutation.mutateAsync({
        reviewId,
        parentReplyId: reply._id,
        data: { comment: newReplyText.trim() },
      });
      setNewReplyText('');
      setIsReplying(false);
      onReplyAdded?.();
    } catch (error) {
      console.error('Error creating reply:', error);
    }
  };

  const handleUpdate = async () => {
    if (!replyText.trim()) return;

    try {
      await updateReplyMutation.mutateAsync({
        reviewId,
        replyId: reply._id,
        data: { comment: replyText.trim() },
      });
      setIsEditing(false);
      onReplyAdded?.();
    } catch (error) {
      console.error('Error updating reply:', error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this reply?')) return;

    try {
      await deleteReplyMutation.mutateAsync({
        reviewId,
        replyId: reply._id,
      });
      onReplyAdded?.();
    } catch (error) {
      console.error('Error deleting reply:', error);
    }
  };

  const replyUser = typeof reply.userId === 'object' ? reply.userId : null;
  const canReply = depth < maxDepth;

  return (
    <div className={`${depth > 0 ? 'ml-8 mt-3 border-l-2 border-white/10 pl-4' : ''}`}>
      <div className="rounded-lg border border-white/10 bg-[#1A1A1C]/50 p-4">
        <div className="flex items-start gap-3">
          <UserAvatar
            avatarUrl={replyUser?.profile?.avatar}
            name={replyUser?.name}
            email={replyUser?.email}
            size={32}
            className="shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white text-sm">
                  {replyUser?.name || 'Unknown'}
                </span>
                {isReplyOwner && (
                  <span className="text-xs text-white/50 bg-white/5 px-2 py-0.5 rounded">
                    You
                  </span>
                )}
              </div>
              <span className="text-xs text-white/50">
                {formatDate(reply.createdAt, 'short')}
              </span>
            </div>

            {isEditing ? (
              <div className="space-y-2 mt-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white text-sm focus:border-[#B39CD0] focus:outline-none resize-none"
                  placeholder="Edit your reply..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdate}
                    disabled={updateReplyMutation.isPending || !replyText.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-[#B39CD0] px-3 py-1.5 text-xs font-medium text-[#1A1A1C] transition hover:bg-[#C3ADD9] disabled:opacity-50"
                  >
                    <Send className="h-3 w-3" />
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setReplyText(reply.comment);
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/20"
                  >
                    <X className="h-3 w-3" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-white/80 whitespace-pre-wrap break-words">
                  {reply.comment}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  {canReply && (
                    <button
                      onClick={() => setIsReplying(!isReplying)}
                      className="flex items-center gap-1.5 text-xs text-white/60 hover:text-[#B39CD0] transition-colors"
                    >
                      <Reply className="h-3.5 w-3.5" />
                      Reply
                    </button>
                  )}
                  {isReplyOwner && (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1.5 text-xs text-white/60 hover:text-[#A8DADC] transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleteReplyMutation.isPending}
                        className="flex items-center gap-1.5 text-xs text-white/60 hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {isReplying && canReply && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="flex gap-2">
              <textarea
                value={newReplyText}
                onChange={(e) => setNewReplyText(e.target.value)}
                rows={2}
                className="flex-1 rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white text-sm focus:border-[#B39CD0] focus:outline-none resize-none"
                placeholder="Write a reply..."
              />
              <div className="flex flex-col gap-1">
                <button
                  onClick={handleReply}
                  disabled={createNestedReplyMutation.isPending || !newReplyText.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-[#B39CD0] px-3 py-1.5 text-xs font-medium text-[#1A1A1C] transition hover:bg-[#C3ADD9] disabled:opacity-50 h-8"
                >
                  <Send className="h-3 w-3" />
                </button>
                <button
                  onClick={() => {
                    setIsReplying(false);
                    setNewReplyText('');
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/20 h-8"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Nested replies */}
        {reply.replies && reply.replies.length > 0 && (
          <div className="mt-3 space-y-2">
            {reply.replies.map((nestedReply) => (
              <ReviewReply
                key={nestedReply._id}
                reply={nestedReply}
                reviewId={reviewId}
                depth={depth + 1}
                onReplyAdded={onReplyAdded}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
