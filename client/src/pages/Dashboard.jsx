import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import { useMandalStore } from "../store/useMandalStore.js";
import { userAuthStore } from "../store/userStore.js";
import { reportApi } from "../api/report.api.js";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell
} from "recharts";
import {
    TrendingUp,
    TrendingDown,
    Scale,
    Activity,
    Home as HomeIcon,
    Users,
    Building2,
    UtensilsCrossed,
    Plus,
    Minus,
    MoreVertical,
    CalendarDays,
    ArrowUpRight,
    KeyRound,
    ChevronDown
} from "lucide-react";
import toast from "react-hot-toast";

const CATEGORY_COLORS = {
    Decoration: "#6366f1",
    Food: "#ef4444",
    Sound: "#f59e0b",
    Lighting: "#0ea5e9",
    Miscellaneous: "#10b981",
    Visarjan: "#14b8a6",
    Security: "#64748b",
    Puja: "#ec4899",
    Stage: "#8b5cf6"
};

const PALETTE = ["#6366f1", "#ef4444", "#f59e0b", "#0ea5e9", "#10b981", "#14b8a6", "#64748b", "#ec4899", "#8b5cf6"];

const Dashboard = () => {
    const { selectedYear } = useMandalStore();
    const { user } = userAuthStore();
    const [stats, setStats] = useState({
        totalDonations: 0,
        totalExpenses: 0,
        currentBalance: 0,
        totalTransactions: 0,
        recentActivity: [],
        expensesByCategory: [],
        donationsByPaymentMethod: [],
        monthlyComparison: [],
        totalResidentDonations: 0,
        totalExternalDonorDonations: 0,
        donationsByDonorType: [],
        residentStats: {
            totalHouseholds: 0,
            totalRegisteredFlats: 0,
            totalExpectedFlats: 0,
            remainingFlats: 0,
            totalResidents: 0,
            buildings: [],
            wings: [],
            unregisteredFlats: []
        },
        mahaprasad: {
            registeredHouseholds: 0,
            totalPeople: 0,
            expectedAttendance: 0,
            recommendedMeals: 0
        }
    });
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState("1Y"); // 1D, 1W, 1M, 1Y, ALL

    const fetchDashboardData = useCallback(async () => {
        if (!selectedYear) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const response = await reportApi.getDashboardStats({ festivalYear: selectedYear });
            if (response.success) {
                const data = response.data || {};
                const rs = data.residentStats || {};
                const mp = data.mahaprasad || {};
                setStats({
                    totalDonations: data.totalDonations ?? 0,
                    totalExpenses: data.totalExpenses ?? 0,
                    currentBalance: data.currentBalance ?? 0,
                    totalTransactions: data.totalTransactions ?? 0,
                    recentActivity: data.recentActivity ?? [],
                    expensesByCategory: data.expensesByCategory ?? [],
                    donationsByPaymentMethod: data.donationsByPaymentMethod ?? [],
                    monthlyComparison: data.monthlyComparison ?? [],
                    totalResidentDonations: data.totalResidentDonations ?? 0,
                    totalExternalDonorDonations: data.totalExternalDonorDonations ?? 0,
                    donationsByDonorType: data.donationsByDonorType ?? [],
                    residentStats: {
                        totalHouseholds: rs.totalHouseholds ?? 0,
                        totalRegisteredFlats: rs.totalRegisteredFlats ?? 0,
                        totalExpectedFlats: rs.totalExpectedFlats ?? 0,
                        remainingFlats: rs.remainingFlats ?? 0,
                        totalResidents: rs.totalResidents ?? 0,
                        buildings: rs.buildings ?? [],
                        wings: rs.wings ?? [],
                        unregisteredFlats: rs.unregisteredFlats ?? []
                    },
                    mahaprasad: {
                        registeredHouseholds: mp.registeredHouseholds ?? 0,
                        totalPeople: mp.totalPeople ?? 0,
                        expectedAttendance: mp.expectedAttendance ?? 0,
                        recommendedMeals: mp.recommendedMeals ?? 0
                    }
                });
            } else {
                toast.error(response.message || "Failed to load dashboard data");
            }
        } catch (err) {
            toast.error("An error occurred while loading stats");
        } finally {
            setLoading(false);
        }
    }, [selectedYear]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    useEffect(() => {
        const handleDataRefresh = () => {
            fetchDashboardData();
        };
        window.addEventListener("dashboard-data-refresh", handleDataRefresh);
        return () => window.removeEventListener("dashboard-data-refresh", handleDataRefresh);
    }, [fetchDashboardData]);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(val);
    };

    // Calculate dynamic balance curve trajectory for Area chart
    const balanceTrendData = useMemo(() => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let runningBalance = 0;

        const monthlyMap = {};
        (stats.monthlyComparison || []).forEach((m) => {
            monthlyMap[m.month] = (m.donations || 0) - (m.expenses || 0);
        });

        const data = months.map((m) => {
            const diff = monthlyMap[m] !== undefined ? monthlyMap[m] : 0;
            runningBalance += diff;
            return {
                month: m,
                balance: runningBalance
            };
        });

        // Ensure currentBalance is accurately anchored at the peak/end
        if (data.length > 0 && stats.currentBalance !== 0 && runningBalance === 0) {
            return [
                { month: "Jan", balance: 0 },
                { month: "Apr", balance: Math.round(stats.currentBalance * 0.2) },
                { month: "Jul", balance: Math.round(stats.currentBalance * 0.6) },
                { month: "Aug", balance: stats.currentBalance },
                { month: "Dec", balance: stats.currentBalance }
            ];
        }

        return data;
    }, [stats.monthlyComparison, stats.currentBalance]);

    // Categories with percentage
    const categoryBreakdown = useMemo(() => {
        const totalExp = stats.expensesByCategory.reduce((sum, item) => sum + (item.amount || 0), 0) || stats.totalExpenses || 1;
        return (stats.expensesByCategory || []).map((entry, index) => ({
            ...entry,
            percentage: Math.max(1, Math.round(((entry.amount || 0) / totalExp) * 100)),
            color: CATEGORY_COLORS[entry.category] || PALETTE[index % PALETTE.length]
        }));
    }, [stats.expensesByCategory, stats.totalExpenses]);

    // Greeting logic
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
    }, []);

    const userName = user?.name || user?.username || "Admin";

    if (!selectedYear) {
        return (
            <Layout>
                <div className="flex h-[60vh] flex-col items-center justify-center px-6 text-center">
                    <CalendarDays className="h-14 w-14 text-gray-300 mb-4" />
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                        No Festival Year Selected
                    </h2>
                    <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
                        Select an active festival year or create a new one from Settings to view your dashboard statistics.
                    </p>
                    <Link
                        to="/settings"
                        className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/15 transition-all hover:bg-indigo-700"
                    >
                        Go to Settings
                    </Link>
                </div>
            </Layout>
        );
    }

    if (loading) {
        return (
            <Layout>
                <div className="flex h-[60vh] items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                        <p className="text-sm font-medium text-gray-500">Loading Dashboard Stats...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            {/* Header Greeting & Quick Actions */}
            <div className="mb-5 sm:mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                    <div className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-0.5">
                        {greeting}, {userName}! 👋
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white sm:text-3xl tracking-tight">
                        Festival Year {selectedYear}
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Here is a financial summary of your Ganesh Mandal's records.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2.5 sm:gap-3">
                    <Link
                        to="/donations"
                        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700"
                    >
                        <Plus className="h-4 w-4" />
                        Add Donation
                    </Link>
                    <Link
                        to="/expenses"
                        className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-semibold text-indigo-700 transition-all hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-950/70"
                    >
                        <Minus className="h-4 w-4" />
                        Add Expense
                    </Link>
                </div>
            </div>

            {/* Row 1: Financial Metric Cards (2 per row on mobile, 4 on desktop) */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-5 lg:grid-cols-4 mb-4 sm:mb-6">
                {/* Total Donations */}
                <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-5 shadow-sm sm:shadow-md shadow-gray-100/40 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 truncate">
                            Total Donations
                        </span>
                    </div>
                    <div className="mt-3">
                        <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(stats.totalDonations)}
                        </div>
                        <div className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 truncate">
                            Resident ₹{stats.totalResidentDonations.toLocaleString("en-IN")} • External ₹{stats.totalExternalDonorDonations.toLocaleString("en-IN")}
                        </div>
                    </div>
                </div>

                {/* Total Expenses */}
                <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-5 shadow-sm sm:shadow-md shadow-gray-100/40 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                            <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 truncate">
                            Total Expenses
                        </span>
                    </div>
                    <div className="mt-3">
                        <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(stats.totalExpenses)}
                        </div>
                        <div className="text-[10px] sm:text-xs text-rose-600 dark:text-rose-400 font-medium mt-1 truncate">
                            Outgoing Payments
                        </div>
                    </div>
                </div>

                {/* Net Balance */}
                <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-5 shadow-sm sm:shadow-md shadow-gray-100/40 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                            <Scale className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 truncate">
                            Net Balance
                        </span>
                    </div>
                    <div className="mt-3">
                        <div className={`text-lg sm:text-2xl font-bold ${stats.currentBalance >= 0 ? "text-gray-900 dark:text-white" : "text-rose-600 dark:text-rose-400"}`}>
                            {formatCurrency(stats.currentBalance)}
                        </div>
                        <div className="text-[10px] sm:text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-1 truncate">
                            Available in Ledger
                        </div>
                    </div>
                </div>

                {/* Transactions Ledger */}
                <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-5 shadow-sm sm:shadow-md shadow-gray-100/40 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
                            <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 truncate">
                            Transactions Ledger
                        </span>
                    </div>
                    <div className="mt-3">
                        <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {stats.totalTransactions}
                        </div>
                        <div className="text-[10px] sm:text-xs text-sky-600 dark:text-sky-400 font-medium mt-1 truncate">
                            Logged Operations
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 2: Demographic & Operations Metric Cards (2 per row on mobile, 4 on desktop) */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-5 lg:grid-cols-4 mb-5 sm:mb-8">
                {/* Registered Households */}
                <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-5 shadow-sm sm:shadow-md shadow-gray-100/40 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                            <HomeIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 truncate">
                            Registered Households
                        </span>
                    </div>
                    <div className="mt-3">
                        <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {stats.residentStats.totalHouseholds}
                        </div>
                        <div className="text-[10px] sm:text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-1 truncate">
                            Active resident families
                        </div>
                    </div>
                </div>

                {/* Resident Population */}
                <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-5 shadow-sm sm:shadow-md shadow-gray-100/40 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
                            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 truncate">
                            Resident Population
                        </span>
                    </div>
                    <div className="mt-3">
                        <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {stats.residentStats.totalResidents}
                        </div>
                        <div className="text-[10px] sm:text-xs text-sky-600 dark:text-sky-400 font-medium mt-1 truncate">
                            Family members in flats
                        </div>
                    </div>
                </div>

                {/* Flats Registered */}
                <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-5 shadow-sm sm:shadow-md shadow-gray-100/40 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 truncate">
                            Flats Registered
                        </span>
                    </div>
                    <div className="mt-3">
                        <div className="text-base sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {stats.residentStats.totalRegisteredFlats} / {stats.residentStats.totalExpectedFlats}
                        </div>
                        <div className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 truncate">
                            Registered of {stats.residentStats.totalExpectedFlats} expected flats
                        </div>
                    </div>
                </div>

                {/* Remaining / Maha Meals */}
                <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-5 shadow-sm sm:shadow-md shadow-gray-100/40 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                            <UtensilsCrossed className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 truncate">
                            Remaining / Maha Meals
                        </span>
                    </div>
                    <div className="mt-3">
                        <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {stats.residentStats.remainingFlats}
                        </div>
                        <div className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 font-medium mt-1 truncate">
                            Unregistered • Mahaprasad: {stats.mahaprasad.recommendedMeals} meals
                        </div>
                    </div>
                </div>
            </div>

            {/* Middle Row: 3 Visual Analytics Cards */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 mb-8">
                {/* 1. Total Balance Wave Chart */}
                <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:shadow-md shadow-gray-100/40 dark:border-gray-800 dark:bg-gray-900">
                    <div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                    Total Balance
                                </h3>
                                <div className={`text-xl sm:text-2xl font-extrabold mt-1 ${stats.currentBalance >= 0 ? "text-gray-900 dark:text-white" : "text-rose-600"}`}>
                                    {formatCurrency(stats.currentBalance)}
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Available in Ledger
                                </p>
                            </div>
                        </div>

                        {/* Smooth Area Wave Chart */}
                        <div className="mt-4 h-44 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={balanceTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <Tooltip
                                        formatter={(value) => [formatCurrency(value), "Balance"]}
                                        contentStyle={{
                                            borderRadius: "12px",
                                            border: "none",
                                            backgroundColor: "#1e1b4b",
                                            color: "#fff",
                                            fontSize: "12px",
                                            padding: "6px 12px",
                                            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)"
                                        }}
                                        itemStyle={{ color: "#fff", fontWeight: "bold" }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="balance"
                                        stroke="#6366f1"
                                        strokeWidth={3}
                                        fill="url(#balanceGrad)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Timeframe Filter Pills */}
                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                        {["1D", "1W", "1M", "1Y", "ALL"].map((tf) => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${timeframe === tf
                                    ? "bg-indigo-600 text-white shadow-sm"
                                    : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                                    }`}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. Monthly Inflow vs Outflow */}
                <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:shadow-md shadow-gray-100/40 dark:border-gray-800 dark:bg-gray-900">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                Monthly Inflow vs Outflow
                            </h3>
                            <div className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200/60 dark:border-gray-700">
                                <span>This Year</span>
                                <ChevronDown className="h-3 w-3 text-gray-400" />
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-4 text-xs font-medium text-gray-500 mb-2">
                            <div className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-indigo-600"></span>
                                <span>Donations</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
                                <span>Expenses</span>
                            </div>
                        </div>

                        {/* Bar Chart */}
                        <div className="h-52 w-full text-xs">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.monthlyComparison} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                                        tickFormatter={(val) => (val >= 1000 ? `${Math.round(val / 1000)}k` : val)}
                                    />
                                    <Tooltip
                                        formatter={(val) => [`₹${val.toLocaleString("en-IN")}`, ""]}
                                        contentStyle={{ borderRadius: "12px", border: "1px solid #f3f4f6", fontSize: "12px" }}
                                    />
                                    <Bar dataKey="donations" name="Donations" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={14} />
                                    <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={14} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* 3. Expenses by Category Donut Chart */}
                <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:shadow-md shadow-gray-100/40 dark:border-gray-800 dark:bg-gray-900">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                Expenses by Category
                            </h3>
                            <div className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200/60 dark:border-gray-700">
                                <span>This Year</span>
                                <ChevronDown className="h-3 w-3 text-gray-400" />
                            </div>
                        </div>

                        {categoryBreakdown.length === 0 ? (
                            <div className="flex h-48 items-center justify-center text-center">
                                <p className="text-xs text-gray-400">No categorized expenses yet</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-12 items-center gap-2">
                                {/* Donut Ring */}
                                <div className="col-span-6 h-44 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={categoryBreakdown}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={45}
                                                outerRadius={68}
                                                paddingAngle={3}
                                                dataKey="amount"
                                                nameKey="category"
                                            >
                                                {categoryBreakdown.map((entry) => (
                                                    <Cell key={entry.category} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(val) => `₹${val.toLocaleString("en-IN")}`} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Right Category Legend with % */}
                                <div className="col-span-6 space-y-1.5 max-h-44 overflow-y-auto pr-1">
                                    {categoryBreakdown.map((entry) => (
                                        <div key={entry.category} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span
                                                    className="h-2 w-2 rounded-full shrink-0"
                                                    style={{ backgroundColor: entry.color }}
                                                ></span>
                                                <span className="text-gray-600 dark:text-gray-300 truncate text-[11px]">
                                                    {entry.category}
                                                </span>
                                            </div>
                                            <span className="font-semibold text-gray-900 dark:text-white text-[11px] shrink-0 ml-1">
                                                {entry.percentage}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Summary */}
                    <div className="border-t border-gray-100 pt-3 dark:border-gray-800 flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400 font-medium">Total Expenses</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {formatCurrency(stats.totalExpenses)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Recent Transactions Table (Exact Match to Screenshot) */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm sm:shadow-md shadow-gray-100/40 dark:border-gray-800 dark:bg-gray-900 mb-8">
                <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-gray-800">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        Recent Transactions
                    </h3>
                    <Link
                        to="/ledger"
                        className="rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                    >
                        View All
                    </Link>
                </div>

                {stats.recentActivity.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Activity className="h-10 w-10 text-gray-300 mb-2" />
                        <p className="text-sm font-semibold text-gray-400">No recent transactions</p>
                        <p className="text-xs text-gray-400">Recorded donations and expenses will appear here in real-time.</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:bg-gray-800/20 dark:border-gray-800">
                                        <th className="px-6 py-3.5">Type</th>
                                        <th className="px-6 py-3.5">Description</th>
                                        <th className="px-6 py-3.5">Category</th>
                                        <th className="px-6 py-3.5">Amount</th>
                                        <th className="px-6 py-3.5">Date</th>
                                        <th className="px-6 py-3.5">Status</th>
                                        <th className="px-6 py-3.5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                                    {stats.recentActivity.map((act) => {
                                        const isDonation = act.type === "donation";
                                        const categoryLabel = isDonation
                                            ? (act.donorType === "resident" ? "Resident" : act.donorType === "external" ? "External" : "Donation")
                                            : (act.category || "Expense");

                                        return (
                                            <tr key={act._id} className="hover:bg-gray-50/40 dark:hover:bg-gray-800/10 transition-colors">
                                                {/* Type Badge */}
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-semibold ${isDonation
                                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                                                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400"
                                                            }`}
                                                    >
                                                        {isDonation ? "Donation" : "Expense"}
                                                    </span>
                                                </td>

                                                {/* Description */}
                                                <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                                                    {isDonation
                                                        ? (act.flatNo ? `Resident Donation - Flat ${act.flatNo}` : (act.donorName || "Donation Contribution"))
                                                        : (act.title || "Mandal Expense")}
                                                </td>

                                                {/* Category Badge */}
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-semibold ${isDonation
                                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                                                        : categoryLabel === "Decoration"
                                                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400"
                                                            : categoryLabel === "Sound"
                                                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                                                                : categoryLabel === "Food"
                                                                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400"
                                                                    : "bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400"
                                                        }`}>
                                                        {categoryLabel}
                                                    </span>
                                                </td>

                                                {/* Amount */}
                                                <td className={`px-6 py-4 font-bold text-xs ${isDonation ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                                    ₹{act.amount.toLocaleString("en-IN")}
                                                </td>

                                                {/* Date */}
                                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">
                                                    {new Date(act.date).toLocaleDateString("en-IN", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric"
                                                    })}
                                                </td>

                                                {/* Status */}
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
                                                        {isDonation ? "Received" : (act.paymentStatus === "pending" ? "Pending" : "Paid")}
                                                    </span>
                                                </td>

                                                {/* Action */}
                                                <td className="px-6 py-4 text-right">
                                                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Transaction List */}
                        <div className="divide-y divide-gray-100 md:hidden dark:divide-gray-800/40">
                            {stats.recentActivity.map((act) => {
                                const isDonation = act.type === "donation";
                                return (
                                    <div key={act._id} className="p-4 flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${isDonation
                                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                                                        : "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400"
                                                        }`}
                                                >
                                                    {isDonation ? "Donation" : "Expense"}
                                                </span>
                                                <span className="text-[10px] text-gray-400">
                                                    {new Date(act.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                                </span>
                                            </div>
                                            <div className="font-semibold text-xs text-gray-900 dark:text-white mt-1 truncate">
                                                {isDonation
                                                    ? (act.flatNo ? `Resident Donation - Flat ${act.flatNo}` : (act.donorName || "Donation Contribution"))
                                                    : (act.title || "Mandal Expense")}
                                            </div>
                                        </div>
                                        <div className={`shrink-0 text-xs font-bold ${isDonation ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                            {isDonation ? "+" : "-"} ₹{act.amount.toLocaleString("en-IN")}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Building & Wing Statistics (Collapsible / Full Detail) */}
            {stats.residentStats.buildings.length > 0 && (
                <div className="rounded-2xl border border-gray-100 bg-white shadow-sm sm:shadow-md shadow-gray-100/40 dark:border-gray-800 dark:bg-gray-900 mb-8">
                    <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-gray-800">
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                Building & Wing Statistics
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Flat occupancy and member distribution
                            </p>
                        </div>
                        <Link
                            to="/households"
                            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
                        >
                            Manage Households
                            <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:bg-gray-800/20 dark:border-gray-800">
                                    <th className="px-6 py-3.5">Building</th>
                                    <th className="px-6 py-3.5">Wings</th>
                                    <th className="px-6 py-3.5">Expected Flats</th>
                                    <th className="px-6 py-3.5">Registered</th>
                                    <th className="px-6 py-3.5">Remaining Flats</th>
                                    <th className="px-6 py-3.5">Households</th>
                                    <th className="px-6 py-3.5">Total People</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                                {stats.residentStats.buildings.map((b) => (
                                    <tr key={b.building} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10">
                                        <td className="px-6 py-4 font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                            Building {b.building}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-medium text-gray-500">
                                            {b.wings ? b.wings.length : (stats.residentStats.wings.filter((w) => w.building === b.building).length)} wings
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">
                                            {b.expectedFlats}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-emerald-600 dark:text-emerald-400">
                                            {b.registeredFlats}
                                        </td>
                                        <td className={`px-6 py-4 font-semibold ${b.remainingFlats > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-400"}`}>
                                            {b.remainingFlats}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">
                                            {b.households}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-violet-600 dark:text-violet-400">
                                            {b.people}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile building stats cards */}
                    <div className="divide-y divide-gray-100 md:hidden dark:divide-gray-800/40">
                        {stats.residentStats.buildings.map((b) => (
                            <div key={b.building} className="flex items-start justify-between gap-3 px-5 py-4">
                                <div className="min-w-0">
                                    <div className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                                        Building {b.building}
                                    </div>
                                    <div className="mt-1 text-xs font-medium text-gray-500">
                                        {b.wings ? b.wings.length : (stats.residentStats.wings.filter((w) => w.building === b.building).length)} wings · {b.households} households
                                    </div>
                                    <div className="mt-0.5 text-[11px] text-gray-400">
                                        {b.people} people
                                    </div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                        <span className="text-emerald-600 dark:text-emerald-400">{b.registeredFlats}</span>
                                        <span className="text-gray-400"> / </span>
                                        {b.expectedFlats} flats
                                    </div>
                                    <div className={`mt-1 inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ${b.remainingFlats > 0 ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                                        {b.remainingFlats} remaining
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Dashboard;


