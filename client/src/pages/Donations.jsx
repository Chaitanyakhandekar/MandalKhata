import React, { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout.jsx";
import { donationApi } from "../api/donation.api.js";
import { householdApi } from "../api/household.api.js";
import { externalDonorApi } from "../api/externalDonor.api.js";
import { buildingConfigApi } from "../api/buildingConfig.api.js";
import { useMandalStore } from "../store/useMandalStore.js";
import {
    Plus,
    Search,
    Filter,
    Edit2,
    Trash2,
    X,
    Coins,
    ChevronLeft,
    ChevronRight,
    Home as HomeIcon,
    Building2,
    Users,
    AlertTriangle,
    Clock,
    CheckCircle2,
    CircleDashed,
    PlusCircle,
    Receipt,
    TrendingUp,
    ChevronDown,
    ChevronUp,
    Pencil
} from "lucide-react";
import toast from "react-hot-toast";

const DONOR_CATEGORIES = ["Individual", "Business", "Organization", "Shop", "Well-wisher"];

// ── Helper: payment method badge colours ──────────────────────────
const pmClass = (method) => {
    if (method === "cash") return "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400";
    if (method === "upi") return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400";
    return "bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400";
};

// ── Helper: collection-status badge ──────────────────────────────
const getStatusBadge = (status) => {
    if (status === "paid") return {
        label: "PAID",
        icon: <CheckCircle2 className="h-3 w-3" />,
        cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
    };
    if (status === "partially_collected") return {
        label: "PARTIAL",
        icon: <Clock className="h-3 w-3" />,
        cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
    };
    return {
        label: "PENDING",
        icon: <CircleDashed className="h-3 w-3" />,
        cls: "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400"
    };
};

const formatCurrency = (val) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val || 0);

