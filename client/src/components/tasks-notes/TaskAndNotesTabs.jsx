import React from "react";
import { CheckSquare, ShoppingCart, FileText, LayoutGrid } from "lucide-react";

const TaskAndNotesTabs = ({ activeTab, onSelectTab, summary }) => {
    const tabs = [
        {
            id: "all",
            label: "All Items",
            icon: LayoutGrid,
            count: (summary?.pendingTasks || 0) + (summary?.pendingShopping || 0) + (summary?.totalNotes || 0),
        },
        {
            id: "tasks",
            label: "To-Do List",
            icon: CheckSquare,
            count: summary?.pendingTasks || 0,
            badgeColor: summary?.overdueTasks > 0 ? "bg-rose-500 text-white" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
        },
        {
            id: "shopping",
            label: "Shopping List",
            icon: ShoppingCart,
            count: summary?.pendingShopping || 0,
            badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
        },
        {
            id: "notes",
            label: "Notes & Info",
            icon: FileText,
            count: summary?.totalNotes || 0,
            badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
        },
    ];

    return (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onSelectTab(tab.id)}
                        className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                            isActive
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200/80 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-800"
                        }`}
                    >
                        <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-gray-400"}`} />
                        <span>{tab.label}</span>
                        {typeof tab.count === "number" && tab.count > 0 && (
                            <span
                                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                                    isActive
                                        ? "bg-white/20 text-white"
                                        : tab.badgeColor || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                }`}
                            >
                                {tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default TaskAndNotesTabs;
