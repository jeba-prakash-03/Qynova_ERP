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
import { Clock, User } from 'lucide-react';

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
      className={`p-3.5 bg-[#e2e8dc] rounded-[18px] border border-[rgba(76,91,70,0.16)] shadow-[3px_4px_12px_rgba(88,104,84,0.18),-2px_-2px_6px_rgba(255,255,255,0.7)] hover:shadow-[5px_6px_16px_rgba(88,104,84,0.26),-3px_-3px_8px_rgba(255,255,255,0.85)] transition-all cursor-grab active:cursor-grabbing select-none group ${
        isDragging ? 'opacity-40 ring-2 ring-[#14776b]' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-[#dbe2d5] text-[#14776b] rounded-[8px] border border-[rgba(76,91,70,0.16)]">
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

      <h4 className="text-xs font-bold text-[#26301f] line-clamp-2 leading-snug group-hover:text-[#14776b] transition font-display">
        {task.title}
      </h4>

      {task.module_name && (
        <span className="inline-block mt-2 text-[10px] px-1.5 py-0.5 bg-[#dbe2d5] text-[#35422d] rounded-[8px] border border-[rgba(76,91,70,0.12)] font-medium">
          {task.module_name}
        </span>
      )}

      <div className="flex items-center justify-between text-[11px] text-[#6b7663] mt-3 pt-2.5 border-t border-[rgba(76,91,70,0.10)]">
        <div className="flex items-center gap-1.5">
          <User className="w-3 h-3 text-[#6b7663]" />
          <span className="truncate max-w-[90px] font-medium text-[#26301f]">
            {task.assignee_name || 'Unassigned'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {task.actual_hours > 0 && (
            <span className="flex items-center gap-0.5 text-[#1b4e23] font-semibold text-[10px] tabular-nums">
              <Clock className="w-2.5 h-2.5" />
              {Number(task.actual_hours).toFixed(1)}h
            </span>
          )}
          {task.due_date && (
            <span className="text-[10px] text-[#6b7663] tabular-nums">
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
      className={`w-72 flex-shrink-0 flex flex-col rounded-[22px] border transition-all duration-200 ${
        isOver && isAllowedDrop
          ? 'bg-[#14776b]/15 border-[#14776b] ring-2 ring-[#14776b]/30'
          : isOver && !isAllowedDrop
          ? 'bg-[#f4ded6]/60 border-[#c4643f]/50'
          : activeTask && !isAllowedDrop && !isCurrentStatus
          ? 'bg-[#dbe2d5]/40 border-[rgba(76,91,70,0.10)] opacity-60'
          : 'bg-[#dbe2d5]/60 border-[rgba(76,91,70,0.14)] shadow-[inset_1px_1px_3px_rgba(104,118,100,0.10)]'
      }`}
    >
      {/* Column Header */}
      <div className="p-3 border-b border-[rgba(76,91,70,0.12)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              status === 'completed'
                ? 'bg-[#3f8f4a]'
                : status === 'in_progress'
                ? 'bg-[#14776b]'
                : status === 'changes_required'
                ? 'bg-[#c4643f]'
                : status === 'code_review'
                ? 'bg-[#cf9b34]'
                : 'bg-[#6b7663]'
            }`}
          />
          <h3 className="text-xs font-bold text-[#26301f] font-display tracking-wide uppercase">
            {config.label}
          </h3>
          <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-[#e2e8dc] text-[#26301f] border border-[rgba(76,91,70,0.14)]">
            {tasks.length}
          </span>
        </div>

        {activeTask && isAllowedDrop && (
          <span className="text-[10px] font-bold text-[#14776b] uppercase tracking-wider animate-pulse font-display">
            Allowed
          </span>
        )}
      </div>

      {/* Task List */}
      <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[140px] no-scrollbar">
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} onClick={onCardClick} />
        ))}

        {tasks.length === 0 && (
          <div className="h-24 border border-dashed border-[rgba(76,91,70,0.22)] rounded-[16px] flex items-center justify-center text-[11px] text-[#6b7663]">
            Drop task here
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
          <div className="w-72 p-3.5 bg-[#e2e8dc] rounded-[18px] border-2 border-[#14776b] shadow-2xl opacity-95 rotate-2 cursor-grabbing pointer-events-none">
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-[#dbe2d5] text-[#14776b] rounded-[8px] border border-[rgba(76,91,70,0.18)]">
              {activeTask.task_code}
            </span>
            <h4 className="text-xs font-bold text-[#26301f] line-clamp-2 mt-2 font-display">
              {activeTask.title}
            </h4>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default TaskKanbanBoard;
