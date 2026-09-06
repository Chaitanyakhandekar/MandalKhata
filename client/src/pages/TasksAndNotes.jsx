import React, { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout.jsx";
import { taskNoteApi } from "../api/taskNote.api.js";
import { useMandalStore } from "../store/useMandalStore.js";
import TaskCard from "../components/tasks-notes/TaskCard.jsx";
import ShoppingItem from "../components/tasks-notes/ShoppingItem.jsx";
import NoteCard from "../components/tasks-notes/NoteCard.jsx";
import TaskFormModal from "../components/tasks-notes/TaskFormModal.jsx";
import ShoppingItemFormModal from "../components/tasks-notes/ShoppingItemFormModal.jsx";
import NoteFormModal from "../components/tasks-notes/NoteFormModal.jsx";
import NoteViewModal from "../components/tasks-notes/NoteViewModal.jsx";
import DeleteConfirmModal from "../components/tasks-notes/DeleteConfirmModal.jsx";
import TaskAndNotesTabs from "../components/tasks-notes/TaskAndNotesTabs.jsx";
import {
    CheckSquare,
    ShoppingCart,
    FileText,
    Plus,
    Search,
    Share2,
    CheckCircle2,
    Clock,
    AlertCircle,
    ListTodo,
    ChevronDown,
    ChevronUp,
    Sparkles,
    Calendar,
    Filter,
} from "lucide-react";
import toast from "react-hot-toast";

const TasksAndNotes = () => {
    const { selectedYear } = useMandalStore();

    // Active tab: "all", "tasks", "shopping", "notes"
    const [activeTab, setActiveTab] = useState("all");

    // Search and filters
    const [searchQuery, setSearchQuery] = useState("");
    const [taskStatusFilter, setTaskStatusFilter] = useState("all"); // "all", "pending", "completed"
    const [taskPriorityFilter, setTaskPriorityFilter] = useState("all"); // "all", "high", "medium", "low"
    const [shoppingStatusFilter, setShoppingStatusFilter] = useState("all"); // "all", "pending", "purchased"

    // Data states
    const [summary, setSummary] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [shoppingItems, setShoppingItems] = useState([]);
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Collapsible completed sections
    const [showCompletedTasks, setShowCompletedTasks] = useState(true);
    const [showPurchasedShopping, setShowPurchasedShopping] = useState(true);

    // Modals
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [isSavingTask, setIsSavingTask] = useState(false);
    const [togglingTaskId, setTogglingTaskId] = useState(null);

    const [isShoppingModalOpen, setIsShoppingModalOpen] = useState(false);
    const [editingShoppingItem, setEditingShoppingItem] = useState(null);
    const [isSavingShopping, setIsSavingShopping] = useState(false);
    const [togglingShoppingId, setTogglingShoppingId] = useState(null);

    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [isSavingNote, setIsSavingNote] = useState(false);

    const [viewingNote, setViewingNote] = useState(null);

    // Delete confirmation state
    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        type: null, // "task" | "shopping" | "note"
        item: null,
        isDeleting: false,
    });

    // Fetch all module data
    const fetchData = useCallback(async () => {
        if (!selectedYear) return;
        setLoading(true);
        try {
            const [sumRes, tasksRes, shoppingRes, notesRes] = await Promise.all([
                taskNoteApi.getSummary({ festivalYear: selectedYear }),
                taskNoteApi.getTasks({ festivalYear: selectedYear }),
                taskNoteApi.getShoppingItems({ festivalYear: selectedYear }),
                taskNoteApi.getNotes({ festivalYear: selectedYear }),
            ]);

            if (sumRes.success) setSummary(sumRes.data);
            if (tasksRes.success) setTasks(tasksRes.data);
            if (shoppingRes.success) setShoppingItems(shoppingRes.data);
            if (notesRes.success) setNotes(notesRes.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load Tasks & Notes data");
        } finally {
            setLoading(false);
        }
    }, [selectedYear]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Quick refresh of summary
    const refreshSummary = async () => {
        if (!selectedYear) return;
        const res = await taskNoteApi.getSummary({ festivalYear: selectedYear });
        if (res.success) setSummary(res.data);
    };

    // ==================== TASK ACTIONS ====================
    const handleSaveTask = async (formData) => {
        setIsSavingTask(true);
        try {
            if (editingTask) {
                const res = await taskNoteApi.updateTask(editingTask._id, formData);
                if (res.success) {
                    toast.success("Task updated successfully");
                    setTasks((prev) =>
                        prev.map((t) => (t._id === editingTask._id ? res.data : t))
                    );
                    setIsTaskModalOpen(false);
                    setEditingTask(null);
                    refreshSummary();
                } else {
                    toast.error(res.message || "Failed to update task");
                }
            } else {
                const res = await taskNoteApi.createTask({
                    ...formData,
                    festivalYear: selectedYear,
                });
                if (res.success) {
                    toast.success("Task created successfully");
                    setTasks((prev) => [res.data, ...prev]);
                    setIsTaskModalOpen(false);
                    refreshSummary();
                } else {
                    toast.error(res.message || "Failed to create task");
                }
            }
        } catch (err) {
            console.error(err);
            toast.error("An error occurred while saving task");
        } finally {
            setIsSavingTask(false);
        }
    };

    const handleToggleTask = async (id) => {
        setTogglingTaskId(id);
        try {
            const res = await taskNoteApi.toggleTaskComplete(id);
            if (res.success) {
                setTasks((prev) =>
                    prev.map((t) => (t._id === id ? res.data : t))
                );
                refreshSummary();
            } else {
                toast.error(res.message || "Failed to toggle task");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to toggle task");
        } finally {
            setTogglingTaskId(null);
        }
    };

    const handleOpenEditTask = (task) => {
        setEditingTask(task);
        setIsTaskModalOpen(true);
    };

    const handleDeleteTaskPrompt = (task) => {
        setDeleteModal({
            isOpen: true,
            type: "task",
            item: task,
            isDeleting: false,
        });
    };

    // ==================== SHOPPING ACTIONS ====================
    const handleSaveShoppingItem = async (formData) => {
        setIsSavingShopping(true);
        try {
            if (editingShoppingItem) {
                const res = await taskNoteApi.updateShoppingItem(
                    editingShoppingItem._id,
                    formData
                );
                if (res.success) {
                    toast.success("Shopping item updated");
                    setShoppingItems((prev) =>
                        prev.map((i) =>
                            i._id === editingShoppingItem._id ? res.data : i
                        )
                    );
                    setIsShoppingModalOpen(false);
                    setEditingShoppingItem(null);
                    refreshSummary();
                } else {
                    toast.error(res.message || "Failed to update shopping item");
                }
            } else {
                const res = await taskNoteApi.createShoppingItem({
                    ...formData,
                    festivalYear: selectedYear,
                });
                if (res.success) {
                    toast.success("Shopping item added");
                    setShoppingItems((prev) => [res.data, ...prev]);
                    setIsShoppingModalOpen(false);
                    refreshSummary();
                } else {
                    toast.error(res.message || "Failed to add item");
                }
            }
        } catch (err) {
            console.error(err);
            toast.error("An error occurred while saving shopping item");
        } finally {
            setIsSavingShopping(false);
        }
    };

    const handleToggleShopping = async (id) => {
        setTogglingShoppingId(id);
        try {
            const res = await taskNoteApi.toggleShoppingItemPurchased(id);
            if (res.success) {
                setShoppingItems((prev) =>
                    prev.map((i) => (i._id === id ? res.data : i))
                );
                refreshSummary();
            } else {
                toast.error(res.message || "Failed to toggle item");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to toggle item");
        } finally {
            setTogglingShoppingId(null);
        }
    };

    const handleOpenEditShopping = (item) => {
        setEditingShoppingItem(item);
        setIsShoppingModalOpen(true);
    };

    const handleDeleteShoppingPrompt = (item) => {
        setDeleteModal({
            isOpen: true,
            type: "shopping",
            item,
            isDeleting: false,
        });
    };

    // Share shopping list via Web Share API or Clipboard fallback
    const handleShareShoppingList = async () => {
        if (!shoppingItems || shoppingItems.length === 0) {
            toast.error("Shopping list is empty");
            return;
        }

        const pending = shoppingItems.filter((i) => !i.isPurchased);
        const purchased = shoppingItems.filter((i) => i.isPurchased);

        let shareText = `🛒 *Mandal Festival Shopping List (${selectedYear || "Active Year"})*\n`;
        shareText += `Generated on: ${new Date().toLocaleDateString("en-IN")}\n\n`;

        if (pending.length > 0) {
            shareText += `📋 *To Buy (${pending.length} items):*\n`;
            pending.forEach((item, idx) => {
                shareText += `${idx + 1}. [ ] ${item.itemName} - ${item.quantity} ${item.unit}${
                    item.note ? ` (${item.note})` : ""
                }\n`;
            });
            shareText += "\n";
        }

        if (purchased.length > 0) {
            shareText += `✅ *Already Purchased (${purchased.length} items):*\n`;
            purchased.forEach((item, idx) => {
                shareText += `${idx + 1}. [✓] ${item.itemName} - ${item.quantity} ${item.unit}\n`;
            });
        }

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Mandal Shopping List ${selectedYear || ""}`,
                    text: shareText,
                });
                return;
            } catch (err) {
                // If user dismissed share dialog or API failed, fallback to clipboard
                if (err.name !== "AbortError") {
                    console.log("Share failed, falling back to clipboard", err);
                }
            }
        }

        try {
            await navigator.clipboard.writeText(shareText);
            toast.success("Shopping list copied to clipboard! Ready to share on WhatsApp.");
        } catch {
            toast.error("Unable to copy to clipboard");
        }
    };

    // ==================== NOTE ACTIONS ====================
    const handleSaveNote = async (formData) => {
        setIsSavingNote(true);
        try {
            if (editingNote) {
                const res = await taskNoteApi.updateNote(editingNote._id, formData);
                if (res.success) {
                    toast.success("Note updated");
                    setNotes((prev) =>
                        prev.map((n) => (n._id === editingNote._id ? res.data : n))
                    );
                    setIsNoteModalOpen(false);
                    setEditingNote(null);
                    refreshSummary();
                } else {
                    toast.error(res.message || "Failed to update note");
                }
            } else {
                const res = await taskNoteApi.createNote({
                    ...formData,
                    festivalYear: selectedYear,
                });
                if (res.success) {
                    toast.success("Note saved");
                    setNotes((prev) => [res.data, ...prev]);
                    setIsNoteModalOpen(false);
                    refreshSummary();
                } else {
                    toast.error(res.message || "Failed to save note");
                }
            }
        } catch (err) {
            console.error(err);
            toast.error("An error occurred while saving note");
        } finally {
            setIsSavingNote(false);
        }
    };

    const handleOpenEditNote = (note) => {
        setEditingNote(note);
        setIsNoteModalOpen(true);
    };

    const handleDeleteNotePrompt = (note) => {
        setDeleteModal({
            isOpen: true,
            type: "note",
            item: note,
            isDeleting: false,
        });
    };

    // ==================== SHARED DELETE CONFIRMATION ====================
    const handleConfirmDelete = async () => {
        const { type, item } = deleteModal;
        if (!type || !item) return;

        setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
        try {
            if (type === "task") {
                const res = await taskNoteApi.deleteTask(item._id);
                if (res.success) {
                    toast.success("Task deleted");
                    setTasks((prev) => prev.filter((t) => t._id !== item._id));
                    refreshSummary();
                } else {
                    toast.error(res.message || "Failed to delete task");
                }
            } else if (type === "shopping") {
                const res = await taskNoteApi.deleteShoppingItem(item._id);
                if (res.success) {
                    toast.success("Shopping item deleted");
                    setShoppingItems((prev) =>
                        prev.filter((i) => i._id !== item._id)
                    );
                    refreshSummary();
                } else {
                    toast.error(res.message || "Failed to delete item");
                }
            } else if (type === "note") {
                const res = await taskNoteApi.deleteNote(item._id);
                if (res.success) {
                    toast.success("Note deleted");
                    setNotes((prev) => prev.filter((n) => n._id !== item._id));
                    refreshSummary();
                } else {
                    toast.error(res.message || "Failed to delete note");
                }
            }
            setDeleteModal({ isOpen: false, type: null, item: null, isDeleting: false });
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete item");
            setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
        }
    };

    // ==================== FILTERING & SEARCH LOGIC ====================
    const normalizedQuery = searchQuery.trim().toLowerCase();

    // Filtered Tasks
    const filteredTasks = tasks.filter((t) => {
        if (normalizedQuery) {
            const matches =
                t.title.toLowerCase().includes(normalizedQuery) ||
                (t.description && t.description.toLowerCase().includes(normalizedQuery));
            if (!matches) return false;
        }
        if (taskStatusFilter === "pending" && t.isCompleted) return false;
        if (taskStatusFilter === "completed" && !t.isCompleted) return false;
        if (taskPriorityFilter !== "all" && t.priority !== taskPriorityFilter)
            return false;
        return true;
    });

    const pendingTasks = filteredTasks.filter((t) => !t.isCompleted);
    const completedTasks = filteredTasks.filter((t) => t.isCompleted);

    // Filtered Shopping Items
    const filteredShoppingItems = shoppingItems.filter((i) => {
        if (normalizedQuery) {
            const matches =
                i.itemName.toLowerCase().includes(normalizedQuery) ||
                (i.note && i.note.toLowerCase().includes(normalizedQuery));
            if (!matches) return false;
        }
        if (shoppingStatusFilter === "pending" && i.isPurchased) return false;
        if (shoppingStatusFilter === "purchased" && !i.isPurchased) return false;
        return true;
    });

    const pendingShopping = filteredShoppingItems.filter((i) => !i.isPurchased);
    const purchasedShopping = filteredShoppingItems.filter((i) => i.isPurchased);

    // Filtered Notes
    const filteredNotes = notes.filter((n) => {
        if (normalizedQuery) {
            return (
                n.title.toLowerCase().includes(normalizedQuery) ||
                n.content.toLowerCase().includes(normalizedQuery)
            );
        }
        return true;
    });

    // Render helper for Add button based on active tab
    const handlePrimaryAddClick = () => {
        if (activeTab === "shopping") {
            setEditingShoppingItem(null);
            setIsShoppingModalOpen(true);
        } else if (activeTab === "notes") {
            setEditingNote(null);
            setIsNoteModalOpen(true);
        } else {
            setEditingTask(null);
            setIsTaskModalOpen(true);
        }
    };

    const getPrimaryAddLabel = () => {
        if (activeTab === "shopping") return "Add Item";
        if (activeTab === "notes") return "Add Note";
        return "Add Task";
    };

    return (
        <Layout>
            <div className="space-y-4 sm:space-y-6 pb-12 max-w-7xl mx-auto">
                {/* Top Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                Tasks & Notes
                            </h1>
                            {selectedYear && (
                                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                                    {selectedYear}
                                </span>
                            )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            Day-to-day festival coordination, grocery lists, and important notes
                        </p>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Share Shopping List button (Always visible when on shopping tab or if shopping items exist) */}
                        {(activeTab === "shopping" || (activeTab === "all" && shoppingItems.length > 0)) && (
                            <button
                                type="button"
                                onClick={handleShareShoppingList}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 sm:px-3.5 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50 transition-colors shadow-sm"
                            >
                                <Share2 className="h-4 w-4" />
                                <span>Share List</span>
                            </button>
                        )}

                        {/* Split or Quick Add Buttons */}
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={handlePrimaryAddClick}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-indigo-700 active:bg-indigo-800 shadow-sm transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                <span>{getPrimaryAddLabel()}</span>
                            </button>

                            {/* Dropdown for other item types on mobile / quick selector */}
                            <div className="flex items-center gap-1">
                                {activeTab !== "tasks" && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingTask(null);
                                            setIsTaskModalOpen(true);
                                        }}
                                        title="Add Task"
                                        className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 transition-colors"
                                    >
                                        <CheckSquare className="h-4 w-4" />
                                    </button>
                                )}
                                {activeTab !== "shopping" && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingShoppingItem(null);
                                            setIsShoppingModalOpen(true);
                                        }}
                                        title="Add Shopping Item"
                                        className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 transition-colors"
                                    >
                                        <ShoppingCart className="h-4 w-4" />
                                    </button>
                                )}
                                {activeTab !== "notes" && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingNote(null);
                                            setIsNoteModalOpen(true);
                                        }}
                                        title="Add Note"
                                        className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 transition-colors"
                                    >
                                        <FileText className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                    {/* Pending Tasks */}
                    <div
                        onClick={() => setActiveTab("tasks")}
                        className="cursor-pointer rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-4 shadow-sm hover:border-indigo-200 dark:border-gray-800 dark:bg-gray-900 transition-all"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400">
                                Pending Tasks
                            </span>
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                                <ListTodo className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                {summary?.pendingTasks || 0}
                            </span>
                            <span className="text-[11px] text-gray-400">
                                of {(summary?.pendingTasks || 0) + (summary?.completedTasks || 0)} total
                            </span>
                        </div>
                        {summary?.overdueTasks > 0 && (
                            <div className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                                <AlertCircle className="h-3 w-3" />
                                <span>{summary.overdueTasks} Overdue</span>
                            </div>
                        )}
                    </div>

                    {/* Completed Tasks */}
                    <div
                        onClick={() => setActiveTab("tasks")}
                        className="cursor-pointer rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-4 shadow-sm hover:border-emerald-200 dark:border-gray-800 dark:bg-gray-900 transition-all"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400">
                                Completed Tasks
                            </span>
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {summary?.completedTasks || 0}
                            </span>
                            <span className="text-[11px] text-gray-400">Done</span>
                        </div>
                    </div>

                    {/* Shopping Remaining */}
                    <div
                        onClick={() => setActiveTab("shopping")}
                        className="cursor-pointer rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-4 shadow-sm hover:border-amber-200 dark:border-gray-800 dark:bg-gray-900 transition-all"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400">
                                Shopping Items
                            </span>
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                                <ShoppingCart className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                                {summary?.pendingShopping || 0}
                            </span>
                            <span className="text-[11px] text-gray-400">
                                to buy ({summary?.purchasedShopping || 0} bought)
                            </span>
                        </div>
                    </div>

                    {/* Notes & Info */}
                    <div
                        onClick={() => setActiveTab("notes")}
                        className="cursor-pointer rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-4 shadow-sm hover:border-purple-200 dark:border-gray-800 dark:bg-gray-900 transition-all"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400">
                                Notes & Guidelines
                            </span>
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                                <FileText className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                {summary?.totalNotes || 0}
                            </span>
                            <span className="text-[11px] text-gray-400">Saved</span>
                        </div>
                    </div>
                </div>

                {/* Tabs navigation */}
                <div className="pt-1">
                    <TaskAndNotesTabs
                        activeTab={activeTab}
                        onSelectTab={setActiveTab}
                        summary={summary}
                    />
                </div>

                {/* Search Bar & Contextual Filters */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3 sm:p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search tasks, grocery items, or notes..."
                            className="w-full rounded-xl border border-gray-200 bg-gray-50/60 py-2 pl-9 pr-3 text-xs sm:text-sm text-gray-900 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 hover:text-gray-600"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Filter controls based on activeTab */}
                    {(activeTab === "tasks" || activeTab === "all") && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                            {/* Task Status Filter */}
                            <select
                                value={taskStatusFilter}
                                onChange={(e) => setTaskStatusFilter(e.target.value)}
                                className="rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                            >
                                <option value="all">All Tasks</option>
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                            </select>

                            {/* Priority Filter */}
                            <select
                                value={taskPriorityFilter}
                                onChange={(e) => setTaskPriorityFilter(e.target.value)}
                                className="rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                            >
                                <option value="all">All Priorities</option>
                                <option value="high">High Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="low">Low Priority</option>
                            </select>
                        </div>
                    )}

                    {activeTab === "shopping" && (
                        <div className="flex items-center gap-2">
                            <select
                                value={shoppingStatusFilter}
                                onChange={(e) => setShoppingStatusFilter(e.target.value)}
                                className="rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                            >
                                <option value="all">All Items</option>
                                <option value="pending">To Buy</option>
                                <option value="purchased">Purchased</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-16">
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                            <span className="text-xs">Loading items...</span>
                        </div>
                    </div>
                )}

                {/* ============================================================ */}
                {/* TAB CONTENT: ALL ITEMS                                      */}
                {/* ============================================================ */}
                {!loading && activeTab === "all" && (
                    <div className="space-y-6">
                        {/* 1. To-Do Tasks Section */}
                        <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                            <div className="flex items-center justify-between mb-3.5">
                                <div className="flex items-center gap-2">
                                    <CheckSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                    <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                                        To-Do Tasks
                                    </h2>
                                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                        {pendingTasks.length} pending
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingTask(null);
                                        setIsTaskModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                                >
                                    <Plus className="h-3.5 w-3.5" /> Add Task
                                </button>
                            </div>

                            {pendingTasks.length === 0 && completedTasks.length === 0 ? (
                                <div className="py-6 text-center text-xs text-gray-400">
                                    No tasks found. Tap "+ Add Task" to get started!
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {pendingTasks.slice(0, 5).map((task) => (
                                        <TaskCard
                                            key={task._id}
                                            task={task}
                                            onToggle={handleToggleTask}
                                            onEdit={handleOpenEditTask}
                                            onDelete={handleDeleteTaskPrompt}
                                            isToggling={togglingTaskId === task._id}
                                        />
                                    ))}
                                    {pendingTasks.length > 5 && (
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("tasks")}
                                            className="w-full py-2 text-center text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                                        >
                                            View all {pendingTasks.length} pending tasks →
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 2. Shopping / Grocery List Section */}
                        <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                            <div className="flex items-center justify-between mb-3.5">
                                <div className="flex items-center gap-2">
                                    <ShoppingCart className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                                        Festival Shopping List
                                    </h2>
                                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                                        {pendingShopping.length} to buy
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {shoppingItems.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleShareShoppingList}
                                            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 dark:text-amber-400"
                                        >
                                            <Share2 className="h-3.5 w-3.5" /> Share
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingShoppingItem(null);
                                            setIsShoppingModalOpen(true);
                                        }}
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Add Item
                                    </button>
                                </div>
                            </div>

                            {pendingShopping.length === 0 && purchasedShopping.length === 0 ? (
                                <div className="py-6 text-center text-xs text-gray-400">
                                    No shopping items yet. Tap "+ Add Item" to add groceries.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {pendingShopping.slice(0, 5).map((item) => (
                                        <ShoppingItem
                                            key={item._id}
                                            item={item}
                                            onToggle={handleToggleShopping}
                                            onEdit={handleOpenEditShopping}
                                            onDelete={handleDeleteShoppingPrompt}
                                            isToggling={togglingShoppingId === item._id}
                                        />
                                    ))}
                                    {pendingShopping.length > 5 && (
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("shopping")}
                                            className="w-full py-2 text-center text-xs font-semibold text-amber-600 hover:text-amber-700"
                                        >
                                            View all {pendingShopping.length} shopping items →
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 3. Notes Section */}
                        <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                            <div className="flex items-center justify-between mb-3.5">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                    <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                                        Notes & Guidelines
                                    </h2>
                                    <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                                        {filteredNotes.length}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingNote(null);
                                        setIsNoteModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                                >
                                    <Plus className="h-3.5 w-3.5" /> Add Note
                                </button>
                            </div>

                            {filteredNotes.length === 0 ? (
                                <div className="py-6 text-center text-xs text-gray-400">
                                    No notes saved yet. Tap "+ Add Note" to create instructions.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {filteredNotes.slice(0, 3).map((note) => (
                                        <NoteCard
                                            key={note._id}
                                            note={note}
                                            onSelect={setViewingNote}
                                            onEdit={handleOpenEditNote}
                                            onDelete={handleDeleteNotePrompt}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ============================================================ */}
                {/* TAB CONTENT: TO-DO TASKS                                    */}
                {/* ============================================================ */}
                {!loading && activeTab === "tasks" && (
                    <div className="space-y-4">
                        {/* Pending Tasks Subsection */}
                        <div>
                            <div className="flex items-center justify-between mb-2 px-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Tasks to Complete ({pendingTasks.length})
                                    </h3>
                                </div>
                            </div>

                            {pendingTasks.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center bg-white dark:border-gray-800 dark:bg-gray-900">
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 mb-2">
                                        <CheckSquare className="h-6 w-6" />
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                        All tasks completed or none found
                                    </h4>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Add tasks to stay organized for festival events and purchases
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingTask(null);
                                            setIsTaskModalOpen(true);
                                        }}
                                        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                                    >
                                        <Plus className="h-4 w-4" /> Add Task
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {pendingTasks.map((task) => (
                                        <TaskCard
                                            key={task._id}
                                            task={task}
                                            onToggle={handleToggleTask}
                                            onEdit={handleOpenEditTask}
                                            onDelete={handleDeleteTaskPrompt}
                                            isToggling={togglingTaskId === task._id}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Completed Tasks Collapsible Subsection */}
                        {completedTasks.length > 0 && (
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                                    className="flex w-full items-center justify-between py-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        <span>Completed Tasks ({completedTasks.length})</span>
                                    </div>
                                    {showCompletedTasks ? (
                                        <ChevronUp className="h-4 w-4" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                </button>

                                {showCompletedTasks && (
                                    <div className="mt-2 space-y-2.5">
                                        {completedTasks.map((task) => (
                                            <TaskCard
                                                key={task._id}
                                                task={task}
                                                onToggle={handleToggleTask}
                                                onEdit={handleOpenEditTask}
                                                onDelete={handleDeleteTaskPrompt}
                                                isToggling={togglingTaskId === task._id}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ============================================================ */}
                {/* TAB CONTENT: SHOPPING LIST                                  */}
                {/* ============================================================ */}
                {!loading && activeTab === "shopping" && (
                    <div className="space-y-4">
                        {/* Pending Items Subsection */}
                        <div>
                            <div className="flex items-center justify-between mb-2 px-1">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    To Buy ({pendingShopping.length})
                                </h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleShareShoppingList}
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 dark:text-amber-400"
                                    >
                                        <Share2 className="h-3.5 w-3.5" /> Share List
                                    </button>
                                </div>
                            </div>

                            {pendingShopping.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center bg-white dark:border-gray-800 dark:bg-gray-900">
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 mb-2">
                                        <ShoppingCart className="h-6 w-6" />
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                        Shopping list is clear
                                    </h4>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Add items like flowers, oil, modak, groceries, and pooja supplies
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingShoppingItem(null);
                                            setIsShoppingModalOpen(true);
                                        }}
                                        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl"
                                    >
                                        <Plus className="h-4 w-4" /> Add Item
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {pendingShopping.map((item) => (
                                        <ShoppingItem
                                            key={item._id}
                                            item={item}
                                            onToggle={handleToggleShopping}
                                            onEdit={handleOpenEditShopping}
                                            onDelete={handleDeleteShoppingPrompt}
                                            isToggling={togglingShoppingId === item._id}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Purchased Items Collapsible Subsection */}
                        {purchasedShopping.length > 0 && (
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowPurchasedShopping(!showPurchasedShopping)}
                                    className="flex w-full items-center justify-between py-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        <span>Purchased Items ({purchasedShopping.length})</span>
                                    </div>
                                    {showPurchasedShopping ? (
                                        <ChevronUp className="h-4 w-4" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                </button>

                                {showPurchasedShopping && (
                                    <div className="mt-2 space-y-2">
                                        {purchasedShopping.map((item) => (
                                            <ShoppingItem
                                                key={item._id}
                                                item={item}
                                                onToggle={handleToggleShopping}
                                                onEdit={handleOpenEditShopping}
                                                onDelete={handleDeleteShoppingPrompt}
                                                isToggling={togglingShoppingId === item._id}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ============================================================ */}
                {/* TAB CONTENT: NOTES                                          */}
                {/* ============================================================ */}
                {!loading && activeTab === "notes" && (
                    <div>
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Notes & Guidelines ({filteredNotes.length})
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingNote(null);
                                    setIsNoteModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                            >
                                <Plus className="h-3.5 w-3.5" /> Add Note
                            </button>
                        </div>

                        {filteredNotes.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center bg-white dark:border-gray-800 dark:bg-gray-900">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 mb-2">
                                    <FileText className="h-6 w-6" />
                                </div>
                                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                    No notes saved
                                </h4>
                                <p className="text-xs text-gray-400 mt-1">
                                    Write down priest contact info, procession timings, or vendor rules
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingNote(null);
                                        setIsNoteModalOpen(true);
                                    }}
                                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl"
                                >
                                    <Plus className="h-4 w-4" /> Add Note
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                {filteredNotes.map((note) => (
                                    <NoteCard
                                        key={note._id}
                                        note={note}
                                        onSelect={setViewingNote}
                                        onEdit={handleOpenEditNote}
                                        onDelete={handleDeleteNotePrompt}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ============================================================ */}
                {/* MODALS                                                       */}
                {/* ============================================================ */}
                {/* Task Form Modal */}
                <TaskFormModal
                    isOpen={isTaskModalOpen}
                    onClose={() => {
                        setIsTaskModalOpen(false);
                        setEditingTask(null);
                    }}
                    onSubmit={handleSaveTask}
                    editingTask={editingTask}
                    isSubmitting={isSavingTask}
                />

                {/* Shopping Item Form Modal */}
                <ShoppingItemFormModal
                    isOpen={isShoppingModalOpen}
                    onClose={() => {
                        setIsShoppingModalOpen(false);
                        setEditingShoppingItem(null);
                    }}
                    onSubmit={handleSaveShoppingItem}
                    editingItem={editingShoppingItem}
                    isSubmitting={isSavingShopping}
                />

                {/* Note Form Modal */}
                <NoteFormModal
                    isOpen={isNoteModalOpen}
                    onClose={() => {
                        setIsNoteModalOpen(false);
                        setEditingNote(null);
                    }}
                    onSubmit={handleSaveNote}
                    editingNote={editingNote}
                    isSubmitting={isSavingNote}
                />

                {/* Full Note View Modal */}
                <NoteViewModal
                    isOpen={Boolean(viewingNote)}
                    onClose={() => setViewingNote(null)}
                    note={viewingNote}
                    onEdit={(n) => {
                        setViewingNote(null);
                        handleOpenEditNote(n);
                    }}
                />

                {/* Shared Delete Confirmation Modal */}
                <DeleteConfirmModal
                    isOpen={deleteModal.isOpen}
                    onClose={() =>
                        setDeleteModal({
                            isOpen: false,
                            type: null,
                            item: null,
                            isDeleting: false,
                        })
                    }
                    onConfirm={handleConfirmDelete}
                    isDeleting={deleteModal.isDeleting}
                    title={
                        deleteModal.type === "task"
                            ? "Delete Task"
                            : deleteModal.type === "shopping"
                            ? "Delete Shopping Item"
                            : "Delete Note"
                    }
                    message={
                        deleteModal.type === "task"
                            ? `Are you sure you want to delete task "${deleteModal.item?.title}"?`
                            : deleteModal.type === "shopping"
                            ? `Are you sure you want to delete "${deleteModal.item?.itemName}" from your shopping list?`
                            : `Are you sure you want to delete note "${deleteModal.item?.title}"?`
                    }
                />
            </div>
        </Layout>
    );
};

export default TasksAndNotes;
