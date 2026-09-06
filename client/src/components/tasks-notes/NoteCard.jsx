import React from "react";
import { FileText, Bell, Calendar, Pencil, Trash2, ExternalLink } from "lucide-react";

const NoteCard = ({ note, onSelect, onEdit, onDelete }) => {
    const formattedCreated = new Date(note.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });

    const formattedReminder = note.reminderDate
        ? new Date(note.reminderDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit"
          })
        : null;

    return (
        <div className="group relative rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm hover:border-gray-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 transition-all duration-200 flex flex-col justify-between">
            <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                            <FileText className="h-4 w-4" />
                        </div>
                        <h4
                            onClick={() => onSelect(note)}
                            className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                            {note.title}
                        </h4>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1">
                        <button
                            type="button"
                            onClick={() => onEdit(note)}
                            title="Edit note"
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onDelete(note)}
                            title="Delete note"
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                {/* Reminder badge if present */}
                {formattedReminder && (
                    <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-indigo-100 bg-indigo-50/70 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-300">
                        <Bell className="h-3 w-3" />
                        <span>Reminder: {formattedReminder}</span>
                    </div>
                )}

                {/* Content snippet */}
                <p
                    onClick={() => onSelect(note)}
                    className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-4 whitespace-pre-line leading-relaxed cursor-pointer hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
                >
                    {note.content}
                </p>
            </div>

            {/* Footer with date and view trigger */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1 text-[11px]">
                    <Calendar className="h-3 w-3" />
                    {formattedCreated}
                </span>

                <button
                    type="button"
                    onClick={() => onSelect(note)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                    Read full note <ExternalLink className="h-3 w-3" />
                </button>
            </div>
        </div>
    );
};

export default NoteCard;
