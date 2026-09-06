import React, { useState } from "react";
import { X, Copy, Check, Calendar, Bell, Pencil } from "lucide-react";
import toast from "react-hot-toast";

const NoteViewModal = ({ isOpen, onClose, note, onEdit }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !note) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(`${note.title}\n\n${note.content}`);
            setCopied(true);
            toast.success("Note copied to clipboard");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy note");
        }
    };

    const formattedCreated = new Date(note.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

    const formattedReminder = note.reminderDate
        ? new Date(note.reminderDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit"
          })
        : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-lg my-auto rounded-2xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl dark:bg-gray-900 dark:border dark:border-gray-800 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[88vh]">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                    <div className="min-w-0 flex-1 pr-3">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white break-words">
                            {note.title}
                        </h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formattedCreated}
                            </span>
                            {formattedReminder && (
                                <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                                    <Bell className="h-3 w-3" />
                                    Reminder: {formattedReminder}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="my-4 flex-1 overflow-y-auto pr-1">
                    <div className="rounded-xl bg-gray-50/70 p-4 text-xs sm:text-sm text-gray-700 dark:bg-gray-950/60 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {note.content}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-4">
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                    >
                        {copied ? (
                            <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                            </>
                        ) : (
                            <>
                                <Copy className="h-3.5 w-3.5" /> Copy
                            </>
                        )}
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onEdit(note);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition-colors"
                        >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NoteViewModal;
