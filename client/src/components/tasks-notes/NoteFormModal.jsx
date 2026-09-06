import React, { useState, useEffect } from "react";
import { X, FileText, Bell } from "lucide-react";
import toast from "react-hot-toast";

const NoteFormModal = ({ isOpen, onClose, onSubmit, editingNote, isSubmitting }) => {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [reminderDate, setReminderDate] = useState("");

    useEffect(() => {
        if (editingNote) {
            setTitle(editingNote.title || "");
            setContent(editingNote.content || "");
            if (editingNote.reminderDate) {
                // Convert to YYYY-MM-DDTHH:mm for datetime-local
                const d = new Date(editingNote.reminderDate);
                const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16);
                setReminderDate(localIso);
            } else {
                setReminderDate("");
            }
        } else {
            setTitle("");
            setContent("");
            setReminderDate("");
        }
    }, [editingNote, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error("Note title is required");
            return;
        }
        if (!content.trim()) {
            toast.error("Note content is required");
            return;
        }

        onSubmit({
            title: title.trim(),
            content: content.trim(),
            reminderDate: reminderDate ? new Date(reminderDate).toISOString() : null,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-lg my-auto rounded-2xl sm:rounded-3xl bg-white shadow-2xl dark:bg-gray-900 dark:border dark:border-gray-800 animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 p-4 sm:p-6 dark:border-gray-800">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                                {editingNote ? "Edit Note" : "Create New Note"}
                            </h3>
                            <p className="text-xs text-gray-400">
                                {editingNote
                                    ? "Update information, reminders or guidelines"
                                    : "Save important guidelines, contact lists & reminders"}
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
                                Note Title <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Aarti timings & Priest contact details"
                                maxLength={200}
                                autoFocus
                                required
                                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 outline-none transition-colors focus:border-purple-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                            />
                        </div>

                        {/* Reminder Date / Time */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                Reminder / Event Date (Optional)
                            </label>
                            <input
                                type="datetime-local"
                                value={reminderDate}
                                onChange={(e) => setReminderDate(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 outline-none transition-colors focus:border-purple-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                            />
                        </div>

                        {/* Content */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                Note Content <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={6}
                                placeholder="Write important guidelines, instructions, names, phone numbers, or checklist..."
                                required
                                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 outline-none transition-colors focus:border-purple-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 leading-relaxed resize-none"
                            />
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
                            className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-xl shadow-sm transition-colors disabled:opacity-50"
                        >
                            {isSubmitting
                                ? "Saving..."
                                : editingNote
                                ? "Update Note"
                                : "Save Note"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NoteFormModal;
