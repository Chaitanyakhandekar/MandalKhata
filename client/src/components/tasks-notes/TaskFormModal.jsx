import React, { useState, useEffect } from "react";
import { X, CheckSquare, Calendar, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

const TaskFormModal = ({ isOpen, onClose, onSubmit, editingTask, isSubmitting }) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("medium");
    const [dueDate, setDueDate] = useState("");

    useEffect(() => {
        if (editingTask) {
            setTitle(editingTask.title || "");
            setDescription(editingTask.description || "");
            setPriority(editingTask.priority || "medium");
            if (editingTask.dueDate) {
                // Format to YYYY-MM-DD for date input
                const d = new Date(editingTask.dueDate);
                const isoDate = d.toISOString().split("T")[0];
                setDueDate(isoDate);
            } else {
                setDueDate("");
            }
        } else {
            setTitle("");
            setDescription("");
            setPriority("medium");
            setDueDate("");
        }
    }, [editingTask, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error("Task title is required");
            return;
        }

        onSubmit({
            title: title.trim(),
            description: description.trim(),
            priority,
            dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-lg my-auto rounded-2xl sm:rounded-3xl bg-white shadow-2xl dark:bg-gray-900 dark:border dark:border-gray-800 animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 p-4 sm:p-6 dark:border-gray-800">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                            <CheckSquare className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                                {editingTask ? "Edit Task" : "Add New Task"}
                            </h3>
                            <p className="text-xs text-gray-400">
                                {editingTask
                                    ? "Update task details, deadline or priority"
                                    : "Keep track of preparations and coordination"}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="p-4 sm:p-6 space-y-4 max-h-[72vh] overflow-y-auto">
                        {/* Title */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                Task Title <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Book sound system & lighting generator"
                                maxLength={200}
                                autoFocus
                                required
                                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                Description (Optional)
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                placeholder="Add key points, contact persons, or location notes..."
                                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 resize-none"
                            />
                        </div>

                        {/* Priority Selector */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                Priority Level
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { value: "low", label: "Low", color: "text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900" },
                                    { value: "medium", label: "Medium", color: "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900" },
                                    { value: "high", label: "High", color: "text-rose-700 border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900" }
                                ].map((p) => {
                                    const isSelected = priority === p.value;
                                    return (
                                        <button
                                            key={p.value}
                                            type="button"
                                            onClick={() => setPriority(p.value)}
                                            className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                                                isSelected
                                                    ? `${p.color} ring-2 ring-indigo-500 shadow-sm`
                                                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400"
                                            }`}
                                        >
                                            {p.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Due Date */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                Due Date (Optional)
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-2.5 border-t border-gray-100 p-4 sm:p-6 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition-colors disabled:opacity-50"
                        >
                            {isSubmitting
                                ? "Saving..."
                                : editingTask
                                ? "Update Task"
                                : "Save Task"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TaskFormModal;