const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// ─────────────────────────────────────────────────────────────────
// PaymentModal – Add or Edit a single payment record
// ─────────────────────────────────────────────────────────────────
const PaymentModal = ({ donation, editingPayment, onClose, onSaved }) => {
    const [amount, setAmount] = useState(editingPayment ? editingPayment.amount : "");
    const [method, setMethod] = useState(editingPayment ? editingPayment.paymentMethod : "cash");
    const [date, setDate] = useState(
        editingPayment
            ? new Date(editingPayment.date).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0]
    );
    const [note, setNote] = useState(editingPayment ? (editingPayment.note || "") : "");
    const [loading, setLoading] = useState(false);

    const otherPaymentsSum = editingPayment
        ? (donation.payments || []).filter(p => p._id !== editingPayment._id).reduce((s, p) => s + (Number(p.amount) || 0), 0)
        : (donation.collectedAmount || 0);
    const maxAllowed = Math.max((donation.amount || 0) - otherPaymentsSum, 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const amtNum = Number(amount);
        if (!amtNum || amtNum <= 0) { toast.error("Payment amount must be greater than 0"); return; }
        if (amtNum > maxAllowed) {
            toast.error(`Payment amount (₹${amtNum.toLocaleString("en-IN")}) cannot exceed remaining amount of ₹${maxAllowed.toLocaleString("en-IN")}`);
            return;
        }
        setLoading(true);
        try {
            let res;
            if (editingPayment) {
                res = await donationApi.updatePayment(donation._id, editingPayment._id, { amount: amtNum, paymentMethod: method, date, note });
            } else {
                res = await donationApi.addPayment(donation._id, { amount: amtNum, paymentMethod: method, date, note });
            }
            if (res.success) {
                toast.success(editingPayment ? "Payment updated" : "Payment added");
                onSaved(res.data);
            } else {
                toast.error(res.message || "Failed to save payment");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm px-4">
            <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl dark:bg-gray-900 dark:border dark:border-gray-800">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">
                    <h3 className="text-base font-bold text-gray-800 dark:text-white">
                        {editingPayment ? "Edit Payment" : "Add Payment"}
                    </h3>
                    <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="mx-6 mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-indigo-700 dark:text-indigo-300">Pledged Amount</span>
                        <span className="font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(donation.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-emerald-700 dark:text-emerald-400">Total Collected</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(donation.collectedAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-amber-700 dark:text-amber-400">Max Addable</span>
                        <span className="font-bold text-amber-700 dark:text-amber-400">{formatCurrency(maxAllowed)}</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Amount (₹) *</label>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                max={maxAllowed}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Payment Method *</label>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                                {["cash", "upi", "bank"].map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setMethod(m)}
                                        className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${method === m
                                            ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/20"
                                            : "border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700"
                                            }`}
                                    >
                                        {m === "bank" ? "Bank" : m.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Payment Date *</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Note / Reference</label>
                                <input
                                    type="text"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="UPI ref, cheque no..."
                                    className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4 rounded-b-3xl sm:flex-row sm:items-center sm:justify-end sm:gap-3 dark:border-gray-800 dark:bg-gray-950">
                        <button type="button" onClick={onClose} className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-xs font-semibold text-gray-500 hover:bg-gray-50 sm:w-auto dark:border-gray-700 dark:bg-gray-900">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 px-5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto">
                            {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : (editingPayment ? "Update Payment" : "Add Payment")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────
// PaymentHistoryPanel – inline panel showing payments for a donation
// ─────────────────────────────────────────────────────────────────
const PaymentHistoryPanel = ({ donation, onUpdated }) => {
    const [paymentModal, setPaymentModal] = useState(null); // null | "add" | payment object
    const [deletingId, setDeletingId] = useState(null);

    const handleDeletePayment = async (paymentId) => {
        if (!window.confirm("Delete this payment record?")) return;
        setDeletingId(paymentId);
        try {
            const res = await donationApi.deletePayment(donation._id, paymentId);
            if (res.success) { toast.success("Payment deleted"); onUpdated(res.data); }
            else toast.error(res.message || "Failed to delete payment");
        } catch { toast.error("An error occurred"); }
        finally { setDeletingId(null); }
    };

    const statusBadge = getStatusBadge(donation.collectionStatus);
    const isPaid = donation.collectionStatus === "paid";

    // Dynamic payment breakdown calculation
    const cashTotal = (donation.payments || [])
        .filter((p) => p.paymentMethod === "cash")
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const upiTotal = (donation.payments || [])
        .filter((p) => p.paymentMethod === "upi")
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const bankTotal = (donation.payments || [])
        .filter((p) => p.paymentMethod === "bank")
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    return (
        <div className="border-t border-indigo-100 bg-indigo-50/30 px-4 py-4 sm:px-6 dark:border-indigo-900/30 dark:bg-indigo-950/10">
            {/* Header / Summary Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[11px] font-bold ${statusBadge.cls}`}>
                        {statusBadge.icon} {statusBadge.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        Pledged: <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(donation.amount)}</span>
                    </span>
                    <span className="text-xs text-emerald-700 dark:text-emerald-400">
                        Collected: <span className="font-bold">{formatCurrency(donation.collectedAmount)}</span>
                    </span>
                    {(donation.pendingAmount > 0) && (
                        <span className="text-xs text-amber-700 dark:text-amber-400">
                            Pending: <span className="font-bold">{formatCurrency(donation.pendingAmount)}</span>
                        </span>
                    )}
                </div>
                {!isPaid && (
                    <button
                        onClick={() => setPaymentModal("add")}
                        className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-indigo-700 transition-colors"
                    >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Add Payment
                    </button>
                )}
            </div>

            {/* Payment Breakdown Card */}
            <div className="mb-3 rounded-2xl border border-indigo-100/70 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2.5">
                    Payment Breakdown
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-2.5 dark:border-amber-900/30 dark:bg-amber-950/20">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Cash</div>
                        <div className="mt-0.5 text-sm font-bold text-amber-900 dark:text-amber-200">
                            {formatCurrency(cashTotal)}
                        </div>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">UPI</div>
                        <div className="mt-0.5 text-sm font-bold text-emerald-900 dark:text-emerald-200">
                            {formatCurrency(upiTotal)}
                        </div>
                    </div>
                    {bankTotal > 0 && (
                        <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-2.5 dark:border-sky-900/30 dark:bg-sky-950/20">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">Bank Transfer</div>
                            <div className="mt-0.5 text-sm font-bold text-sky-900 dark:text-sky-200">
                                {formatCurrency(bankTotal)}
                            </div>
                        </div>
                    )}
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-2.5 dark:border-indigo-900/30 dark:bg-indigo-950/20">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Total Collected</div>
                        <div className="mt-0.5 text-sm font-bold text-indigo-900 dark:text-indigo-200">
                            {formatCurrency(donation.collectedAmount)}
                        </div>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-2.5 dark:border-gray-800 dark:bg-gray-850">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Pending</div>
                        <div className="mt-0.5 text-sm font-bold text-gray-800 dark:text-gray-200">
                            {formatCurrency(donation.pendingAmount)}
                        </div>
                    </div>
                </div>
            </div>

            {(donation.payments || []).length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">No payment records yet.</p>
            ) : (
                <div className="space-y-2">
                    {(donation.payments || []).map((p, idx) => (
                        <div
                            key={p._id || idx}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white bg-white px-3 py-2.5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                        >
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                                <span className="font-bold text-sm text-gray-800 dark:text-white">{formatCurrency(p.amount)}</span>
                                <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold ${pmClass(p.paymentMethod)}`}>
                                    {p.paymentMethod.toUpperCase()}
                                </span>
                                <span className="text-[11px] text-gray-400">{formatDate(p.date)}</span>
                                {p.note && <span className="text-[11px] text-gray-400 truncate max-w-[120px]">· {p.note}</span>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={() => setPaymentModal(p)}
                                    className="rounded-lg p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors dark:hover:bg-indigo-950/20"
                                    title="Edit payment"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={() => handleDeletePayment(p._id)}
                                    disabled={deletingId === p._id}
                                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50 dark:hover:bg-red-950/20"
                                    title="Delete payment"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {paymentModal !== null && (
                <PaymentModal
                    donation={donation}
                    editingPayment={paymentModal === "add" ? null : paymentModal}
                    onClose={() => setPaymentModal(null)}
                    onSaved={(updated) => { setPaymentModal(null); onUpdated(updated); }}
                />
            )}
        </div>
    );
};



const Donations = () => {
    const { selectedYear } = useMandalStore();

    // List State
    const [donations, setDonations] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalPledgedAmount, setTotalPledgedAmount] = useState(0);
    const [totalCollectedAmount, setTotalCollectedAmount] = useState(0);
    const [totalPendingAmount, setTotalPendingAmount] = useState(0);
    const [totalCashCollected, setTotalCashCollected] = useState(0);
    const [totalUpiCollected, setTotalUpiCollected] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(false);

    // Expanded payment-history row
    const [expandedId, setExpandedId] = useState(null);

    // Filter States
    const [search, setSearch] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("");
    const [donorTypeFilter, setDonorTypeFilter] = useState("");
    const [collectionStatusFilter, setCollectionStatusFilter] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Modal Form States
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [donorType, setDonorType] = useState("resident");
    const [formData, setFormData] = useState({
        donorName: "",
        amount: "",
        phone: "",
        note: "",
        date: new Date().toISOString().split("T")[0]
    });
    const [donorCategory, setDonorCategory] = useState("Individual");
    const [organizationName, setOrganizationName] = useState("");
    const [address, setAddress] = useState("");
    const [formLoading, setFormLoading] = useState(false);

    // Collection mode & split payments for new donations
    const [collectionMode, setCollectionMode] = useState("collect_now"); // "collect_now" | "pledge_only"
    const [splitPayments, setSplitPayments] = useState([
        { amount: "", paymentMethod: "cash", note: "" }
    ]);

    // Household Selector State
    const [selectedHousehold, setSelectedHousehold] = useState(null);
    const [householdQuery, setHouseholdQuery] = useState("");
    const [householdResults, setHouseholdResults] = useState([]);
    const [showHouseholdDropdown, setShowHouseholdDropdown] = useState(false);
    const [householdSearching, setHouseholdSearching] = useState(false);

    // Resident entry mode: "select" | "manual"
    const [residentMode, setResidentMode] = useState("select");
    const [buildingConfigs, setBuildingConfigs] = useState([]);
    const [manualBuilding, setManualBuilding] = useState("");
    const [manualWing, setManualWing] = useState("");
    const [manualFlat, setManualFlat] = useState("");
    const [manualHeadOfFamily, setManualHeadOfFamily] = useState("");
    const [manualPhone, setManualPhone] = useState("");
    const [manualMemberCount, setManualMemberCount] = useState(1);
    const [conflictHousehold, setConflictHousehold] = useState(null);
    const [conflictMessage, setConflictMessage] = useState("");

    const manualBuildings = [...new Set(buildingConfigs.map((cfg) => Number(cfg.building)))].sort((a, b) => a - b);
    const manualWingOptions = buildingConfigs.filter((cfg) => Number(cfg.building) === Number(manualBuilding));
    const manualConfig = manualWingOptions.find((cfg) => cfg.wing === manualWing);

    const expandFlatRanges = (ranges) => {
        const flats = [];
        (ranges || []).forEach((range) => {
            const start = Number(range.start);
            const end = Number(range.end);
            if (Number.isInteger(start) && Number.isInteger(end) && start >= 1 && end >= start) {
                for (let i = start; i <= end; i++) flats.push(i);
            }
        });
        return flats;
    };

    const manualFlatOptions = manualConfig
        ? (Array.isArray(manualConfig.flatRanges) && manualConfig.flatRanges.length > 0
            ? expandFlatRanges(manualConfig.flatRanges)
            : Array.from({ length: manualConfig.expectedFlats || 0 }, (_, i) => i + 1))
        : [];

    // External Donor Selector State
    const [selectedDonor, setSelectedDonor] = useState(null);
    const [donorQuery, setDonorQuery] = useState("");
    const [donorResults, setDonorResults] = useState([]);
    const [showDonorDropdown, setShowDonorDropdown] = useState(false);
    const [donorSearching, setDonorSearching] = useState(false);
    const [donorMode, setDonorMode] = useState("new"); // "existing" | "new"

    const fetchDonations = useCallback(async () => {
        if (!selectedYear) return;
        setLoading(true);
        try {
            const response = await donationApi.getDonations({
                festivalYear: selectedYear,
                search,
                paymentMethod,
                collectionStatus: collectionStatusFilter,
                donorType: donorTypeFilter,
                startDate,
                endDate,
                page,
                limit: 15
            });
            if (response.success) {
                setDonations(response.data.donations);
                setTotal(response.data.total);
                setTotalPledgedAmount(response.data.totalPledgedAmount || 0);
                setTotalCollectedAmount(response.data.totalCollectedAmount || 0);
                setTotalPendingAmount(response.data.totalPendingAmount || 0);
                setTotalCashCollected(response.data.totalCashCollected || 0);
                setTotalUpiCollected(response.data.totalUpiCollected || 0);
                setPages(response.data.pages);
            } else {
                toast.error(response.message || "Failed to load donations");
            }
        } catch {
            toast.error("An error occurred while loading donations");
        } finally {
            setLoading(false);
        }
    }, [selectedYear, search, paymentMethod, collectionStatusFilter, donorTypeFilter, startDate, endDate, page]);

    useEffect(() => {
        fetchDonations();
    }, [fetchDonations]);

    const handleResetFilters = () => {
        setSearch("");
        setPaymentMethod("");
        setDonorTypeFilter("");
        setCollectionStatusFilter("");
        setStartDate("");
        setEndDate("");
        setPage(1);
    };

    const resetFormState = () => {
        setFormData({
            donorName: "",
            amount: "",
            phone: "",
            note: "",
            date: new Date().toISOString().split("T")[0]
        });
        setDonorCategory("Individual");
        setOrganizationName("");
        setAddress("");
        setSelectedHousehold(null);
        setHouseholdQuery("");
        setHouseholdResults([]);
        setSelectedDonor(null);
        setDonorQuery("");
        setDonorResults([]);
        setResidentMode("select");
        setBuildingConfigs([]);
        setManualBuilding("");
        setManualWing("");
        setManualFlat("");
        setManualHeadOfFamily("");
        setManualPhone("");
        setManualMemberCount(1);
        setConflictHousehold(null);
        setConflictMessage("");
        setCollectionMode("collect_now");
        setSplitPayments([{ amount: "", paymentMethod: "cash", note: "" }]);
    };

    // Helper to add split payment row
    const handleAddSplitRow = () => {
        const pledged = Number(formData.amount) || 0;
        const currentSum = splitPayments.reduce((s, r) => s + (Number(r.amount) || 0), 0);
        const remaining = Math.max(pledged - currentSum, 0);
        const nextMethod = splitPayments.length % 2 === 1 ? "upi" : "cash";
        setSplitPayments((prev) => [
            ...prev,
            { amount: remaining > 0 ? remaining : "", paymentMethod: nextMethod, note: "" }
        ]);
    };

    const handleRemoveSplitRow = (index) => {
        setSplitPayments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSplitRowChange = (index, field, value) => {
        setSplitPayments((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const loadBuildingConfigs = async () => {
        try {
            const response = await buildingConfigApi.getBuildingConfigs();
            if (response.success) {
                setBuildingConfigs(response.data || []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Open Modal for Add
    const openAddModal = () => {
        setEditingId(null);
        setDonorType("external");
        setDonorMode("new");
        resetFormState();
        setIsOpen(true);
        loadBuildingConfigs();
    };

    // Open Modal for Edit
    const openEditModal = (donation) => {
        setEditingId(donation._id);
        resetFormState();

        const existingDonorType = donation.donorType || "external";
        setDonorType(existingDonorType);

        if (existingDonorType === "resident" && donation.household) {
            setSelectedHousehold({
                _id: donation.household._id,
                building: donation.household.building,
                wing: donation.household.wing,
                flatNumber: donation.household.flatNumber,
                headOfFamily: donation.household.headOfFamily,
                phone: donation.household.phone,
                memberCount: donation.household.memberCount
            });
            setHouseholdQuery(`${donation.household.building} · ${donation.household.wing} · ${donation.household.flatNumber}`);
        } else if (donation.externalDonor) {
            setSelectedDonor({
                _id: donation.externalDonor._id,
                donorName: donation.externalDonor.donorName,
                donorType: donation.externalDonor.donorType,
                organizationName: donation.externalDonor.organizationName
            });
            setDonorMode("existing");
            setDonorQuery(donation.externalDonor.donorName);
        } else {
            setDonorMode("new");
        }

        setFormData({
            donorName: donation.donorName,
            amount: donation.amount,
            phone: donation.phone || "",
            note: donation.note || "",
            date: new Date(donation.date).toISOString().split("T")[0]
        });
        setIsOpen(true);
    };

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            if (name === "amount" && !editingId) {
                setSplitPayments((currentSplits) => {
                    if (currentSplits.length === 1 && (currentSplits[0].amount === "" || String(currentSplits[0].amount) === String(prev.amount))) {
                        return [{ ...currentSplits[0], amount: value }];
                    }
                    return currentSplits;
                });
            }
            return { ...prev, [name]: value };
        });
    };

    // ---- Household Search ----
    const searchHouseholds = async (query) => {
        setHouseholdQuery(query);
        setShowHouseholdDropdown(true);
        if (!query.trim()) {
            setHouseholdResults([]);
            return;
        }
        setHouseholdSearching(true);
        try {
            const response = await householdApi.getHouseholds({ search: query, active: "true", limit: 8 });
            if (response.success) {
                setHouseholdResults(response.data.households);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setHouseholdSearching(false);
        }
    };

    const selectHousehold = (household) => {
        setSelectedHousehold(household);
        setHouseholdQuery(`${household.building} · ${household.wing} · ${household.flatNumber}`);
        setShowHouseholdDropdown(false);
        setFormData((prev) => ({ ...prev, donorName: household.headOfFamily }));
    };

    const clearHousehold = () => {
        setSelectedHousehold(null);
        setHouseholdQuery("");
        setHouseholdResults([]);
    };

    // ---- External Donor Search ----
    const searchDonors = async (query) => {
        setDonorQuery(query);
        setShowDonorDropdown(true);
        if (!query.trim()) {
            setDonorResults([]);
            return;
        }
        setDonorSearching(true);
        try {
            const response = await externalDonorApi.getExternalDonors({ search: query, active: "true", limit: 8 });
            if (response.success) {
                setDonorResults(response.data.donors);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setDonorSearching(false);
        }
    };

    const selectDonor = (donor) => {
        setSelectedDonor(donor);
        setDonorQuery(donor.donorName);
        setShowDonorDropdown(false);
        setFormData((prev) => ({ ...prev, donorName: donor.donorName }));
    };

    const clearDonor = () => {
        setSelectedDonor(null);
        setDonorQuery("");
        setDonorResults([]);
    };

    // ---- Manual entry conflict helpers ----
    const useConflictHousehold = () => {
        const h = conflictHousehold;
        if (!h) return;
        setSelectedHousehold(h);
        setHouseholdQuery(`${h.building} · ${h.wing} · ${h.flatNumber}`);
        setHouseholdResults([]);
        setResidentMode("select");
        setConflictHousehold(null);
        setConflictMessage("");
    };

    const handleConflictHouseholdAndDonate = async () => {
        if (!conflictHousehold) return;
        setFormLoading(true);
        try {
            const updateResponse = await householdApi.updateHousehold(conflictHousehold._id, {
                headOfFamily: manualHeadOfFamily.trim(),
                phone: manualPhone.trim(),
                memberCount: manualMemberCount ? Number(manualMemberCount) : conflictHousehold.memberCount
            });
            if (!updateResponse.success) {
                toast.error(updateResponse.message || "Failed to update household");
                return;
            }

            const payload = {
                ...formData,
                amount: Number(formData.amount),
                donorType: "resident",
                householdId: conflictHousehold._id,
                festivalYear: selectedYear
            };
            delete payload.donorName;
            delete payload.phone;

            const response = await donationApi.createDonation(payload);
            if (response.success) {
                toast.success("Donation recorded successfully");
                setIsOpen(false);
                fetchDonations();
                setConflictHousehold(null);
                setConflictMessage("");
            } else {
                toast.error(response.message || "Failed to record donation");
            }
        } catch (err) {
            toast.error("An error occurred while recording the donation");
        } finally {
            setFormLoading(false);
        }
    };

    // Handle Submit Add/Edit
    const handleFormSubmit = async (e) => {
        e.preventDefault();

        if (donorType === "resident") {
            if (residentMode === "select") {
                if (!selectedHousehold) {
                    toast.error("Please select a resident household");
                    return;
                }
            } else {
                if (!manualBuilding) {
                    toast.error("Please select a building");
                    return;
                }
                if (!manualWing) {
                    toast.error("Please select a wing");
                    return;
                }
                if (!manualFlat) {
                    toast.error("Please select a flat number");
                    return;
                }
                if (!manualHeadOfFamily.trim()) {
                    toast.error("Occupant name is required");
                    return;
                }
                if (!manualMemberCount || Number(manualMemberCount) < 1) {
                    toast.error("Member count must be at least 1");
                    return;
                }
            }
        } else if (donorMode === "new") {
            if (!formData.donorName.trim()) {
                toast.error("Donor name is required");
                return;
            }
        } else if (!selectedDonor) {
            toast.error("Please select an external donor");
            return;
        }

        if (!formData.amount || Number(formData.amount) <= 0) {
            toast.error("Valid amount is required");
            return;
        }

        setFormLoading(true);
        try {
            // Build initialPayments (only for create)
            let initialPayments;
            if (!editingId) {
                if (collectionMode === "pledge_only") {
                    initialPayments = [];
                } else {
                    const validRows = splitPayments.filter(r => Number(r.amount) > 0);
                    const sumRows = validRows.reduce((s, r) => s + Number(r.amount), 0);
                    if (sumRows > Number(formData.amount)) {
                        toast.error(`Total initial payments (₹${sumRows.toLocaleString("en-IN")}) cannot exceed the pledged amount of ₹${Number(formData.amount).toLocaleString("en-IN")}`);
                        setFormLoading(false);
                        return;
                    }
                    initialPayments = validRows.map(r => ({
                        amount: Number(r.amount),
                        paymentMethod: r.paymentMethod || "cash",
                        date: formData.date,
                        note: r.note ? r.note.trim() : ""
                    }));
                }
            }

            const payload = {
                ...formData,
                amount: Number(formData.amount),
                donorType
            };

            if (!editingId) {
                payload.initialPayments = initialPayments;
            }

            if (donorType === "resident") {
                if (residentMode === "select") {
                    payload.householdId = selectedHousehold._id;
                    delete payload.donorName;
                    delete payload.phone;
                    delete payload.address;
                    delete payload.organizationName;
                    delete payload.donorCategory;
                } else {
                    payload.building = Number(manualBuilding);
                    payload.wing = manualWing;
                    payload.flatNumber = Number(manualFlat);
                    payload.headOfFamily = manualHeadOfFamily.trim();
                    payload.phone = manualPhone.trim();
                    payload.memberCount = Number(manualMemberCount);
                    delete payload.donorName;
                    delete payload.address;
                    delete payload.organizationName;
                    delete payload.donorCategory;
                }
            } else {
                if (donorMode === "existing" && selectedDonor) {
                    payload.externalDonorId = selectedDonor._id;
                    delete payload.donorName;
                } else {
                    payload.donorCategory = donorCategory;
                    payload.organizationName = organizationName;
                    payload.address = address;
                }
            }

            let response;
            if (editingId) {
                response = await donationApi.updateDonation(editingId, payload);
            } else {
                response = await donationApi.createDonation({
                    ...payload,
                    festivalYear: selectedYear
                });
            }

            if (response.success) {
                toast.success(editingId ? "Donation updated successfully" : "Donation recorded successfully");
                setIsOpen(false);
                fetchDonations();
            } else {
                if (!editingId && response.statusCode === 409 && response.data && response.data.household) {
                    setConflictHousehold(response.data.household);
                    setConflictMessage(response.message || "A household already exists for this flat");
                } else {
                    toast.error(response.message || "Failed to save donation");
                }
            }
        } catch (err) {
            toast.error("An error occurred while saving the donation");
        } finally {
            setFormLoading(false);
        }
    };

    // Handle Delete Donation
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this donation record?")) return;
        try {
            const response = await donationApi.deleteDonation(id);
            if (response.success) {
                toast.success("Donation deleted successfully");
                if (expandedId === id) setExpandedId(null);
                fetchDonations();
            } else {
                toast.error(response.message || "Failed to delete donation");
            }
        } catch {
            toast.error("An error occurred while deleting the donation");
        }
    };

    // Update a single donation in state after a payment change
    const handlePaymentUpdated = (updatedDonation) => {
        setDonations((prev) =>
            prev.map((d) => d._id === updatedDonation._id ? updatedDonation : d)
        );
        fetchDonations(); // refresh totals
    };

    const getDonorTypeBadge = (don) => {
        if (don.donorType === "resident")
            return { label: "RESIDENT", classes: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400" };
        if (don.donorType === "external")
            return { label: "EXTERNAL", classes: "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400" };
        return { label: "REGULAR", classes: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" };
    };

    const hasActiveFilters = search || paymentMethod || donorTypeFilter || collectionStatusFilter || startDate || endDate;

    return (
        <Layout>
            {/* ── Header ─────────────────────────────────────────── */}
            <div className="mb-4 sm:mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                        Mandal Donations
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 dark:text-gray-400">
                        Record contributions from resident households &amp; external donors ({total} records)
                    </p>
                </div>
                <button
                    onClick={openAddModal}
                    className="self-start sm:self-auto flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/15 transition-all hover:bg-indigo-700"
                >
                    <Plus className="h-4 w-4" />
                    Record Donation
                </button>
            </div>

            {/* ── Financial Overview Cards ────────────────────────── */}
            <div className="mb-4 sm:mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
                <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">Pledged</span>
                        <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
                            <Receipt className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                    </div>
                    <div className="text-sm sm:text-xl font-bold text-gray-800 dark:text-white leading-tight">
                        {formatCurrency(totalPledgedAmount)}
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">{total} donations</p>
                </div>

                <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">Collected</span>
                        <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </div>
                    <div className="text-sm sm:text-xl font-bold text-emerald-700 dark:text-emerald-400 leading-tight">
                        {formatCurrency(totalCollectedAmount)}
                    </div>
                    <p className="text-[10px] sm:text-xs text-emerald-600/60 dark:text-emerald-500/50 mt-0.5">
                        {totalPledgedAmount > 0 ? Math.round((totalCollectedAmount / totalPledgedAmount) * 100) : 0}% of pledged
                    </p>
                </div>

                <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">Pending</span>
                        <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/30">
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                    </div>
                    <div className="text-sm sm:text-xl font-bold text-amber-700 dark:text-amber-400 leading-tight">
                        {formatCurrency(totalPendingAmount)}
                    </div>
                    <p className="text-[10px] sm:text-xs text-amber-600/60 dark:text-amber-500/50 mt-0.5">yet to collect</p>
                </div>

                <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Cash Collected</span>
                        <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/30">
                            <Coins className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                    </div>
                    <div className="text-sm sm:text-xl font-bold text-amber-800 dark:text-amber-300 leading-tight">
                        {formatCurrency(totalCashCollected)}
                    </div>
                    <p className="text-[10px] sm:text-xs text-amber-600/60 dark:text-amber-500/50 mt-0.5">in cash</p>
                </div>

                <div className="col-span-2 sm:col-span-1 rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">UPI Collected</span>
                        <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </div>
                    <div className="text-sm sm:text-xl font-bold text-emerald-800 dark:text-emerald-300 leading-tight">
                        {formatCurrency(totalUpiCollected)}
                    </div>
                    <p className="text-[10px] sm:text-xs text-emerald-600/60 dark:text-emerald-500/50 mt-0.5">through UPI</p>
                </div>
            </div>

            {/* ── Filter Bar ─────────────────────────────────────── */}
            <div className="mb-4 sm:mb-6 rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-2 sm:p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="grid grid-cols-2 gap-1.5 sm:gap-3 lg:grid-cols-6">
                    {/* Search */}
                    <div className="relative col-span-2 lg:col-span-2">
                        <Search className="absolute top-2 left-2 h-3 w-3 text-gray-400 sm:top-2.5 sm:left-2.5 sm:h-3.5 sm:w-3.5" />
                        <input
                            type="text"
                            placeholder="Search donor, receipt # or phone..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50/50 py-1 sm:py-2 pl-6 sm:pl-8 pr-6 sm:pr-7 text-[10px] sm:text-xs placeholder:text-[10px] sm:placeholder:text-xs placeholder-gray-400 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                        />
                        {search && (
                            <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-1.5 top-1.5 sm:right-2 sm:top-2 text-gray-400 hover:text-gray-600">
                                <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Collection Status */}
                    <div className="relative col-span-1">
                        <Filter className="absolute top-2 left-2 h-3 w-3 text-gray-400 sm:top-2.5 sm:left-2.5 sm:h-3.5 sm:w-3.5" />
                        <select
                            value={collectionStatusFilter}
                            onChange={(e) => { setCollectionStatusFilter(e.target.value); setPage(1); }}
                            className="w-full appearance-none rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50/50 py-1 sm:py-2 pl-6 sm:pl-8 pr-2.5 text-[10px] sm:text-xs text-gray-600 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                        >
                            <option value="">All Status</option>
                            <option value="paid">Paid</option>
                            <option value="partially_collected">Partial</option>
                            <option value="not_collected">Pending</option>
                        </select>
                    </div>

                    {/* Donor Type */}
                    <div className="relative col-span-1">
                        <Users className="absolute top-2 left-2 h-3 w-3 text-gray-400 sm:top-2.5 sm:left-2.5 sm:h-3.5 sm:w-3.5" />
                        <select
                            value={donorTypeFilter}
                            onChange={(e) => { setDonorTypeFilter(e.target.value); setPage(1); }}
                            className="w-full text-sm appearance-none rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50/50 py-1 sm:py-2 pl-6 sm:pl-8 pr-2.5 text-[10px] sm:text-xs text-gray-600 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                        >
                            <option value="">All Types</option>
                            <option value="resident">Resident</option>
                            <option value="external">External</option>
                        </select>
                    </div>

                    {/* Start Date */}
                    <div className="col-span-1">
                        <input
                            type="date"
                            value={startDate}
                            title="Start Date"
                            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                            className="w-full rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50/50 py-1 sm:py-2 px-1.5 sm:px-2 text-[10px] sm:text-xs text-gray-600 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                        />
                    </div>

                    {/* End Date + Reset */}
                    <div className="flex gap-1.5 col-span-1">
                        <div className="flex-1">
                            <input
                                type="date"
                                value={endDate}
                                title="End Date"
                                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                                className="w-full rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50/50 py-1 sm:py-2 px-1.5 sm:px-2 text-[10px] sm:text-xs text-gray-600 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                            />
                        </div>
                        {hasActiveFilters && (
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

            {/* ── Donation List ──────────────────────────────────── */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900">
                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                            <p className="text-xs font-medium text-gray-400">Loading records...</p>
                        </div>
                    </div>
                ) : donations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Coins className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-sm font-bold text-gray-400 dark:text-gray-500">No donations found</p>
                        <p className="text-xs text-gray-400 mt-1">Start by recording your first donation for {selectedYear}!</p>
                    </div>
                ) : (
                    <>
                        {/* ── Desktop Table ─────────────────────────── */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:bg-gray-800/20 dark:border-gray-800">
                                        <th className="px-5 py-4">Receipt No.</th>
                                        <th className="px-5 py-4">Donor</th>
                                        <th className="px-5 py-4">Source</th>
                                        <th className="px-5 py-4">Status</th>
                                        <th className="px-5 py-4">Date</th>
                                        <th className="px-5 py-4 text-right">Pledged</th>
                                        <th className="px-5 py-4 text-right">Collected</th>
                                        <th className="px-5 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {donations.map((don) => {
                                        const badge = getDonorTypeBadge(don);
                                        const statusBadge = getStatusBadge(don.collectionStatus);
                                        const isExpanded = expandedId === don._id;
                                        return (
                                            <React.Fragment key={don._id}>
                                                <tr
                                                    className={`hover:bg-gray-50/30 dark:hover:bg-gray-800/10 cursor-pointer ${isExpanded ? "bg-indigo-50/20 dark:bg-indigo-950/10" : ""}`}
                                                    onClick={() => setExpandedId(isExpanded ? null : don._id)}
                                                >
                                                    <td className="px-5 py-4 font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                                        {don.receiptNumber}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="font-semibold text-gray-700 dark:text-gray-300">{don.donorName}</div>
                                                        {don.household && (
                                                            <div className="text-[10px] text-indigo-400 mt-0.5">
                                                                B{don.household.building} · Wing {don.household.wing} · Flat {don.household.flatNumber}
                                                                <span className="text-gray-400 ml-1">· {don.household.memberCount} members</span>
                                                            </div>
                                                        )}
                                                        {don.externalDonor?.organizationName && (
                                                            <div className="text-[10px] text-gray-400 truncate max-w-xs mt-0.5">{don.externalDonor.organizationName}</div>
                                                        )}
                                                        {don.note && (
                                                            <div className="text-[10px] text-gray-400 truncate max-w-xs mt-0.5">{don.note}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-semibold ${badge.classes}`}>
                                                            {badge.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-semibold ${statusBadge.cls}`}>
                                                            {statusBadge.icon} {statusBadge.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 text-xs text-gray-400">
                                                        {formatDate(don.date)}
                                                    </td>
                                                    <td className="px-5 py-4 text-right font-bold text-sm text-gray-700 dark:text-gray-300">
                                                        {formatCurrency(don.amount)}
                                                    </td>
                                                    <td className="px-5 py-4 text-right font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                                        {formatCurrency(don.collectedAmount)}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                            <button
                                                                onClick={() => setExpandedId(isExpanded ? null : don._id)}
                                                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                                                                title="View payments"
                                                            >
                                                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                            </button>
                                                            <button
                                                                onClick={() => openEditModal(don)}
                                                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(don._id)}
                                                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan={8} className="p-0">
                                                            <PaymentHistoryPanel donation={don} onUpdated={handlePaymentUpdated} />
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-50/80 border-t border-gray-200 dark:bg-gray-800/20 dark:border-gray-800">
                                        <td colSpan={5} className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Total ({total} {total === 1 ? "donation" : "donations"})
                                        </td>
                                        <td className="px-5 py-4 text-right font-bold text-sm text-gray-700 dark:text-gray-300">
                                            {formatCurrency(totalPledgedAmount)}
                                        </td>
                                        <td className="px-5 py-4 text-right font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(totalCollectedAmount)}
                                        </td>
                                        <td className="px-5 py-4" />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* ── Mobile Cards ───────────────────────────── */}
                        <div className="divide-y divide-gray-100 md:hidden dark:divide-gray-800/40">
                            {donations.map((don) => {
                                const badge = getDonorTypeBadge(don);
                                const statusBadge = getStatusBadge(don.collectionStatus);
                                const isExpanded = expandedId === don._id;
                                return (
                                    <div key={don._id}>
                                        <div
                                            className={`px-4 py-4 cursor-pointer ${isExpanded ? "bg-indigo-50/20 dark:bg-indigo-950/10" : ""}`}
                                            onClick={() => setExpandedId(isExpanded ? null : don._id)}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-bold text-xs text-indigo-600 dark:text-indigo-400">{don.receiptNumber}</div>
                                                    <div className="mt-0.5 font-semibold text-sm text-gray-700 dark:text-gray-300">{don.donorName}</div>
                                                    {don.household && (
                                                        <div className="text-[11px] text-indigo-400 mt-0.5">
                                                            B{don.household.building} · Wing {don.household.wing} · Flat {don.household.flatNumber}
                                                            <span className="text-gray-400 ml-1">· {don.household.memberCount} {don.household.memberCount === 1 ? "member" : "members"}</span>
                                                        </div>
                                                    )}
                                                    {don.externalDonor?.organizationName && (
                                                        <div className="text-[11px] text-gray-400 truncate mt-0.5">{don.externalDonor.organizationName}</div>
                                                    )}
                                                    {don.note && (
                                                        <div className="text-[11px] text-gray-400 truncate mt-0.5">{don.note}</div>
                                                    )}
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <div className="font-bold text-sm text-gray-700 dark:text-gray-300">{formatCurrency(don.amount)}</div>
                                                    <div className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(don.collectedAmount)}</div>
                                                    <div className="mt-0.5 text-[11px] text-gray-400">{formatDate(don.date)}</div>
                                                </div>
                                            </div>
                                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                                <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[11px] font-semibold ${badge.classes}`}>
                                                    {badge.label}
                                                </span>
                                                <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[11px] font-semibold ${statusBadge.cls}`}>
                                                    {statusBadge.icon} {statusBadge.label}
                                                </span>
                                                <div className="ml-auto flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => setExpandedId(isExpanded ? null : don._id)}
                                                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors dark:border-gray-800"
                                                        title="View payments"
                                                    >
                                                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(don)}
                                                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition-colors dark:border-gray-800"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(don._id)}
                                                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors dark:border-gray-800"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <PaymentHistoryPanel donation={don} onUpdated={handlePaymentUpdated} />
                                        )}
                                    </div>
                                );
                            })}

                            {/* Mobile total */}
                            <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50/80 px-4 py-4 dark:bg-gray-800/20">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Total ({total} {total === 1 ? "donation" : "donations"})
                                </span>
                                <div className="text-right">
                                    <div className="text-xs text-gray-500">Pledged: <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(totalPledgedAmount)}</span></div>
                                    <div className="text-xs text-emerald-600">Collected: <span className="font-bold">{formatCurrency(totalCollectedAmount)}</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Pagination */}
                        {pages > 1 && (
                            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 dark:border-gray-800">
                                <span className="text-xs text-gray-500">Page {page} of {pages}</span>
                                <div className="flex gap-2">
                                    <button disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-xl border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:hover:bg-gray-950">
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button disabled={page === pages} onClick={() => setPage(page + 1)} className="rounded-xl border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:hover:bg-gray-950">
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Donation Form Modal ────────────────────────────── */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4">
                    <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 dark:bg-gray-900 dark:border dark:border-gray-800">
                        <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-gray-800">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                {editingId ? "Edit Donation Record" : "Record New Donation"}
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit}>
                            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                                {/* Donor Type */}
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Donor Type *</label>
                                    <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <button type="button" onClick={() => setDonorType("resident")} className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold transition-all ${donorType === "resident" ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/20" : "border-gray-200 hover:bg-gray-50 dark:border-gray-800"}`}>
                                            <HomeIcon className="h-4 w-4" /> Resident Household
                                        </button>
                                        <button type="button" onClick={() => setDonorType("external")} className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold transition-all ${donorType === "external" ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/20" : "border-gray-200 hover:bg-gray-50 dark:border-gray-800"}`}>
                                            <Building2 className="h-4 w-4" /> External Donor
                                        </button>
                                    </div>
                                </div>

                                {donorType === "resident" ? (
                                    <>
                                        <div>
                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Resident Donation Option *</label>
                                            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <button type="button" onClick={() => { setResidentMode("select"); setConflictHousehold(null); setConflictMessage(""); }} className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold transition-all ${residentMode === "select" ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/20" : "border-gray-200 hover:bg-gray-50 dark:border-gray-800"}`}>
                                                    <HomeIcon className="h-4 w-4" /> Select from Household
                                                </button>
                                                <button type="button" onClick={() => { setResidentMode("manual"); setConflictHousehold(null); setConflictMessage(""); }} className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold transition-all ${residentMode === "manual" ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/20" : "border-gray-200 hover:bg-gray-50 dark:border-gray-800"}`}>
                                                    <Building2 className="h-4 w-4" /> Enter Manually &amp; Assign
                                                </button>
                                            </div>
                                        </div>

                                        {residentMode === "select" ? (
                                            <div>
                                                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Resident Household *</label>
                                                <div className="relative mt-2">
                                                    <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        value={householdQuery}
                                                        onChange={(e) => searchHouseholds(e.target.value)}
                                                        onFocus={() => setShowHouseholdDropdown(true)}
                                                        placeholder="Search by name, building, wing or flat..."
                                                        className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-8 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                                                    />
                                                    {householdQuery && !selectedHousehold && (
                                                        <button type="button" onClick={clearHousehold} className="absolute top-2.5 right-3 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                                                    )}
                                                    {showHouseholdDropdown && (
                                                        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
                                                            {householdSearching ? (
                                                                <div className="flex items-center justify-center gap-2 py-4">
                                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                                                                    <span className="text-xs text-gray-400">Searching...</span>
                                                                </div>
                                                            ) : householdResults.length === 0 ? (
                                                                <p className="px-4 py-4 text-xs text-gray-400 text-center">{householdQuery.trim() ? "No matching households." : "Type to search registered households"}</p>
                                                            ) : (
                                                                householdResults.map((h) => (
                                                                    <button type="button" key={h._id} onClick={() => selectHousehold(h)} className="flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left hover:bg-indigo-50/50 transition-colors dark:border-gray-800 dark:hover:bg-gray-800/40">
                                                                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">B{h.building}</div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="text-xs font-bold text-gray-700 dark:text-gray-300">Wing {h.wing} · Flat {h.flatNumber}</div>
                                                                            <div className="truncate text-[11px] text-gray-400">{h.headOfFamily} · {h.memberCount} {h.memberCount === 1 ? "member" : "members"} · {h.phone || "no phone"}</div>
                                                                        </div>
                                                                    </button>
                                                                ))
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                {selectedHousehold && (
                                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50/50 px-4 py-3 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <HomeIcon className="h-4 w-4 shrink-0 text-indigo-500" />
                                                                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Building {selectedHousehold.building} · Wing {selectedHousehold.wing} · Flat {selectedHousehold.flatNumber}</span>
                                                            </div>
                                                            <p className="text-xs text-indigo-600/80 dark:text-indigo-400/80 mt-1">{selectedHousehold.headOfFamily} · {selectedHousehold.phone || "no phone"}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:bg-gray-900 dark:text-indigo-400">
                                                            <Users className="h-3.5 w-3.5" />
                                                            {selectedHousehold.memberCount} {selectedHousehold.memberCount === 1 ? "member" : "members"}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                {buildingConfigs.length === 0 && (
                                                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
                                                        No building &amp; wing configurations found. Configure from the Households page first.
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                                    <div>
                                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Building *</label>
                                                        <select value={manualBuilding} onChange={(e) => { setManualBuilding(e.target.value); setManualWing(""); setManualFlat(""); }} className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white">
                                                            <option value="">Select</option>
                                                            {manualBuildings.map((b) => (<option key={b} value={b}>Building {b}</option>))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Wing *</label>
                                                        <select value={manualWing} disabled={!manualBuilding} onChange={(e) => { setManualWing(e.target.value); setManualFlat(""); }} className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white">
                                                            <option value="">Select</option>
                                                            {manualWingOptions.map((cfg) => (<option key={cfg._id} value={cfg.wing}>Wing {cfg.wing}</option>))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Flat No. *</label>
                                                        <select value={manualFlat} disabled={!manualConfig} onChange={(e) => setManualFlat(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white">
                                                            <option value="">Select</option>
                                                            {manualFlatOptions.map((f) => (<option key={f} value={f}>Flat {f}</option>))}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                    <div>
                                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Occupant Name *</label>
                                                        <input type="text" value={manualHeadOfFamily} onChange={(e) => setManualHeadOfFamily(e.target.value)} placeholder="Head of the family / occupant" className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Phone Number</label>
                                                        <input type="tel" value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} placeholder="9876543210" className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                    <div>
                                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Family Member Count *</label>
                                                        <input type="number" min="1" value={manualMemberCount} onChange={(e) => setManualMemberCount(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white" />
                                                    </div>
                                                    <div className="flex items-end">
                                                        <p className="text-[11px] text-gray-400 leading-relaxed pb-1">
                                                            Will be registered as Building {manualBuilding || "-"} · Wing {manualWing || "-"} · Flat {manualFlat || "-"}.
                                                        </p>
                                                    </div>
                                                </div>
                                                {conflictHousehold && (
                                                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                                                        <div className="flex items-start gap-2">
                                                            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5 dark:text-amber-400" />
                                                            <div>
                                                                <p className="text-xs font-bold text-amber-800 dark:text-amber-300">{conflictMessage}</p>
                                                                <p className="text-[11px] text-amber-700/80 mt-1 dark:text-amber-400/80">{conflictHousehold.headOfFamily} · {conflictHousehold.phone || "no phone"} · {conflictHousehold.memberCount} {conflictHousehold.memberCount === 1 ? "member" : "members"}</p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            <button type="button" onClick={useConflictHousehold} className="rounded-lg border border-indigo-600 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500 dark:bg-gray-900 dark:text-indigo-400">Use This Existing Household</button>
                                                            <button type="button" onClick={handleConflictHouseholdAndDonate} disabled={formLoading} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50">Update Occupant &amp; Create Donation</button>
                                                            <button type="button" onClick={() => setConflictHousehold(null)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:border-gray-800">Keep Editing</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="flex flex-wrap gap-2">
                                            <button type="button" onClick={() => setDonorMode("existing")} className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${donorMode === "existing" ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/20" : "border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-800"}`}>Select Existing Donor</button>
                                            <button type="button" onClick={() => setDonorMode("new")} className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${donorMode === "new" ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/20" : "border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-800"}`}>Add New Donor</button>
                                        </div>

                                        {donorMode === "existing" ? (
                                            <div>
                                                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">External Donor *</label>
                                                <div className="relative mt-2">
                                                    <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                                                    <input type="text" value={donorQuery} onChange={(e) => searchDonors(e.target.value)} onFocus={() => setShowDonorDropdown(true)} placeholder="Search donor name, phone or business..." className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-8 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white" />
                                                    {donorQuery && !selectedDonor && (
                                                        <button type="button" onClick={clearDonor} className="absolute top-2.5 right-3 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                                                    )}
                                                    {showDonorDropdown && (
                                                        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
                                                            {donorSearching ? (
                                                                <div className="flex items-center justify-center gap-2 py-4"><div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" /><span className="text-xs text-gray-400">Searching...</span></div>
                                                            ) : donorResults.length === 0 ? (
                                                                <p className="px-4 py-4 text-center text-xs text-gray-400">{donorQuery.trim() ? "No donors found. Use 'Add New Donor' instead." : "Type to search donors"}</p>
                                                            ) : (
                                                                donorResults.map((donor) => (
                                                                    <button type="button" key={donor._id} onClick={() => selectDonor(donor)} className="flex w-full items-center justify-between border-b border-gray-50 px-4 py-3 text-left hover:bg-indigo-50/50 transition-colors dark:border-gray-800 dark:hover:bg-gray-800/40">
                                                                        <div>
                                                                            <div className="text-xs font-bold text-gray-700 dark:text-gray-300">{donor.donorName}{donor.organizationName && <span className="text-[10px] font-medium text-gray-400 ml-1.5">{donor.organizationName}</span>}</div>
                                                                            <div className="text-[11px] text-gray-400">{donor.donorType} · {donor.phone || "no phone"}</div>
                                                                        </div>
                                                                        <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">{donor.donationCount} donations</span>
                                                                    </button>
                                                                ))
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                {selectedDonor && (
                                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                                                        <div>
                                                            <div className="text-sm font-bold text-amber-800 dark:text-amber-300">{selectedDonor.donorName}</div>
                                                            <p className="text-xs text-amber-700/80 dark:text-amber-400/80">{selectedDonor.donorType}{selectedDonor.organizationName ? ` · ${selectedDonor.organizationName}` : ""}{selectedDonor.phone ? ` · ${selectedDonor.phone}` : ""}</p>
                                                        </div>
                                                        <span className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:bg-gray-900 dark:text-amber-400">External Donor</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                <div>
                                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Donor Name *</label>
                                                    <input type="text" name="donorName" required value={formData.donorName} onChange={handleInputChange} placeholder="Rajesh Enterprises" className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white" />
                                                </div>
                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                    <div>
                                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Donor Type</label>
                                                        <select value={donorCategory} onChange={(e) => setDonorCategory(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white">
                                                            {DONOR_CATEGORIES.map((category) => (<option key={category} value={category}>{category}</option>))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Phone Number</label>
                                                        <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="9876543210" className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                    <div>
                                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Organization / Business</label>
                                                        <input type="text" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="e.g. Sharma Traders" className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Address</label>
                                                        <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Shop No. 12, Main Market" className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white" />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}

                                {/* ── Amount, Date, Note ─────────────── */}
                                <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Pledged Amount (₹) *</label>
                                            <input type="number" name="amount" required min="0" value={formData.amount} onChange={handleInputChange} placeholder="5000" className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Donation Date *</label>
                                            <input type="date" name="date" required value={formData.date} onChange={handleInputChange} className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white" />
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Note / Remark</label>
                                        <input type="text" name="note" value={formData.note} onChange={handleInputChange} placeholder="Special contribution or remarks..." className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white" />
                                    </div>
                                </div>

                                {/* ── Collection Mode (new donations only) ── */}
                                {!editingId && (
                                    <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Collection Mode *
                                        </label>
                                        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <button
                                                type="button"
                                                onClick={() => setCollectionMode("collect_now")}
                                                className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold transition-all ${
                                                    collectionMode === "collect_now"
                                                        ? "border-emerald-600 bg-emerald-50/50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950/20"
                                                        : "border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-800"
                                                }`}
                                            >
                                                <CheckCircle2 className="h-4 w-4" /> Collect Now / Split Payments
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCollectionMode("pledge_only")}
                                                className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold transition-all ${
                                                    collectionMode === "pledge_only"
                                                        ? "border-amber-600 bg-amber-50/50 text-amber-700 dark:border-amber-500 dark:bg-amber-950/20"
                                                        : "border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-800"
                                                }`}
                                            >
                                                <Clock className="h-4 w-4" /> Pledge Only (Collect Later)
                                            </button>
                                        </div>

                                        {collectionMode === "collect_now" && (
                                            <div className="mt-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                                        Payment Rows (Split by Method)
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={handleAddSplitRow}
                                                        className="flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400"
                                                    >
                                                        <Plus className="h-3.5 w-3.5" /> Add Split Row
                                                    </button>
                                                </div>

                                                {/* Stacked payment rows */}
                                                <div className="space-y-3">
                                                    {splitPayments.map((row, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="rounded-2xl border border-gray-200 bg-gray-50/60 p-3.5 dark:border-gray-800 dark:bg-gray-950/50 space-y-2.5"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                                    Payment {idx + 1}
                                                                </span>
                                                                {splitPayments.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveSplitRow(idx)}
                                                                        className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" /> Remove
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                                <div>
                                                                    <label className="text-[11px] font-semibold text-gray-500">
                                                                        Amount (₹) *
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        min="0.01"
                                                                        step="0.01"
                                                                        value={row.amount}
                                                                        onChange={(e) =>
                                                                            handleSplitRowChange(idx, "amount", e.target.value)
                                                                        }
                                                                        placeholder="200"
                                                                        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                                                        required
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[11px] font-semibold text-gray-500">
                                                                        Method *
                                                                    </label>
                                                                    <div className="mt-1 grid grid-cols-3 gap-1.5">
                                                                        {["cash", "upi", "bank"].map((m) => (
                                                                            <button
                                                                                key={m}
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    handleSplitRowChange(idx, "paymentMethod", m)
                                                                                }
                                                                                className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                                                                                    row.paymentMethod === m
                                                                                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/20"
                                                                                        : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                                                                                }`}
                                                                            >
                                                                                {m === "bank" ? "Bank" : m.toUpperCase()}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <input
                                                                    type="text"
                                                                    value={row.note || ""}
                                                                    onChange={(e) =>
                                                                        handleSplitRowChange(idx, "note", e.target.value)
                                                                    }
                                                                    placeholder="Optional reference / note for this payment..."
                                                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Live Calculation Box */}
                                                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3.5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                                                    <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 mb-2">
                                                        Live Calculation
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                                        <div className="rounded-xl bg-white p-2 dark:bg-gray-900">
                                                            <div className="text-[10px] text-gray-400 font-semibold">Pledged</div>
                                                            <div className="font-bold text-gray-800 dark:text-white mt-0.5">
                                                                {formatCurrency(Number(formData.amount) || 0)}
                                                            </div>
                                                        </div>
                                                        <div className="rounded-xl bg-white p-2 dark:bg-gray-900">
                                                            <div className="text-[10px] text-emerald-600 font-semibold">Collected</div>
                                                            <div className="font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                                                                {formatCurrency(
                                                                    splitPayments.reduce((s, r) => s + (Number(r.amount) || 0), 0)
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="rounded-xl bg-white p-2 dark:bg-gray-900">
                                                            <div className="text-[10px] text-amber-600 font-semibold">Pending</div>
                                                            <div className="font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                                                                {formatCurrency(
                                                                    Math.max(
                                                                        (Number(formData.amount) || 0) -
                                                                            splitPayments.reduce((s, r) => s + (Number(r.amount) || 0), 0),
                                                                        0
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Method Breakdown Pills */}
                                                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
                                                        <span className="rounded-lg bg-amber-100/70 px-2 py-0.5 font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                                            Cash: {formatCurrency(
                                                                splitPayments
                                                                    .filter((r) => r.paymentMethod === "cash")
                                                                    .reduce((s, r) => s + (Number(r.amount) || 0), 0)
                                                            )}
                                                        </span>
                                                        <span className="rounded-lg bg-emerald-100/70 px-2 py-0.5 font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                            UPI: {formatCurrency(
                                                                splitPayments
                                                                    .filter((r) => r.paymentMethod === "upi")
                                                                    .reduce((s, r) => s + (Number(r.amount) || 0), 0)
                                                            )}
                                                        </span>
                                                        {splitPayments.some((r) => r.paymentMethod === "bank") && (
                                                            <span className="rounded-lg bg-sky-100/70 px-2 py-0.5 font-bold text-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
                                                                Bank: {formatCurrency(
                                                                    splitPayments
                                                                        .filter((r) => r.paymentMethod === "bank")
                                                                        .reduce((s, r) => s + (Number(r.amount) || 0), 0)
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Over-pledged warning */}
                                                    {splitPayments.reduce((s, r) => s + (Number(r.amount) || 0), 0) >
                                                        (Number(formData.amount) || 0) && (
                                                        <div className="mt-2.5 flex items-center gap-1.5 rounded-xl bg-red-50 p-2.5 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-400">
                                                            <AlertTriangle className="h-4 w-4 shrink-0" />
                                                            Total payments (₹
                                                            {splitPayments
                                                                .reduce((s, r) => s + (Number(r.amount) || 0), 0)
                                                                .toLocaleString("en-IN")}
                                                            ) cannot exceed pledged amount of ₹
                                                            {(Number(formData.amount) || 0).toLocaleString("en-IN")}.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {collectionMode === "pledge_only" && (
                                            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
                                                The donation will be created as <span className="font-bold">Pending</span>. You can record payments later from the donation list.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4 rounded-b-3xl sm:flex-row sm:items-center sm:justify-end sm:gap-3 dark:border-gray-800 dark:bg-gray-950">
                                <button type="button" onClick={() => setIsOpen(false)} className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-xs font-semibold text-gray-500 hover:bg-gray-50 sm:w-auto dark:border-gray-800 dark:bg-gray-900">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        formLoading ||
                                        (!editingId &&
                                            collectionMode === "collect_now" &&
                                            splitPayments.reduce((s, r) => s + (Number(r.amount) || 0), 0) >
                                                (Number(formData.amount) || 0))
                                    }
                                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 px-4 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
                                >
                                    {formLoading
                                        ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        : (editingId ? "Update Record" : "Create Donation")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Donations;
