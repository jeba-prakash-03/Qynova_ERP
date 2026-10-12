import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api';
import {
  TaskWithDetails,
  TaskStatus,
  TASK_STATUS_CONFIG,
  TASK_PRIORITY_CONFIG,
  VALID_STATUS_TRANSITIONS,
} from '../types';
import { useToast } from '../../../shared/context/ToastContext';
import { Can } from '../../../shared/components/Can';
import {
  X,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  AlertCircle,
  MessageSquare,
  History,
  CornerDownRight,
  Send,
  Plus,
  ArrowRight,
  ShieldCheck,
  Edit2,
  CheckSquare,
} from 'lucide-react';

interface TaskDrawerProps {
  taskId: number | null;
  onClose: () => void;
  onEdit?: (task: TaskWithDetails) => void;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({ taskId, onClose, onEdit }) => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [commentText, setCommentText] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showAddSubtask, setShowAddSubtask] = useState(false);

  const {
    data: task,
    isLoading,
    isError,
  } = useQuery<TaskWithDetails>({
    queryKey: ['tasks', taskId],
    queryFn: () => tasksApi.getById(taskId!),
    enabled: Boolean(taskId),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ status, comment }: { status: TaskStatus; comment?: string }) =>
      tasksApi.updateStatus(taskId!, status, comment),
    onSuccess: (updated) => {
      success(`Task status updated to ${updated.status.replace('_', ' ')}`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowRejectInput(false);
      setRejectReason('');
    },
    onError: (err: any) => {
      toastError(
        err.response?.data?.message || err.message || 'Failed to update task status'
      );
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (comment: string) => tasksApi.addComment(taskId!, comment),
    onSuccess: () => {
      setCommentText('');
      success('Comment added');
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to add comment');
    },
  });

  const createSubtaskMutation = useMutation({
    mutationFn: (title: string) =>
      tasksApi.create({
        project_id: task!.project_id,
        parent_task_id: task!.id,
        title,
        priority: 'medium',
        status: 'todo',
      }),
    onSuccess: () => {
      setNewSubtaskTitle('');
      setShowAddSubtask(false);
      success('Subtask added');
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to create subtask');
    },
  });

  const updateSubtaskStatusMutation = useMutation({
    mutationFn: ({ subtaskId, status }: { subtaskId: number; status: TaskStatus }) =>
      tasksApi.updateStatus(subtaskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to update subtask');
    },
  });

  if (!taskId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded border border-indigo-200">
              {task?.task_code || 'Loading...'}
            </span>
            {task?.project_name && (
              <span className="text-xs text-slate-500 font-medium truncate max-w-[200px]">
                {task.project_name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {task && onEdit && (
              <Can permission="tasks.edit">
                <button
                  onClick={() => onEdit(task)}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-white transition"
                  title="Edit Task"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </Can>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : isError || !task ? (
          <div className="flex-1 p-6 text-center text-rose-500 flex flex-col items-center justify-center">
            <AlertCircle className="w-10 h-10 mb-2" />
            <p>Failed to load task details.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Title & Status */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${
                    TASK_STATUS_CONFIG[task.status]?.bg || 'bg-slate-100'
                  } ${TASK_STATUS_CONFIG[task.status]?.color || 'text-slate-700'} ${
                    TASK_STATUS_CONFIG[task.status]?.border || 'border-slate-200'
                  }`}
                >
                  {TASK_STATUS_CONFIG[task.status]?.label || task.status}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                    TASK_PRIORITY_CONFIG[task.priority]?.badge
                  }`}
                >
                  {task.priority} Priority
                </span>
                {task.module_name && (
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">
                    {task.module_name}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900 leading-snug">{task.title}</h2>
            </div>

            {/* Allowed Next Status Actions (Workflow State Machine) */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2.5">
                Workflow Transitions
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {VALID_STATUS_TRANSITIONS[task.status]?.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">
                    Task is in terminal state ({task.status}).
                  </span>
                ) : (
                  VALID_STATUS_TRANSITIONS[task.status]?.map((nextStatus) => {
                    const isRejection = nextStatus === 'changes_required';
                    return (
                      <button
                        key={nextStatus}
                        disabled={updateStatusMutation.isPending}
                        onClick={() => {
                          if (isRejection) {
                            setShowRejectInput(true);
                          } else {
                            updateStatusMutation.mutate({ status: nextStatus });
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm ${
                          isRejection
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        Move to {TASK_STATUS_CONFIG[nextStatus]?.label || nextStatus}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Changes Required Note Modal / Input */}
              {showRejectInput && (
                <div className="mt-3 p-3 bg-rose-50/70 border border-rose-200 rounded-lg space-y-2">
                  <label className="block text-xs font-medium text-rose-800">
                    Reason / Required Changes for Assignee:
                  </label>
                  <textarea
                    rows={2}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Specify why the PR or task needs changes..."
                    className="w-full text-xs p-2 rounded border border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowRejectInput(false)}
                      className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={!rejectReason.trim() || updateStatusMutation.isPending}
                      onClick={() =>
                        updateStatusMutation.mutate({
                          status: 'changes_required',
                          comment: rejectReason,
                        })
                      }
                      className="px-3 py-1 bg-rose-600 text-white text-xs font-semibold rounded hover:bg-rose-700 disabled:opacity-50"
                    >
                      Submit Rejection
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-slate-400 font-medium">Assignee</span>
                  <span className="font-semibold text-slate-800">
                    {task.assignee_name || 'Unassigned'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-slate-400 font-medium">Reviewer</span>
                  <span className="font-semibold text-slate-800">
                    {task.reviewer_name || 'Unassigned'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-slate-400 font-medium">Due Date</span>
                  <span className="font-semibold text-slate-800">
                    {task.due_date ? task.due_date.split('T')[0] : 'None'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-slate-400 font-medium">Logged / Estimated</span>
                  <span className="font-semibold text-slate-800">
                    {Number(task.actual_hours || 0).toFixed(1)}h /{' '}
                    {Number(task.estimated_hours || 0).toFixed(1)}h
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Description
              </h4>
              <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                {task.description || 'No description provided.'}
              </div>
            </div>

            {/* Subtasks Checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5" /> Subtasks (
                  {task.subtasks?.filter((s) => s.status === 'completed').length || 0}/
                  {task.subtasks?.length || 0})
                </h4>
                <button
                  onClick={() => setShowAddSubtask(!showAddSubtask)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Subtask
                </button>
              </div>

              {showAddSubtask && (
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Subtask title..."
                    className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newSubtaskTitle.trim()) {
                        createSubtaskMutation.mutate(newSubtaskTitle.trim());
                      }
                    }}
                  />
                  <button
                    disabled={!newSubtaskTitle.trim() || createSubtaskMutation.isPending}
                    onClick={() => createSubtaskMutation.mutate(newSubtaskTitle.trim())}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {task.subtasks && task.subtasks.length > 0 ? (
                  task.subtasks.map((sub) => {
                    const isDone = sub.status === 'completed';
                    return (
                      <div
                        key={sub.id}
                        className={`flex items-center justify-between p-3 rounded-lg border text-xs transition ${
                          isDone
                            ? 'bg-emerald-50/40 border-emerald-200 text-slate-500'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() =>
                              updateSubtaskStatusMutation.mutate({
                                subtaskId: sub.id,
                                status: isDone ? 'in_progress' : 'completed',
                              })
                            }
                            className={`p-0.5 rounded transition ${
                              isDone ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <span className={`font-mono text-[10px] text-slate-400`}>
                            {sub.task_code}
                          </span>
                          <span className={isDone ? 'line-through text-slate-400' : 'font-medium'}>
                            {sub.title}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded uppercase font-semibold ${
                            TASK_STATUS_CONFIG[sub.status]?.bg || 'bg-slate-100'
                          } ${TASK_STATUS_CONFIG[sub.status]?.color || 'text-slate-600'}`}
                        >
                          {sub.status.replace('_', ' ')}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 italic">No subtasks created yet.</p>
                )}
              </div>
            </div>

            {/* Comments Thread */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Comments ({task.comments?.length || 0})
              </h4>

              <div className="space-y-3 mb-4">
                {task.comments && task.comments.length > 0 ? (
                  task.comments.map((c) => (
                    <div
                      key={c.id}
                      className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-800">{c.user_name}</span>
                        <span>{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-700 whitespace-pre-wrap">{c.comment}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No comments yet.</p>
                )}
              </div>

              {/* Add comment box */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment or review note..."
                  className="flex-1 text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && commentText.trim()) {
                      addCommentMutation.mutate(commentText.trim());
                    }
                  }}
                />
                <button
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                  onClick={() => addCommentMutation.mutate(commentText.trim())}
                  className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
                  title="Send Comment"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Activity History Timeline */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Activity History ({task.history?.length || 0})
              </h4>
              <div className="space-y-2 border-l-2 border-slate-200 pl-3 ml-1 text-xs">
                {task.history && task.history.length > 0 ? (
                  task.history.map((h) => (
                    <div key={h.id} className="relative pb-2">
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span className="font-semibold text-slate-700">{h.user_name}</span>
                        <span>•</span>
                        <span>{new Date(h.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-slate-600 flex items-center gap-1 mt-0.5">
                        <CornerDownRight className="w-3 h-3 text-slate-400" />
                        <span>
                          Changed <strong className="text-slate-800">{h.field_changed}</strong> from{' '}
                          <code className="bg-slate-100 px-1 rounded text-slate-700">
                            {h.old_value || 'none'}
                          </code>{' '}
                          to{' '}
                          <code className="bg-indigo-50 text-indigo-700 px-1 rounded font-semibold">
                            {h.new_value}
                          </code>
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No history logged yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
