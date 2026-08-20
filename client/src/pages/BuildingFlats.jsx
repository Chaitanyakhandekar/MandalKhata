import React, { useEffect, useState, useCallback, useMemo } from "react";
import Layout from "../components/Layout.jsx";
import { buildingConfigApi } from "../api/buildingConfig.api.js";
import { useMandalStore } from "../store/useMandalStore.js";
import { Link, useNavigate } from "react-router-dom";
import {
    Building2,
    Home as HomeIcon,
    Search,
    CheckCircle2,
    AlertCircle,
    HelpCircle,
    Phone,
    MessageSquare,
    ChevronRight,
    X,
    Coins,
    Users,
    Layers,
    Filter,
    ArrowUpRight,
    TrendingUp,
    TrendingDown,
    Receipt,
    RefreshCw
} from "lucide-react";
import toast from "react-hot-toast";

const BuildingFlats = () => {
    const navigate = useNavigate();
    const { selectedYear } = useMandalStore();

    const [data, setData] = useState({
        festivalYear: "",
        summary: {
            totalBuildings: 0,
            totalWings: 0,
            totalFlats: 0,
            totalRegisteredFlats: 0,
            totalUnregisteredFlats: 0,
            totalPaidFlats: 0,
            totalUnpaidFlats: 0,
            totalDonationAmount: 0,
            paidPercentage: 0
        },
        buildings: []
    });
    const [loading, setLoading] = useState(false);

    // Filter states
    const [selectedBuilding, setSelectedBuilding] = useState("all");
    const [selectedWing, setSelectedWing] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all"); // "all" | "paid" | "unpaid" | "unregistered"
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState("floor"); // "floor" | "all"

    // Detail Modal State
    const [activeFlat, setActiveFlat] = useState(null);

    const fetchFlatsStatus = useCallback(async () => {
        if (!selectedYear) return;
        setLoading(true);
        try {
            const res = await buildingConfigApi.getFlatsDonationStatus({ festivalYear: selectedYear });
            if (res?.success && res?.data) {
                setData(res.data);
            } else {
                toast.error(res?.message || "Failed to load flats donation status");
            }
        } catch (err) {
            toast.error("Failed to load flats donation status");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [selectedYear]);

    useEffect(() => {
        fetchFlatsStatus();
    }, [fetchFlatsStatus]);

    // Available wings for the selected building
    const availableWings = useMemo(() => {
        if (selectedBuilding === "all") {
            const wingsSet = new Set();
            data.buildings.forEach((b) => {
                b.wings.forEach((w) => wingsSet.add(w.wing));
            });
            return Array.from(wingsSet).sort();
        }
        const b = data.buildings.find((b) => String(b.building) === String(selectedBuilding));
        return b ? b.wings.map((w) => w.wing).sort() : [];
    }, [data.buildings, selectedBuilding]);

    // Reset selected wing if it's no longer available
    useEffect(() => {
        if (selectedWing !== "all" && !availableWings.includes(selectedWing)) {
            setSelectedWing("all");
        }
    }, [selectedBuilding, availableWings, selectedWing]);

    // Filtered flat list
    const filteredFlats = useMemo(() => {
        let flatsList = [];

        data.buildings.forEach((b) => {
            if (selectedBuilding !== "all" && String(b.building) !== String(selectedBuilding)) {
                return;
            }
            b.wings.forEach((w) => {
                if (selectedWing !== "all" && w.wing !== selectedWing) {
                    return;
                }
                flatsList.push(...w.flats);
            });
        });

        // Status Filter
        if (statusFilter === "paid") {
            flatsList = flatsList.filter((f) => f.isPaid);
        } else if (statusFilter === "unpaid") {
            flatsList = flatsList.filter((f) => !f.isPaid && f.isRegistered);
        } else if (statusFilter === "unregistered") {
            flatsList = flatsList.filter((f) => !f.isRegistered);
        }

        // Search Filter
        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            flatsList = flatsList.filter((f) => {
                const flatStr = String(f.flatNumber);
                const occupant = (f.occupantName || "").toLowerCase();
                const phone = (f.phone || "").toLowerCase();
                const bWing = `b${f.building} w${f.wing}`.toLowerCase();
                return (
                    flatStr.includes(query) ||
                    occupant.includes(query) ||
                    phone.includes(query) ||
                    bWing.includes(query)
                );
            });
        }

        return flatsList;
    }, [data.buildings, selectedBuilding, selectedWing, statusFilter, searchQuery]);

    // Group flats by floor
    const flatsByFloor = useMemo(() => {
        const floorMap = new Map();
        filteredFlats.forEach((flat) => {
            const fl = flat.floor || Math.floor(flat.flatNumber / 100) || 1;
            if (!floorMap.has(fl)) {
                floorMap.set(fl, []);
            }
            floorMap.get(fl).push(flat);
        });

        // Sort by floor ascending
        const sortedFloors = Array.from(floorMap.keys()).sort((a, b) => a - b);
        return sortedFloors.map((floorNum) => ({
            floor: floorNum,
            flats: floorMap.get(floorNum)
        }));
    }, [filteredFlats]);

    // Counts for current building/wing scope
    const currentScopeStats = useMemo(() => {
        let total = 0;
        let paid = 0;
        let unpaid = 0;
        let unregistered = 0;
        let amount = 0;

        data.buildings.forEach((b) => {
            if (selectedBuilding !== "all" && String(b.building) !== String(selectedBuilding)) {
                return;
            }
            b.wings.forEach((w) => {
                if (selectedWing !== "all" && w.wing !== selectedWing) {
                    return;
                }
                w.flats.forEach((f) => {
                    total++;
                    if (f.isPaid) {
                        paid++;
                        amount += f.totalPaid || 0;
                    } else if (f.isRegistered) {
                        unpaid++;
                    } else {
                        unregistered++;
                    }
                });
            });
        });

        return {
            total,
            paid,
            unpaid,
            unregistered,
            amount,
            paidPct: total > 0 ? Math.round((paid / total) * 100) : 0
        };
    }, [data.buildings, selectedBuilding, selectedWing]);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(val || 0);
    };

    return (
        <Layout>
            {/* Header Section */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                            Building Flats & Donations
                        </h1>
                        <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
                            {selectedYear}
                        </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                        View occupant names, flat registration, and live donation payment status
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchFlatsStatus}
                        disabled={loading}
                        className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                    <button
                        onClick={() => navigate("/donations")}
                        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700"
                    >
                        <Coins className="h-3.5 w-3.5" />
                        <span>Add Donation</span>
                    </button>
                </div>
            </div>

            {/* Top Metric Cards (Mobile Horizontal Scrollable / Responsive Grid) */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 mb-6">
                {/* Total Flats */}
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                            Total Flats
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            <Building2 className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {currentScopeStats.total}
                        </span>
                        <span className="text-[11px] text-gray-400">Flats</span>
                    </div>
                </div>

                {/* Paid Flats */}
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4 shadow-sm dark:border-emerald-950/40 dark:bg-emerald-950/10">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Donation Paid
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            <CheckCircle2 className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                            {currentScopeStats.paid}
                        </span>
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-500">
                            ({currentScopeStats.paidPct}%)
                        </span>
                    </div>
                </div>

                {/* Unpaid Registered */}
                <div className="rounded-2xl border border-rose-100 bg-rose-50/30 p-4 shadow-sm dark:border-rose-950/40 dark:bg-rose-950/10">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                            Pending / Unpaid
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                            <AlertCircle className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-xl sm:text-2xl font-bold text-rose-700 dark:text-rose-400">
                            {currentScopeStats.unpaid}
                        </span>
                        <span className="text-[11px] text-gray-400">Occupants</span>
                    </div>
                </div>

                {/* Total Collection */}
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4 shadow-sm dark:border-indigo-950/40 dark:bg-indigo-950/10">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            Collected
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                            <Coins className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <span className="text-lg sm:text-xl font-bold text-indigo-700 dark:text-indigo-400">
                            {formatCurrency(currentScopeStats.amount)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Building & Wing Selector Tabs (Mobile Touch-Friendly Scrollable) */}
            <div className="mb-6 space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                {/* Building Tabs */}
                <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                        Select Building
                    </label>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        <button
                            onClick={() => setSelectedBuilding("all")}
                            className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                                selectedBuilding === "all"
                                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                                    : "border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-300"
                            }`}
                        >
                            All Buildings ({data.summary.totalFlats})
                        </button>
                        {data.buildings.map((b) => (
                            <button
                                key={b.building}
                                onClick={() => setSelectedBuilding(String(b.building))}
                                className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                                    String(selectedBuilding) === String(b.building)
                                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                                        : "border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-300"
                                }`}
                            >
                                Building {b.building} ({b.summary.totalFlats})
                            </button>
                        ))}
                    </div>
                </div>

                {/* Wing Tabs */}
                {availableWings.length > 0 && (
                    <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                            Select Wing
                        </label>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                            <button
                                onClick={() => setSelectedWing("all")}
                                className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                                    selectedWing === "all"
                                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                                        : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-300"
                                }`}
                            >
                                All Wings
                            </button>
                            {availableWings.map((w) => (
                                <button
                                    key={w}
                                    onClick={() => setSelectedWing(w)}
                                    className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                                        selectedWing === w
                                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                                            : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-300"
                                    }`}
                                >
                                    Wing {w}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Search & Filter Controls Bar */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Search Bar */}
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search flat #, occupant name, or phone..."
                        className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-gray-800 placeholder-gray-400 shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Status Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                    <button
                        onClick={() => setStatusFilter("all")}
                        className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                            statusFilter === "all"
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
                        }`}
                    >
                        All ({currentScopeStats.total})
                    </button>
                    <button
                        onClick={() => setStatusFilter("paid")}
                        className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                            statusFilter === "paid"
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "border border-gray-200 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-gray-800 dark:bg-gray-900 dark:text-emerald-400"
                        }`}
                    >
                        Paid ({currentScopeStats.paid})
                    </button>
                    <button
                        onClick={() => setStatusFilter("unpaid")}
                        className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                            statusFilter === "unpaid"
                                ? "bg-rose-600 text-white shadow-sm"
                                : "border border-gray-200 bg-white text-rose-700 hover:bg-rose-50 dark:border-gray-800 dark:bg-gray-900 dark:text-rose-400"
                        }`}
                    >
                        Unpaid ({currentScopeStats.unpaid})
                    </button>
                    <button
                        onClick={() => setStatusFilter("unregistered")}
                        className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                            statusFilter === "unregistered"
                                ? "bg-slate-700 text-white shadow-sm"
                                : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
                        }`}
                    >
                        Unregistered ({currentScopeStats.unregistered})
                    </button>
                </div>
            </div>

            {/* Main Flats Content */}
            {loading ? (
                <div className="flex h-64 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                        <p className="text-xs font-semibold text-gray-400">Loading flat donation status...</p>
                    </div>
                </div>
            ) : filteredFlats.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <Building2 className="h-12 w-12 text-gray-300 dark:text-gray-700 mb-3" />
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">No flats found</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm">
                        {searchQuery
                            ? `No flats matching "${searchQuery}"`
                            : "Configure your building flat ranges in Settings or Households to get started"}
                    </p>
                    <div className="mt-4 flex gap-3">
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="rounded-xl border border-gray-200 px-3.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
                            >
                                Clear search
                            </button>
                        )}
                        <button
                            onClick={() => navigate("/households")}
                            className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
                        >
                            Manage Buildings
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {flatsByFloor.map(({ floor, flats }) => (
                        <div
                            key={floor}
                            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                        >
                            {/* Floor Header */}
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3 dark:border-gray-800">
                                <div className="flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-indigo-500" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                                        Floor {floor} ({flats.length} Flats)
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400">
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                        {flats.filter((f) => f.isPaid).length} Paid
                                    </span>
                                    <span>·</span>
                                    <span className="text-rose-600 dark:text-rose-400">
                                        {flats.filter((f) => !f.isPaid && f.isRegistered).length} Unpaid
                                    </span>
                                </div>
                            </div>

                            {/* Flat Grid for this floor */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                {flats.map((flat) => {
                                    const isPaid = flat.isPaid;
                                    const isRegistered = flat.isRegistered;
                                    const occupant = flat.occupantName;

                                    return (
                                        <div
                                            key={`${flat.building}-${flat.wing}-${flat.flatNumber}`}
                                            onClick={() => setActiveFlat(flat)}
                                            className={`group relative cursor-pointer rounded-xl border p-3.5 transition-all hover:shadow-md ${
                                                isPaid
                                                    ? "border-emerald-200 bg-emerald-50/20 hover:border-emerald-400 dark:border-emerald-900/40 dark:bg-emerald-950/10"
                                                    : isRegistered
                                                    ? "border-rose-200 bg-rose-50/20 hover:border-rose-400 dark:border-rose-900/40 dark:bg-rose-950/10"
                                                    : "border-gray-200 bg-gray-50/40 hover:border-gray-400 dark:border-gray-800 dark:bg-gray-800/20"
                                            }`}
                                        >
                                            {/* Top Row: Flat # + Badges */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-sm font-extrabold text-gray-900 dark:text-white">
                                                            Flat {flat.flatNumber}
                                                        </span>
                                                        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                                            B{flat.building} · W-{flat.wing}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Donation Status Pill */}
                                                {isPaid ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                                                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                        Paid
                                                    </span>
                                                ) : isRegistered ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                                                        <AlertCircle className="h-3 w-3 text-rose-600" />
                                                        Unpaid
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                                        Unregistered
                                                    </span>
                                                )}
                                            </div>

                                            {/* Occupant Name (or Flat number fallback) */}
                                            <div className="mt-2.5">
                                                <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                                                    {occupant ? occupant : `Flat ${flat.flatNumber}`}
                                                </p>
                                                {isRegistered ? (
                                                    <p className="mt-0.5 text-[11px] text-gray-400 truncate">
                                                        {flat.memberCount} {flat.memberCount === 1 ? "member" : "members"}
                                                        {flat.phone ? ` · ${flat.phone}` : ""}
                                                    </p>
                                                ) : (
                                                    <p className="mt-0.5 text-[11px] text-gray-400 italic">
                                                        No resident registered
                                                    </p>
                                                )}
                                            </div>

                                            {/* Bottom Amount or Action prompt */}
                                            <div className="mt-3 flex items-center justify-between border-t border-gray-100/60 pt-2 text-[11px] dark:border-gray-800/60">
                                                {isPaid ? (
                                                    <div className="font-bold text-emerald-700 dark:text-emerald-400">
                                                        ₹{flat.totalPaid.toLocaleString("en-IN")}
                                                    </div>
                                                ) : (
                                                    <div className="text-gray-400 font-medium">
                                                        ₹0 paid
                                                    </div>
                                                )}
                                                <span className="text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity dark:text-indigo-400">
                                                    View Details →
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Mobile Bottom Sheet / Detail Modal */}
            {activeFlat && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/60 backdrop-blur-sm sm:items-center p-0 sm:p-4"
                    onClick={() => setActiveFlat(null)}
                >
                    <div
                        className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-gray-100 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-start justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
                                        Flat {activeFlat.flatNumber}
                                    </h2>
                                    <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
                                        Building {activeFlat.building} · Wing {activeFlat.wing}
                                    </span>
                                </div>
                                <p className="mt-0.5 text-xs text-gray-400">
                                    Floor {activeFlat.floor || Math.floor(activeFlat.flatNumber / 100) || 1}
                                </p>
                            </div>
                            <button
                                onClick={() => setActiveFlat(null)}
                                className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Occupant Information */}
                        <div className="py-4 space-y-4">
                            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                        Resident Occupant
                                    </span>
                                    {activeFlat.isRegistered ? (
                                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                            Registered Active
                                        </span>
                                    ) : (
                                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                            Unregistered
                                        </span>
                                    )}
                                </div>

                                {activeFlat.isRegistered ? (
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                            {activeFlat.occupantName}
                                        </h3>
                                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Users className="h-3.5 w-3.5 text-indigo-500" />
                                                {activeFlat.memberCount} Family Members
                                            </span>
                                            {activeFlat.phone && (
                                                <span className="flex items-center gap-1">
                                                    <Phone className="h-3.5 w-3.5 text-emerald-500" />
                                                    {activeFlat.phone}
                                                </span>
                                            )}
                                        </div>

                                        {/* Mobile 1-Tap Quick Action Buttons (Call / WhatsApp) */}
                                        {activeFlat.phone && (
                                            <div className="mt-3.5 flex items-center gap-2">
                                                <a
                                                    href={`tel:${activeFlat.phone}`}
                                                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                                                >
                                                    <Phone className="h-3.5 w-3.5 text-emerald-600" />
                                                    Call
                                                </a>
                                                <a
                                                    href={`https://wa.me/${activeFlat.phone.replace(/[^0-9]/g, "")}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                                                >
                                                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                                                    WhatsApp
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="py-2 text-center">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            No occupant household registered for Flat {activeFlat.flatNumber}
                                        </p>
                                        <button
                                            onClick={() => {
                                                navigate("/households");
                                                setActiveFlat(null);
                                            }}
                                            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400"
                                        >
                                            <HomeIcon className="h-3.5 w-3.5" />
                                            Register Household
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Donation Summary for Selected Year */}
                            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                        Donation Status ({selectedYear})
                                    </span>
                                    {activeFlat.isPaid ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                            Paid ₹{activeFlat.totalPaid.toLocaleString("en-IN")}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                                            <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                                            No Donation Paid
                                        </span>
                                    )}
                                </div>

                                {activeFlat.donations && activeFlat.donations.length > 0 ? (
                                    <div className="space-y-2 mt-2">
                                        {activeFlat.donations.map((don) => (
                                            <div
                                                key={don._id}
                                                className="flex items-center justify-between rounded-lg border border-gray-200/60 bg-white p-2.5 text-xs dark:border-gray-700/60 dark:bg-gray-900"
                                            >
                                                <div>
                                                    <div className="font-bold text-gray-800 dark:text-gray-200">
                                                        Receipt: {don.receiptNumber}
                                                    </div>
                                                    <div className="text-[11px] text-gray-400">
                                                        {new Date(don.date).toLocaleDateString("en-IN", {
                                                            day: "numeric",
                                                            month: "short",
                                                            year: "numeric"
                                                        })}{" "}
                                                        · {don.paymentMethod.toUpperCase()}
                                                    </div>
                                                </div>
                                                <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                                    + ₹{don.amount.toLocaleString("en-IN")}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 mt-1">
                                        No donation entries logged for Flat {activeFlat.flatNumber} in festival year {selectedYear}.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="mt-2 pt-4 border-t border-gray-100 flex items-center gap-3 dark:border-gray-800">
                            <button
                                onClick={() => setActiveFlat(null)}
                                className="flex-1 rounded-xl border border-gray-200 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    navigate("/donations");
                                    setActiveFlat(null);
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700"
                            >
                                <Coins className="h-4 w-4" />
                                Record Donation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default BuildingFlats;
