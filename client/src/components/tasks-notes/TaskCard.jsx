import React, { useState } from "react";
import {
    Calendar,
    Clock,
    AlertCircle,
    Check,
    Pencil,
    Trash2,
    ChevronDown,
    ChevronUp
} from "lucide-react";

const priorityStyles = {
    high: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50",
    medium: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50",
    low: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50"
};

const priorityLabels = {
    high: "High Priority",
    medium: "Medium Priority",
    low: "Low Priority"
};

const formatDueDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();

    const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
        date.getDate() === tomorrow.getDate() &&
        date.getMonth() === tomorrow.getMonth() &&
        date.getFullYear() === tomorrow.getFullYear();

    if (isToday) return "Today";
    if (isTomorrow) return "Tomorrow";

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined
    });
};

const isTaskOverdue = (dueDate, isCompleted) => {
    if (!dueDate || isCompleted) return false;
    const due = new Date(dueDate);
    const now = new Date();
    // Compare end of day or date time
    return due < now;
};

const TaskCard = ({ task, onToggle, onEdit, onDelete, isToggling }) => {
    const [expanded, setExpanded] = useState(false);
    const overdue = isTaskOverdue(task.dueDate, task.isCompleted);
    const formattedDue = formatDueDate(task.dueDate);

    return (
        <div
            className={`group relative rounded-xl sm:rounded-2xl border p-3.5 sm:p-4 transition-all duration-200 ${
                task.isCompleted
                    ? "border-gray-200/80 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-900/40 opacity-75"
                    : overdue
                    ? "border-rose-200 bg-white shadow-sm hover:border-rose-300 dark:border-rose-900/50 dark:bg-gray-900"
                    : "border-gray-100 bg-white shadow-sm hover:border-gray-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            }`}
        >
            <div className="flex items-start gap-3">
                {/* Custom Checkbox */}
                <button
                    type="button"
                    onClick={() => onToggle(task._id)}
                    disabled={isToggling}
                    aria-label={task.isCompleted ? "Mark task pending" : "Mark task completed"}
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                        task.isCompleted
                            ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500"
                            : "border-gray-300 bg-white hover:border-emerald-500 hover:bg-emerald-50 text-transparent dark:border-gray-700 dark:bg-gray-950 dark:hover:border-emerald-500"
                    } disabled:opacity-50`}
                >
                    <Check className={`h-4 w-4 stroke-[3] transition-transform ${task.isCompleted ? "scale-100" : "scale-0 group-hover:scale-75 text-gray-300"}`} />
                </button>

                {/* Content Area */}
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {/* Priority Badge */}
                        <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                priorityStyles[task.priority] || priorityStyles.medium
                            }`}
                        >
                            {priorityLabels[task.priority] || "Medium"}
                        </span>

                        {/* Overdue Badge */}
                        {overdue && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse">
                                <AlertCircle className="h-3 w-3" />
                                Overdue
                            </span>
                        )}

                        {/* Due Date Display */}
                        {formattedDue && (
                            <span
                                className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                                    overdue
                                        ? "text-rose-600 dark:text-rose-400 font-semibold"
                                        : "text-gray-500 dark:text-gray-400"
                                }`}
                            >
                                <Calendar className="h-3 w-3" />
                                Due: {formattedDue}
                            </span>
                        )}
                    </div>

                    {/* Task Title */}
                    <h4
                        className={`text-sm sm:text-base font-semibold text-gray-900 dark:text-white break-words ${
                            task.isCompleted ? "line-through text-gray-400 dark:text-gray-500" : ""
                        }`}
                    >
                        {task.title}
                    </h4>

                    {/* Description preview / full */}
                    {task.description && (
                        <div className="mt-1">
                            <p
                                className={`text-xs text-gray-600 dark:text-gray-400 break-words whitespace-pre-line leading-relaxed ${
                                    !expanded && task.description.length > 90 ? "line-clamp-2" : ""
                                }`}
                            >
                                {task.description}
                            </p>
                            {task.description.length > 90 && (
                                <button
                                    type="button"
                                    onClick={() => setExpanded(!expanded)}
                                    className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                                >
                                    {expanded ? (
                                        <>
                                            Show less <ChevronUp className="h-3 w-3" />
                                        </>
                                    ) : (
                                        <>
                                            Read more <ChevronDown className="h-3 w-3" />
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Completed timestamp if available */}
                    {task.isCompleted && task.completedAt && (
                        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-400">
                            <Clock className="h-2.5 w-2.5" />
                            Completed on{" "}
                            {new Date(task.completedAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit"
                            })}
                        </p>
                    )}
                </div>

                {/* Actions (Edit / Delete) */}
                <div className="flex shrink-0 items-center gap-1">
                    <button
                        type="button"
                        onClick={() => onEdit(task)}
                        title="Edit task"
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(task)}
                        title="Delete task"
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskCard;
