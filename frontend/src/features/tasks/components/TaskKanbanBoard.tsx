import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  Task,
  TaskStatus,
  TASK_STATUS_CONFIG,
  TASK_PRIORITY_CONFIG,
  VALID_STATUS_TRANSITIONS,
} from '../types';
import { Clock, User, CheckSquare } from 'lucide-react';

const COLUMNS: TaskStatus[] = [
  'backlog',
  'todo',
  'in_progress',
  'code_review',
  'changes_required',
  'testing',
  'qa_passed',
  'completed',
];

interface KanbanCardProps {
  task: Task;
  onClick: (task: Task) => void;
  isDragging?: boolean;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ task, onClick, isDragging }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `task-${task.id}`,
    data: { task },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task)}
      className={`p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition cursor-grab active:cursor-grabbing select-none group ${
        isDragging ? 'opacity-40 ring-2 ring-indigo-500' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
          {task.task_code}
        </span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
            TASK_PRIORITY_CONFIG[task.priority]?.badge
          }`}
        >
          {task.priority}
        </span>
      </div>

      <h4 className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug group-hover:text-indigo-600 transition">
        {task.title}
      </h4>

      {task.module_name && (
        <span className="inline-block mt-2 text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded border border-slate-100 font-medium">
          {task.module_name}
        </span>
      )}

      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <User className="w-3 h-3 text-slate-400" />
          <span className="truncate max-w-[90px] font-medium text-slate-600">
            {task.assignee_name || 'Unassigned'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {task.actual_hours > 0 && (
            <span className="flex items-center gap-0.5 text-emerald-600 font-semibold text-[10px]">
              <Clock className="w-2.5 h-2.5" />
              {Number(task.actual_hours).toFixed(1)}h
            </span>
          )}
          {task.due_date && (
            <span className="text-[10px] text-slate-400">
              {new Date(task.due_date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  activeTask: Task | null;
  onCardClick: (task: Task) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  tasks,
  activeTask,
  onCardClick,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `col-${status}`,
    data: { status },
  });

  const config = TASK_STATUS_CONFIG[status];
  const isAllowedDrop =
    activeTask && VALID_STATUS_TRANSITIONS[activeTask.status]?.includes(status);
  const isCurrentStatus = activeTask && activeTask.status === status;

  return (
    <div
      ref={setNodeRef}
      className={`w-72 flex-shrink-0 flex flex-col rounded-2xl border transition-all duration-200 ${
        isOver && isAllowedDrop
          ? 'bg-indigo-50/50 border-indigo-400 ring-2 ring-indigo-400/30'
          : isOver && !isAllowedDrop
          ? 'bg-rose-50/40 border-rose-300'
          : activeTask && !isAllowedDrop && !isCurrentStatus
          ? 'bg-slate-100/50 border-slate-200 opacity-60'
          : 'bg-slate-50/70 border-slate-200'
      }`}
    >
      {/* Column Header */}
      <div className="p-3 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              status === 'completed'
                ? 'bg-emerald-500'
                : status === 'in_progress'
                ? 'bg-indigo-500'
                : status === 'changes_required'
                ? 'bg-rose-500'
                : status === 'code_review'
                ? 'bg-amber-500'
                : 'bg-slate-400'
            }`}
          />
          <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
            {config.label}
          </h3>
          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-200/80 text-slate-600">
            {tasks.length}
          </span>
        </div>

        {activeTask && isAllowedDrop && (
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider animate-pulse">
            Allowed
          </span>
        )}
      </div>

      {/* Task List */}
      <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[140px]">
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} onClick={onCardClick} />
        ))}

        {tasks.length === 0 && (
          <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[11px] text-slate-400 italic">
            Empty
          </div>
        )}
      </div>
    </div>
  );
};

interface TaskKanbanBoardProps {
  tasks: Task[];
  onStatusChange: (taskId: number, newStatus: TaskStatus) => void;
  onCardClick: (task: Task) => void;
}

export const TaskKanbanBoard: React.FC<TaskKanbanBoardProps> = ({
  tasks,
  onStatusChange,
  onCardClick,
}) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task;
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const task = active.data.current?.task as Task;
    const targetStatus = over.data.current?.status as TaskStatus;

    if (!task || !targetStatus || task.status === targetStatus) return;

    // Check if transition is allowed
    const allowed = VALID_STATUS_TRANSITIONS[task.status] || [];
    if (allowed.includes(targetStatus)) {
      onStatusChange(task.id, targetStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start">
        {COLUMNS.map((colStatus) => {
          const colTasks = tasks.filter((t) => t.status === colStatus);
          return (
            <KanbanColumn
              key={colStatus}
              status={colStatus}
              tasks={colTasks}
              activeTask={activeTask}
              onCardClick={onCardClick}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="w-72 p-3.5 bg-white rounded-xl border-2 border-indigo-500 shadow-2xl opacity-90 rotate-2 cursor-grabbing pointer-events-none">
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
              {activeTask.task_code}
            </span>
            <h4 className="text-xs font-semibold text-slate-800 line-clamp-2 mt-2">
              {activeTask.title}
            </h4>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
