import React, { useEffect, useState, useCallback, useMemo } from "react";
import Layout from "../components/Layout.jsx";
import { expenseApi } from "../api/expense.api.js";
import { categoryApi } from "../api/category.api.js";
import { useMandalStore } from "../store/useMandalStore.js";
import {
    Plus,
    Search,
    Filter,
    Calendar,
    Edit2,
    Trash2,
    X,
    Receipt,
    ChevronLeft,
    ChevronRight,
    Eye,
    Upload,
    ImageIcon,
    CreditCard,
    History,
    CheckCircle2,
    AlertCircle,
    Info
} from "lucide-react";
import toast from "react-hot-toast";

const DEFAULT_EXPENSE_CATEGORIES = [
    "Decoration",
    "Sound",
    "Lighting",
    "Food",
    "Security",
    "Visarjan",
    "Miscellaneous"
];

const Expenses = () => {
    const { selectedYear } = useMandalStore();

    // List State
    const [expenses, setExpenses] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalAmount, setTotalAmount] = useState(0);
    const [totalPaidAmount, setTotalPaidAmount] = useState(0);
    const [totalOutstanding, setTotalOutstanding] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(false);

    // Filter States
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [paymentStatus, setPaymentStatus] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Modal Form States (Add/Edit)
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editingExpense, setEditingExpense] = useState(null);
    const [formData, setFormData] = useState({
        title: "",
        amount: "",
        category: "Decoration",
        vendorName: "",
        paymentType: "full", // "full" | "partial"
        amountPaid: "",
        paymentMethod: "cash",
        note: "",
        date: new Date().toISOString().split("T")[0]
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState("");
    const [formLoading, setFormLoading] = useState(false);

    // Bill Image Overlay Modal State
    const [previewImageUrl, setPreviewImageUrl] = useState("");

    // Expense Details & Payment History Modal State
    const [viewingExpense, setViewingExpense] = useState(null);

    // Add Payment Modal State
    const [paymentModalExpense, setPaymentModalExpense] = useState(null);
    const [paymentFormData, setPaymentFormData] = useState({
        amount: "",
        paymentMethod: "cash",
        date: new Date().toISOString().split("T")[0],
        note: ""
    });
    const [paymentSubmitting, setPaymentSubmitting] = useState(false);

    // Dynamic Categories State
    const [allCategories, setAllCategories] = useState(DEFAULT_EXPENSE_CATEGORIES);
    const [activeCategories, setActiveCategories] = useState(DEFAULT_EXPENSE_CATEGORIES);

    const fetchCategories = useCallback(async () => {
        try {
            const response = await categoryApi.getCategories();
            if (response && response.success && response.data) {
                if (Array.isArray(response.data.allCategories) && response.data.allCategories.length > 0) {
                    setAllCategories(response.data.allCategories);
                }
                if (Array.isArray(response.data.allActiveCategories) && response.data.allActiveCategories.length > 0) {
                    setActiveCategories(response.data.allActiveCategories);
                }
            }
        } catch {
            // Keep default fallback
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    // Ensure form select includes current category even if deactivated
    const formCategories = useMemo(() => {
        if (formData.category && !activeCategories.includes(formData.category)) {
            return [...activeCategories, formData.category];
        }
        return activeCategories;
    }, [activeCategories, formData.category]);

    const fetchExpenses = useCallback(async () => {
        if (!selectedYear) return;
        setLoading(true);
        try {
            const response = await expenseApi.getExpenses({
                festivalYear: selectedYear,
                search,
                category,
                paymentStatus,
                startDate,
                endDate,
                page,
                limit: 15
            });
            if (response.success) {
                setExpenses(response.data.expenses);
                setTotal(response.data.total);
                setTotalAmount(response.data.totalAmount || 0);
                setTotalPaidAmount(response.data.totalPaidAmount || 0);
                setTotalOutstanding(response.data.totalOutstanding || 0);
                setPages(response.data.pages);

                // If viewingExpense is currently open, keep it in sync
                if (viewingExpense) {
                    const updated = response.data.expenses.find((e) => e._id === viewingExpense._id);
                    if (updated) {
                        setViewingExpense(updated);
                    }
                }
            } else {
                toast.error(response.message || "Failed to load expenses");
            }
        } catch (err) {
            toast.error("An error occurred while loading expenses");
        } finally {
            setLoading(false);
        }
    }, [selectedYear, search, category, paymentStatus, startDate, endDate, page, viewingExpense?._id]);

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    // Handle Reset Filter
    const handleResetFilters = () => {
        setSearch("");
        setCategory("");
        setPaymentStatus("");
        setStartDate("");
        setEndDate("");
        setPage(1);
    };

    // Open Modal for Add
    const openAddModal = () => {
        setEditingId(null);
        setEditingExpense(null);
        setFormData({
            title: "",
            amount: "",
            category: activeCategories[0] || "Decoration",
            vendorName: "",
            paymentType: "full",
            amountPaid: "",
            paymentMethod: "cash",
            note: "",
            date: new Date().toISOString().split("T")[0]
        });
        setSelectedFile(null);
        setFilePreview("");
        setIsOpen(true);
    };

    // Open Modal for Edit
    const openEditModal = (expense) => {
        setEditingId(expense._id);
        setEditingExpense(expense);
        const isPartial = expense.paymentStatus === "partially_paid";
        setFormData({
            title: expense.title,
            amount: expense.amount,
            category: expense.category,
            vendorName: expense.vendorName || "",
            paymentType: isPartial ? "partial" : "full",
            amountPaid: expense.paidAmount != null ? expense.paidAmount : expense.amount,
            paymentMethod: expense.payments?.[0]?.paymentMethod || "cash",
            note: expense.note || "",
            date: new Date(expense.date).toISOString().split("T")[0]
        });
        setSelectedFile(null);
        setFilePreview(expense.billImage || "");
        setIsOpen(true);
    };

    // Handle form inputs
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Handle file selection
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File size cannot exceed 5MB");
                return;
            }
            setSelectedFile(file);
            setFilePreview(URL.createObjectURL(file));
        }
    };

    // Submit Add/Edit Form
    const handleFormSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            toast.error("Expense title is required");
            return;
        }

        const totalNum = Number(formData.amount);
        if (isNaN(totalNum) || totalNum <= 0) {
            toast.error("Valid expense amount is required");
            return;
        }

        if (editingId && editingExpense) {
            const alreadyPaid = editingExpense.paidAmount || 0;
            if (totalNum < alreadyPaid) {
                toast.error(`Total expense cannot be less than already paid amount of ${formatCurrency(alreadyPaid)}`);
                return;
            }
        } else {
            // New expense validation
            if (formData.paymentType === "partial") {
                const paidNum = Number(formData.amountPaid);
                if (isNaN(paidNum) || paidNum <= 0) {
                    toast.error("Amount paid must be greater than 0");
                    return;
                }
                if (paidNum >= totalNum) {
                    toast.error("Amount paid must be strictly less than total expense amount for partial payment");
                    return;
                }
            }
        }

        setFormLoading(true);
        const data = new FormData();
        data.append("title", formData.title);
        data.append("amount", totalNum);
        data.append("category", formData.category);
        data.append("vendorName", formData.vendorName);
        data.append("note", formData.note);
        data.append("date", formData.date);

        if (!editingId) {
            data.append("paymentType", formData.paymentType);
            data.append("paymentMethod", formData.paymentMethod);
            if (formData.paymentType === "partial") {
                data.append("amountPaid", Number(formData.amountPaid));
            }
            data.append("festivalYear", selectedYear);
        }

        if (selectedFile) {
            data.append("billImage", selectedFile);
        }

        try {
            let response;
            if (editingId) {
                response = await expenseApi.updateExpense(editingId, data);
            } else {
                response = await expenseApi.createExpense(data);
            }

            if (response.success) {
                toast.success(editingId ? "Expense updated successfully" : "Expense recorded successfully");
                setIsOpen(false);
                fetchExpenses();
            } else {
                toast.error(response.message || "Failed to save expense");
            }
        } catch (err) {
            toast.error("An error occurred while saving the expense");
        } finally {
            setFormLoading(false);
        }
    };

    // Handle Delete Expense
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this expense record? This will also remove the uploaded bill and associated payment records.")) return;

        try {
            const response = await expenseApi.deleteExpense(id);
            if (response.success) {
                toast.success("Expense deleted successfully");
                if (viewingExpense?._id === id) {
                    setViewingExpense(null);
                }
                fetchExpenses();
            } else {
                toast.error(response.message || "Failed to delete expense");
            }
        } catch (err) {
            toast.error("An error occurred while deleting the expense");
        }
    };

    // Open Add Payment Modal
    const openAddPaymentModal = (expense) => {
        const outstanding = Math.max(expense.amount - (expense.paidAmount || 0), 0);
        setPaymentModalExpense(expense);
        setPaymentFormData({
            amount: outstanding > 0 ? outstanding : "",
            paymentMethod: "cash",
            date: new Date().toISOString().split("T")[0],
            note: ""
        });
    };

    // Submit Add Payment
    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        if (!paymentModalExpense) return;

        const payNum = Number(paymentFormData.amount);
        const outstanding = Math.max(paymentModalExpense.amount - (paymentModalExpense.paidAmount || 0), 0);

        if (isNaN(payNum) || payNum <= 0) {
            toast.error("Payment amount must be greater than 0");
            return;
        }

        if (payNum > outstanding) {
            toast.error(`Payment amount cannot exceed outstanding balance of ${formatCurrency(outstanding)}`);
            return;
        }

        setPaymentSubmitting(true);
        try {
            const response = await expenseApi.addPayment(paymentModalExpense._id, {
                amount: payNum,
                paymentMethod: paymentFormData.paymentMethod,
                date: paymentFormData.date,
                note: paymentFormData.note
            });

            if (response.success) {
                toast.success("Payment recorded successfully");
                setPaymentModalExpense(null);
                if (viewingExpense && viewingExpense._id === paymentModalExpense._id) {
                    setViewingExpense(response.data);
                }
                fetchExpenses();
            } else {
                toast.error(response.message || "Failed to record payment");
            }
        } catch (err) {
            toast.error("An error occurred while recording payment");
        } finally {
            setPaymentSubmitting(false);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(val || 0);
    };

    const getPaymentMethodLabel = (method) => {
        switch (method) {
            case "upi":
                return "UPI";
            case "bank":
                return "Bank Transfer";
            case "cash":
            default:
                return "Cash";
        }
    };

    const renderStatusBadge = (status) => {
        switch (status) {
            case "paid":
                return (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        PAID
                    </span>
                );
            case "partially_paid":
                return (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                        <AlertCircle className="h-3 w-3" />
                        PARTIALLY PAID
                    </span>
                );
            case "pending":
            default:
                return (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        PENDING
                    </span>
                );
        }
    };

    // Live partial payment summary numbers for Add modal
    const liveExpenseAmount = Number(formData.amount) || 0;
    const liveAmountPaid = formData.paymentType === "full" ? liveExpenseAmount : (Number(formData.amountPaid) || 0);
    const liveOutstanding = Math.max(liveExpenseAmount - liveAmountPaid, 0);
    const liveStatus = formData.paymentType === "full"
        ? (liveExpenseAmount > 0 ? "Paid" : "Pending")
        : (liveAmountPaid > 0 ? (liveAmountPaid >= liveExpenseAmount ? "Paid" : "Partially Paid") : "Pending");

    return (
        <Layout>
            {/* Header section with CTA */}
            <div className="mb-4 sm:mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                        Mandal Expenses
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 dark:text-gray-400">
                        Track commitments, partial payments, dues, and uploaded bills ({total} {total === 1 ? "expense" : "expenses"} found)
                    </p>
                </div>
                <button
                    onClick={openAddModal}
                    className="self-start sm:self-auto flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-semibold text-white shadow-md shadow-rose-600/15 transition-all hover:bg-rose-700 active:scale-95"
                >
                    <Plus className="h-4 w-4" />
                    Record Expense
                </button>
            </div>

            {/* Filtering Bar (Compact & Mobile-Optimized) */}
            <div className="mb-4 sm:mb-6 rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-2 sm:p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="grid grid-cols-2 gap-1.5 sm:gap-3 lg:grid-cols-5">
                    {/* Search Field */}
                    <div className="relative col-span-2 lg:col-span-2">
                        <Search className="absolute top-2 left-2 h-3 w-3 text-gray-400 sm:top-2.5 sm:left-2.5 sm:h-3.5 sm:w-3.5" />
                        <input
                            type="text"
                            placeholder="Search title, vendor, notes..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50/50 py-1 sm:py-2 pl-6 sm:pl-8 pr-6 sm:pr-7 text-[10px] sm:text-xs placeholder:text-[10px] sm:placeholder:text-xs placeholder-gray-400 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                        />
                        {search && (
                            <button
                                onClick={() => { setSearch(""); setPage(1); }}
                                className="absolute right-1.5 top-1.5 sm:right-2 sm:top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Category Selector */}
                    <div className="relative col-span-1">
                        <Filter className="absolute top-2 left-2 h-3 w-3 text-gray-400 sm:top-2.5 sm:left-2.5 sm:h-3.5 sm:w-3.5" />
                        <select
                            value={category}
                            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                            className="w-full appearance-none rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50/50 py-1 sm:py-2 pl-6 sm:pl-8 pr-2.5 text-[10px] sm:text-xs text-gray-600 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                        >
                            <option value="">All Categories</option>
                            {allCategories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Payment Status Selector */}
                    <div className="relative col-span-1">
                        <Filter className="absolute top-2 left-2 h-3 w-3 text-gray-400 sm:top-2.5 sm:left-2.5 sm:h-3.5 sm:w-3.5" />
                        <select
                            value={paymentStatus}
                            onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}
                            className="w-full appearance-none rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50/50 py-1 sm:py-2 pl-6 sm:pl-8 pr-2.5 text-[10px] sm:text-xs text-gray-600 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                        >
                            <option value="">All Statuses</option>
                            <option value="paid">Paid</option>
                            <option value="partially_paid">Partially Paid</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>

                    {/* Start Date + Reset */}
                    <div className="flex gap-1.5 col-span-2 sm:col-span-1">
                        <div className="flex-1">
                            <input
                                type="date"
                                value={startDate}
                                title="Filter Date"
                                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                                className="w-full rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50/50 py-1 sm:py-2 px-1.5 sm:px-2 text-[10px] sm:text-xs text-gray-600 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                            />
                        </div>
                        {(search || category || paymentStatus || startDate) && (
                            <button
                                onClick={handleResetFilters}
                                title="Reset Filters"
                                className="shrink-0 rounded-lg sm:rounded-xl border border-gray-200 bg-white px-2 sm:px-2.5 py-1 sm:py-2 text-[10px] sm:text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Dynamic Financial Overview Summary Card */}
            {(() => {
                const hasActiveFilters = Boolean((search && search.trim()) || category || paymentStatus || startDate || endDate);
                return (
                    <div className="mb-4 sm:mb-6 rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
                                    <Receipt className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Financial Overview
                                        </span>
                                        {hasActiveFilters ? (
                                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                                                <Filter className="h-2.5 w-2.5" />
                                                Filtered ({total} {total === 1 ? "expense" : "expenses"})
                                            </span>
                                        ) : (
                                            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                                Year {selectedYear}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                                        {hasActiveFilters
                                            ? `Calculated totals across all ${total} matching expenses based on active filters`
                                            : `Committed obligation, actual money paid, and outstanding dues for ${selectedYear}`}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 sm:gap-3 border-t border-gray-100 pt-3 lg:border-0 lg:pt-0 dark:border-gray-800">
                                <div className="rounded-xl bg-gray-50/70 p-2.5 sm:p-3 text-right lg:text-left dark:bg-gray-950/50 border border-gray-100/80 dark:border-gray-800/80">
                                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                                        Total Expenses
                                    </span>
                                    <span className="text-sm sm:text-base lg:text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                                        {formatCurrency(totalAmount)}
                                    </span>
                                </div>
                                <div className="rounded-xl bg-emerald-50/50 p-2.5 sm:p-3 text-right lg:text-left dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/40">
                                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                                        Total Paid
                                    </span>
                                    <span className="text-sm sm:text-base lg:text-lg font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(totalPaidAmount)}
                                    </span>
                                </div>
                                <div className="rounded-xl bg-rose-50/50 p-2.5 sm:p-3 text-right lg:text-left dark:bg-rose-950/20 border border-rose-100/60 dark:border-rose-900/40">
                                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
                                        Outstanding
                                    </span>
                                    <span className="text-sm sm:text-base lg:text-lg font-bold tracking-tight text-rose-600 dark:text-rose-400">
                                        {formatCurrency(totalOutstanding)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* List Table Container */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900">
                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                            <p className="text-xs font-medium text-gray-400">Loading records...</p>
                        </div>
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Receipt className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-sm font-bold text-gray-400 dark:text-gray-500">
                            {(Boolean((search && search.trim()) || category || paymentStatus || startDate || endDate)) ? "No matching expenses found" : "No expenses logged"}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {(Boolean((search && search.trim()) || category || paymentStatus || startDate || endDate))
                                ? "0 matching expenses. Try adjusting or clearing your filters to see more results."
                                : `Start by recording your first expense for ${selectedYear}!`}
                        </p>
                        {(Boolean((search && search.trim()) || category || paymentStatus || startDate || endDate)) && (
                            <button
                                onClick={handleResetFilters}
                                className="mt-4 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 shadow-sm hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-gray-900"
                            >
                                Clear All Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:bg-gray-800/20 dark:border-gray-800">
                                        <th className="px-5 py-4">Bill Image</th>
                                        <th className="px-5 py-4">Title / Item</th>
                                        <th className="px-5 py-4">Category</th>
                                        <th className="px-5 py-4">Vendor</th>
                                        <th className="px-5 py-4">Status</th>
                                        <th className="px-5 py-4">Date</th>
                                        <th className="px-5 py-4 text-right">Total Amount</th>
                                        <th className="px-5 py-4 text-right">Paid / Due</th>
                                        <th className="px-5 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                                    {expenses.map((exp) => {
                                        const paidVal = exp.paidAmount != null ? exp.paidAmount : (exp.paymentStatus === "paid" ? exp.amount : 0);
                                        const dueVal = Math.max(exp.amount - paidVal, 0);

                                        return (
                                            <tr key={exp._id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10">
                                                <td className="px-5 py-4.5">
                                                    {exp.billImage ? (
                                                        <div
                                                            onClick={() => setPreviewImageUrl(exp.billImage)}
                                                            className="group relative flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-gray-100 shadow-sm"
                                                        >
                                                            <img
                                                                src={exp.billImage}
                                                                alt="Bill attachment"
                                                                className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                                                            />
                                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/30 opacity-0 transition-opacity group-hover:opacity-100">
                                                                <Eye className="h-4 w-4 text-white" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 border border-dashed border-gray-200 text-gray-300 dark:bg-gray-950 dark:border-gray-850">
                                                            <ImageIcon className="h-4 w-4" />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4.5">
                                                    <button
                                                        onClick={() => setViewingExpense(exp)}
                                                        className="font-semibold text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-left transition"
                                                    >
                                                        {exp.title}
                                                    </button>
                                                    {exp.note && (
                                                        <div className="text-[10px] text-gray-400 truncate max-w-xs mt-0.5">
                                                            {exp.note}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4.5">
                                                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-2 py-0.5 dark:bg-gray-950 dark:border-gray-850">
                                                        {exp.category}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4.5 text-xs text-gray-500 font-medium">
                                                    {exp.vendorName || "—"}
                                                </td>
                                                <td className="px-5 py-4.5">
                                                    {renderStatusBadge(exp.paymentStatus)}
                                                </td>
                                                <td className="px-5 py-4.5 text-xs text-gray-400">
                                                    {new Date(exp.date).toLocaleDateString("en-IN", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric"
                                                    })}
                                                </td>
                                                <td className="px-5 py-4.5 text-right font-bold text-sm text-gray-900 dark:text-white">
                                                    {formatCurrency(exp.amount)}
                                                </td>
                                                <td className="px-5 py-4.5 text-right">
                                                    <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                        {formatCurrency(paidVal)}
                                                    </div>
                                                    {dueVal > 0 ? (
                                                        <div className="text-[10px] font-medium text-rose-600 dark:text-rose-400 mt-0.5">
                                                            Due: {formatCurrency(dueVal)}
                                                        </div>
                                                    ) : (
                                                        <div className="text-[10px] text-gray-400 mt-0.5">
                                                            Settled
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4.5">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {dueVal > 0 && (
                                                            <button
                                                                onClick={() => openAddPaymentModal(exp)}
                                                                title="Add Payment"
                                                                className="rounded-lg p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                                                            >
                                                                <CreditCard className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setViewingExpense(exp)}
                                                            title="View Payment History & Details"
                                                            className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-indigo-600 dark:hover:bg-gray-800 transition-colors"
                                                        >
                                                            <History className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => openEditModal(exp)}
                                                            title="Edit Expense"
                                                            className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-indigo-600 dark:hover:bg-gray-800 transition-colors"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(exp._id)}
                                                            title="Delete Expense"
                                                            className="rounded-lg p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 transition-colors"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-50/80 border-t border-gray-200 dark:bg-gray-800/20 dark:border-gray-800">
                                        <td colSpan="6" className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Total ({total} {total === 1 ? "expense" : "expenses"})
                                        </td>
                                        <td className="px-5 py-4 text-right font-bold text-sm text-gray-900 dark:text-white">
                                            {formatCurrency(totalAmount)}
                                        </td>
                                        <td className="px-5 py-4 text-right font-bold text-xs text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(totalPaidAmount)}
                                            {totalOutstanding > 0 && (
                                                <span className="block text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                                                    Due: {formatCurrency(totalOutstanding)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Mobile expense cards */}
                        <div className="divide-y divide-gray-100 md:hidden dark:divide-gray-800/40">
                            {expenses.map((exp) => {
                                const paidVal = exp.paidAmount != null ? exp.paidAmount : (exp.paymentStatus === "paid" ? exp.amount : 0);
                                const dueVal = Math.max(exp.amount - paidVal, 0);

                                return (
                                    <div key={exp._id} className="px-4 py-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <button
                                                    onClick={() => setViewingExpense(exp)}
                                                    className="font-semibold text-sm text-gray-800 dark:text-gray-200 hover:text-indigo-600 text-left"
                                                >
                                                    {exp.title}
                                                </button>
                                                {exp.note && (
                                                    <div className="mt-0.5 truncate text-[11px] text-gray-400">
                                                        {exp.note}
                                                    </div>
                                                )}
                                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                    <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-2 py-0.5 dark:bg-gray-950 dark:border-gray-850">
                                                        {exp.category}
                                                    </span>
                                                    {renderStatusBadge(exp.paymentStatus)}
                                                </div>
                                                <div className="mt-1 text-[11px] text-gray-400">
                                                    {exp.vendorName || "—"}
                                                    {" · "}
                                                    {new Date(exp.date).toLocaleDateString("en-IN", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric"
                                                    })}
                                                </div>
                                            </div>
                                            <div className="shrink-0">
                                                {exp.billImage ? (
                                                    <button
                                                        onClick={() => setPreviewImageUrl(exp.billImage)}
                                                        title="View bill"
                                                        aria-label="View bill image"
                                                        className="group relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-gray-100 shadow-sm"
                                                    >
                                                        <img
                                                            src={exp.billImage}
                                                            alt="Bill attachment"
                                                            className="h-full w-full object-cover"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/30">
                                                            <Eye className="h-4 w-4 text-white" />
                                                        </div>
                                                    </button>
                                                ) : (
                                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-50 border border-dashed border-gray-200 text-gray-300 dark:bg-gray-950 dark:border-gray-850">
                                                        <ImageIcon className="h-4 w-4" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Financial row */}
                                        <div className="mt-3 flex items-center justify-between rounded-xl bg-gray-50/70 p-2.5 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-850">
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-gray-400 block">Total</span>
                                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                    {formatCurrency(exp.amount)}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Paid</span>
                                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                    {formatCurrency(paidVal)}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block">Outstanding</span>
                                                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                                                    {formatCurrency(dueVal)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions row */}
                                        <div className="mt-3 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5">
                                                {dueVal > 0 && (
                                                    <button
                                                        onClick={() => openAddPaymentModal(exp)}
                                                        className="flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 active:scale-95"
                                                    >
                                                        <CreditCard className="h-3.5 w-3.5" />
                                                        Pay Due
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setViewingExpense(exp)}
                                                    className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                                                >
                                                    <History className="h-3.5 w-3.5" />
                                                    History
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => openEditModal(exp)}
                                                    title="Edit expense"
                                                    aria-label="Edit expense"
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition-colors dark:border-gray-800 dark:hover:bg-gray-800"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(exp._id)}
                                                    title="Delete expense"
                                                    aria-label="Delete expense"
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-rose-50 hover:text-rose-600 transition-colors dark:border-gray-800 dark:hover:bg-rose-950/20"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Mobile total row */}
                            <div className="flex flex-col gap-1.5 bg-gray-50/80 px-4 py-3.5 dark:bg-gray-800/20 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    <span>Total ({total} {total === 1 ? "expense" : "expenses"})</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(totalAmount)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Total Paid: {formatCurrency(totalPaidAmount)}</span>
                                    <span className="text-rose-600 dark:text-rose-400 font-semibold">Total Due: {formatCurrency(totalOutstanding)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Pagination component */}
                        {pages > 1 && (
                            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 dark:border-gray-800">
                                <span className="text-xs text-gray-500">
                                    Page {page} of {pages}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        disabled={page === 1}
                                        onClick={() => setPage(page - 1)}
                                        className="rounded-xl border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:hover:bg-gray-950"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                        disabled={page === pages}
                                        onClick={() => setPage(page + 1)}
                                        className="rounded-xl border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:hover:bg-gray-950"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Record / Edit Expense Modal Form */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
                    <div className="w-full max-w-lg my-auto rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 dark:bg-gray-900 dark:border dark:border-gray-800">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-gray-100 p-5 sm:p-6 dark:border-gray-800">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                    {editingId ? "Edit Expense Record" : "Record New Expense"}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {editingId
                                        ? "Update expense details or committed total amount"
                                        : "Record full or partial outgoing mandal expenditures"}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleFormSubmit}>
                            <div className="p-5 sm:p-6 space-y-4 max-h-[72vh] overflow-y-auto">
                                {editingId && editingExpense && (editingExpense.paidAmount || 0) > 0 && (
                                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-indigo-800 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-300">
                                        <div className="flex items-center gap-1.5 font-semibold">
                                            <Info className="h-4 w-4 shrink-0" />
                                            <span>Existing Payment History Protected</span>
                                        </div>
                                        <p className="mt-1 text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                                            This expense already has {formatCurrency(editingExpense.paidAmount)} recorded in payments. The new total amount cannot be less than {formatCurrency(editingExpense.paidAmount)}.
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Expense Title *
                                        </label>
                                        <input
                                            type="text"
                                            name="title"
                                            required
                                            value={formData.title}
                                            onChange={handleInputChange}
                                            placeholder="Sound System Advance"
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Expense Amount (₹) *
                                        </label>
                                        <input
                                            type="number"
                                            name="amount"
                                            required
                                            min="1"
                                            step="any"
                                            value={formData.amount}
                                            onChange={handleInputChange}
                                            placeholder="20000"
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Category *
                                        </label>
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleInputChange}
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950 dark:text-white"
                                        >
                                            {formCategories.map((cat) => (
                                                <option key={cat} value={cat}>
                                                    {cat}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Vendor / Shop Name
                                        </label>
                                        <input
                                            type="text"
                                            name="vendorName"
                                            value={formData.vendorName}
                                            onChange={handleInputChange}
                                            placeholder="Vijay Sound & DJ"
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Expense Date *
                                        </label>
                                        <input
                                            type="date"
                                            name="date"
                                            required
                                            value={formData.date}
                                            onChange={handleInputChange}
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950 dark:text-white"
                                        />
                                    </div>

                                    {/* Payment Status (Only on Creation) */}
                                    {!editingId && (
                                        <div className="sm:col-span-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                                Payment Status *
                                            </label>
                                            <div className="mt-2 grid grid-cols-2 gap-2">
                                                <label
                                                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold cursor-pointer transition ${
                                                        formData.paymentType === "full"
                                                            ? "border-indigo-600 bg-indigo-50/60 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300 shadow-sm"
                                                            : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-950"
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="paymentType"
                                                        value="full"
                                                        checked={formData.paymentType === "full"}
                                                        onChange={() => setFormData((prev) => ({ ...prev, paymentType: "full" }))}
                                                        className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                                    />
                                                    <span>Full Payment</span>
                                                </label>
                                                <label
                                                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold cursor-pointer transition ${
                                                        formData.paymentType === "partial"
                                                            ? "border-indigo-600 bg-indigo-50/60 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300 shadow-sm"
                                                            : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-950"
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="paymentType"
                                                        value="partial"
                                                        checked={formData.paymentType === "partial"}
                                                        onChange={() => setFormData((prev) => ({ ...prev, paymentType: "partial" }))}
                                                        className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                                    />
                                                    <span>Partial Payment</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* Conditional fields for Payment Status */}
                                    {!editingId && formData.paymentType === "partial" && (
                                        <div>
                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                                Amount Paid (₹) *
                                            </label>
                                            <input
                                                type="number"
                                                name="amountPaid"
                                                required
                                                min="1"
                                                step="any"
                                                value={formData.amountPaid}
                                                onChange={handleInputChange}
                                                placeholder="2000"
                                                className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950 dark:text-white"
                                            />
                                        </div>
                                    )}

                                    {!editingId && (
                                        <div className={formData.paymentType === "partial" ? "sm:col-span-1" : "sm:col-span-2"}>
                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                                Payment Method *
                                            </label>
                                            <select
                                                name="paymentMethod"
                                                value={formData.paymentMethod}
                                                onChange={handleInputChange}
                                                className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950 dark:text-white"
                                            >
                                                <option value="cash">Cash</option>
                                                <option value="upi">UPI</option>
                                                <option value="bank">Bank Transfer</option>
                                            </select>
                                        </div>
                                    )}

                                    {/* Live Partial Payment Summary Box */}
                                    {!editingId && formData.paymentType === "partial" && (
                                        <div className="sm:col-span-2 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                                            <div className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 mb-3 flex items-center justify-between">
                                                <span>Live Payment Summary</span>
                                                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                                                    {liveStatus}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-center sm:text-left">
                                                <div className="rounded-xl bg-white/70 p-2 dark:bg-gray-900/60 border border-amber-100 dark:border-amber-900/40">
                                                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Expense</span>
                                                    <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                                                        {formatCurrency(liveExpenseAmount)}
                                                    </span>
                                                </div>
                                                <div className="rounded-xl bg-white/70 p-2 dark:bg-gray-900/60 border border-amber-100 dark:border-amber-900/40">
                                                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Amount Paid</span>
                                                    <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                        {formatCurrency(liveAmountPaid)}
                                                    </span>
                                                </div>
                                                <div className="rounded-xl bg-white/70 p-2 dark:bg-gray-900/60 border border-amber-100 dark:border-amber-900/40">
                                                    <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block">Outstanding</span>
                                                    <span className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400">
                                                        {formatCurrency(liveOutstanding)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Live Validation Warnings */}
                                            {liveExpenseAmount > 0 && liveAmountPaid >= liveExpenseAmount && (
                                                <p className="mt-2.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                    Amount paid must be strictly less than {formatCurrency(liveExpenseAmount)} for Partial Payment.
                                                </p>
                                            )}
                                            {formData.amountPaid !== "" && Number(formData.amountPaid) <= 0 && (
                                                <p className="mt-2.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                    Amount paid must be greater than 0.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Upload System */}
                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Bill Image Attachment
                                        </label>
                                        <div className="mt-2 flex flex-wrap items-center gap-3">
                                            <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-950">
                                                <Upload className="h-4 w-4" />
                                                Choose File
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                />
                                            </label>
                                            <span className="min-w-0 max-w-full truncate text-xs text-gray-400">
                                                {selectedFile ? selectedFile.name : (filePreview ? "Bill image attached" : "No file attached")}
                                            </span>
                                        </div>

                                        {filePreview && (
                                            <div className="relative mt-3 h-28 w-28 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                                                <img
                                                    src={filePreview}
                                                    alt="Preview bill"
                                                    className="h-full w-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedFile(null);
                                                        setFilePreview("");
                                                    }}
                                                    className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900/65 text-white hover:bg-gray-900"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Note / Description
                                        </label>
                                        <textarea
                                            name="note"
                                            value={formData.note}
                                            onChange={handleInputChange}
                                            rows="2"
                                            placeholder="Detailed description, payment notes, etc..."
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950 dark:text-white"
                                        ></textarea>
                                    </div>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4 rounded-b-3xl sm:flex-row sm:items-center sm:justify-end sm:gap-3 dark:border-gray-800 dark:bg-gray-950">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-xs font-semibold text-gray-500 hover:bg-gray-50 sm:w-auto dark:border-gray-800 dark:bg-gray-900"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 px-4 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto active:scale-95 transition"
                                >
                                    {formLoading ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                    ) : (
                                        editingId ? "Update Record" : "Record Expense"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Expense Details & Payment History Modal */}
            {viewingExpense && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
                    onClick={() => setViewingExpense(null)}
                >
                    <div
                        className="w-full max-w-xl my-auto rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 dark:bg-gray-900 dark:border dark:border-gray-800 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-gray-100 p-5 sm:p-6 dark:border-gray-800">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {viewingExpense.title}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {viewingExpense.category} · {new Date(viewingExpense.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                                </p>
                            </div>
                            <button
                                onClick={() => setViewingExpense(null)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                            {/* Key Financial Cards */}
                            {(() => {
                                const paidVal = viewingExpense.paidAmount != null ? viewingExpense.paidAmount : (viewingExpense.paymentStatus === "paid" ? viewingExpense.amount : 0);
                                const dueVal = Math.max(viewingExpense.amount - paidVal, 0);

                                return (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                        <div className="rounded-2xl bg-gray-50 p-3 dark:bg-gray-950/60 border border-gray-100 dark:border-gray-800">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Total Expense</span>
                                            <span className="text-base font-bold text-gray-900 dark:text-white">
                                                {formatCurrency(viewingExpense.amount)}
                                            </span>
                                        </div>
                                        <div className="rounded-2xl bg-emerald-50/60 p-3 dark:bg-emerald-950/20 border border-emerald-100/70 dark:border-emerald-900/40">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">Paid Amount</span>
                                            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(paidVal)}
                                            </span>
                                        </div>
                                        <div className="rounded-2xl bg-rose-50/60 p-3 dark:bg-rose-950/20 border border-rose-100/70 dark:border-rose-900/40">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block">Outstanding</span>
                                            <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                                                {formatCurrency(dueVal)}
                                            </span>
                                        </div>
                                        <div className="rounded-2xl bg-gray-50 p-3 dark:bg-gray-950/60 border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Status</span>
                                            <div>{renderStatusBadge(viewingExpense.paymentStatus)}</div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Vendor & Note info */}
                            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-3.5 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-950/30 dark:text-gray-300 space-y-1.5">
                                <div>
                                    <span className="font-semibold text-gray-400">Vendor / Shop: </span>
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{viewingExpense.vendorName || "Not specified"}</span>
                                </div>
                                {viewingExpense.note && (
                                    <div>
                                        <span className="font-semibold text-gray-400">Note: </span>
                                        <span>{viewingExpense.note}</span>
                                    </div>
                                )}
                                {viewingExpense.billImage && (
                                    <div className="pt-2 flex items-center gap-2">
                                        <button
                                            onClick={() => setPreviewImageUrl(viewingExpense.billImage)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-indigo-400"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            View Uploaded Bill Image
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Payment History Section */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <History className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                            Payment History ({viewingExpense.payments?.length || (viewingExpense.paymentStatus === "paid" ? 1 : 0)})
                                        </h4>
                                    </div>

                                    {/* Quick Add Payment CTA if outstanding */}
                                    {Math.max(viewingExpense.amount - (viewingExpense.paidAmount != null ? viewingExpense.paidAmount : (viewingExpense.paymentStatus === "paid" ? viewingExpense.amount : 0)), 0) > 0 && (
                                        <button
                                            onClick={() => openAddPaymentModal(viewingExpense)}
                                            className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Add Payment
                                        </button>
                                    )}
                                </div>

                                {viewingExpense.payments && viewingExpense.payments.length > 0 ? (
                                    <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white dark:divide-gray-800/60 dark:border-gray-800 dark:bg-gray-950/50 overflow-hidden">
                                        {viewingExpense.payments.map((p, idx) => (
                                            <div key={p._id || idx} className="p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                                            {new Date(p.date).toLocaleDateString("en-IN", {
                                                                day: "numeric",
                                                                month: "short",
                                                                year: "numeric"
                                                            })}
                                                        </span>
                                                        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300 uppercase">
                                                            {getPaymentMethodLabel(p.paymentMethod)}
                                                        </span>
                                                    </div>
                                                    {p.note && (
                                                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                                                            {p.note}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                        {formatCurrency(p.amount)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : viewingExpense.paymentStatus === "paid" ? (
                                    <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/50">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                                    {new Date(viewingExpense.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                                </span>
                                                <span className="ml-2 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                                    Full Payment
                                                </span>
                                            </div>
                                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(viewingExpense.amount)}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-gray-400 dark:border-gray-800">
                                        <p className="text-xs">No payment records logged yet.</p>
                                        <button
                                            onClick={() => openAddPaymentModal(viewingExpense)}
                                            className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                                        >
                                            Record initial payment
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end border-t border-gray-100 bg-gray-50 px-6 py-3.5 dark:border-gray-800 dark:bg-gray-950">
                            <button
                                onClick={() => setViewingExpense(null)}
                                className="rounded-xl border border-gray-200 bg-white py-2 px-4 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Payment Modal Form */}
            {paymentModalExpense && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
                    onClick={() => setPaymentModalExpense(null)}
                >
                    <div
                        className="w-full max-w-md my-auto rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 dark:bg-gray-900 dark:border dark:border-gray-800"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-gray-100 p-5 sm:p-6 dark:border-gray-800">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Record Payment
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                                    {paymentModalExpense.title}
                                </p>
                            </div>
                            <button
                                onClick={() => setPaymentModalExpense(null)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handlePaymentSubmit}>
                            <div className="p-5 sm:p-6 space-y-4">
                                {(() => {
                                    const currentPaid = paymentModalExpense.paidAmount != null ? paymentModalExpense.paidAmount : (paymentModalExpense.paymentStatus === "paid" ? paymentModalExpense.amount : 0);
                                    const outstanding = Math.max(paymentModalExpense.amount - currentPaid, 0);

                                    return (
                                        <div className="rounded-2xl bg-amber-50/60 p-3.5 border border-amber-100 text-xs dark:bg-amber-950/20 dark:border-amber-900/40">
                                            <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 mb-1">
                                                <span>Total Obligation:</span>
                                                <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(paymentModalExpense.amount)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 mb-1">
                                                <span>Already Paid:</span>
                                                <span className="font-semibold">{formatCurrency(currentPaid)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 font-bold border-t border-amber-200/50 pt-1 mt-1">
                                                <span>Remaining Due:</span>
                                                <span>{formatCurrency(outstanding)}</span>
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Payment Amount (₹) *
                                        </label>
                                        {(() => {
                                            const currentPaid = paymentModalExpense.paidAmount != null ? paymentModalExpense.paidAmount : 0;
                                            const outstanding = Math.max(paymentModalExpense.amount - currentPaid, 0);
                                            return outstanding > 0 ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setPaymentFormData((prev) => ({ ...prev, amount: outstanding }))}
                                                    className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                                                >
                                                    Pay Full Due ({formatCurrency(outstanding)})
                                                </button>
                                            ) : null;
                                        })()}
                                    </div>
                                    <input
                                        type="number"
                                        name="amount"
                                        required
                                        min="1"
                                        step="any"
                                        value={paymentFormData.amount}
                                        onChange={(e) => setPaymentFormData((prev) => ({ ...prev, amount: e.target.value }))}
                                        placeholder="Enter amount to pay"
                                        className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                        Payment Method *
                                    </label>
                                    <select
                                        name="paymentMethod"
                                        value={paymentFormData.paymentMethod}
                                        onChange={(e) => setPaymentFormData((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                                        className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950 dark:text-white"
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="upi">UPI</option>
                                        <option value="bank">Bank Transfer</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                        Payment Date *
                                    </label>
                                    <input
                                        type="date"
                                        name="date"
                                        required
                                        value={paymentFormData.date}
                                        onChange={(e) => setPaymentFormData((prev) => ({ ...prev, date: e.target.value }))}
                                        className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                        Payment Note / Remarks
                                    </label>
                                    <input
                                        type="text"
                                        name="note"
                                        value={paymentFormData.note}
                                        onChange={(e) => setPaymentFormData((prev) => ({ ...prev, note: e.target.value }))}
                                        placeholder="Final settlement, cheque ref, etc."
                                        className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4 rounded-b-3xl sm:flex-row sm:items-center sm:justify-end sm:gap-3 dark:border-gray-800 dark:bg-gray-950">
                                <button
                                    type="button"
                                    onClick={() => setPaymentModalExpense(null)}
                                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-xs font-semibold text-gray-500 hover:bg-gray-50 sm:w-auto dark:border-gray-800 dark:bg-gray-900"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={paymentSubmitting}
                                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 px-4 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 sm:w-auto active:scale-95 transition"
                                >
                                    {paymentSubmitting ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                    ) : (
                                        "Confirm Payment"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bill Image View Overlay */}
            {previewImageUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4"
                    onClick={() => setPreviewImageUrl("")}
                >
                    <div
                        className="relative max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 dark:bg-gray-900"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setPreviewImageUrl("")}
                            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-900/50 text-white transition hover:bg-gray-950"
                        >
                            <X className="h-4.5 w-4.5" />
                        </button>
                        <img
                            src={previewImageUrl}
                            alt="Full bill view"
                            className="max-h-[85vh] max-w-full object-contain"
                        />
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Expenses;
