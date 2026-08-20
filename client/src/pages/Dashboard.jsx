import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import { useMandalStore } from "../store/useMandalStore.js";
import { reportApi } from "../api/report.api.js";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell
} from "recharts";
import {
    TrendingUp,
    TrendingDown,
    Scale,
    ArrowUpRight,
    Activity,
    PlusCircle,
    CalendarDays,
    Home as HomeIcon,
    Users,
    Building2,
    UtensilsCrossed,
    KeyRound
} from "lucide-react";
import toast from "react-hot-toast";

const COLORS = ["#6366f1", "#ec4899", "#eab308", "#f97316", "#3b82f6", "#ef4444", "#6b7280"];

const Dashboard = () => {
    const { selectedYear } = useMandalStore();
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

    // Bulk import dispatches this event after a successful import so the dashboard
    // statistics (donations, expenses, balance, flats, residents, Mahaprasad) refresh instantly.
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

    // Donor type pie data
    const donorTypePieData = stats.donationsByDonorType?.map((entry) => ({
        ...entry,
        label: entry.donorType === "resident" ? "Resident" : entry.donorType === "external" ? "External Donor" : "Regular"
    }));

    // Wing-wise flats chart data
    const wingFlatsData = (stats.residentStats?.wings || []).map((w) => ({
        name: `B${w?.building}·${w?.wing}`,
        expected: w?.expectedFlats,
        registered: w?.registeredFlats
    }));

    if (!selectedYear) {
        return (
            <Layout>
                <div className="flex h-[60vh] flex-col items-center justify-center px-6 text-center">
                    <CalendarDays className="h-14 w-14 text-gray-300 mb-4" />
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                        No Festival Year Selected
                    </h2>
                    <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
                        Select an active festival year or create a new one from Settings to view your dashboard statistics, resident population and Mahaprasad planning.
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
            {/* Upper Header Welcome */}
            <div className="mb-5 sm:mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                        Festival Year {selectedYear}
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
                        Here is a financial summary of your Ganesh Mandal's records
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                    <Link
                        to="/donations"
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 sm:px-4 sm:py-2.5 text-xs font-semibold text-white shadow-md shadow-emerald-600/15 transition-all hover:bg-emerald-700"
                    >
                        <PlusCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Add Donation
                    </Link>
                    <Link
                        to="/expenses"
                        className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 sm:px-4 sm:py-2.5 text-xs font-semibold text-white shadow-md shadow-rose-600/15 transition-all hover:bg-rose-700"
                    >
                        <PlusCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Add Expense
                    </Link>
                </div>
            </div>

            {/* Financial Metric Cards (2 per row on mobile) */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-6 lg:grid-cols-4 mb-5 sm:mb-8">
                {/* Donations Card */}
                <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-6 shadow-sm sm:shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-semibold text-gray-400 dark:text-gray-500 truncate">Donations</span>
                        <div className="flex h-7 w-7 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                    </div>
                    <div className="mt-2.5 sm:mt-4">
                        <span className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(stats.totalDonations)}
                        </span>
                        <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 sm:mt-1 truncate">
                            Res ₹{stats.totalResidentDonations.toLocaleString("en-IN")} · Ext ₹{stats.totalExternalDonorDonations.toLocaleString("en-IN")}
                        </p>
                    </div>
                </div>

                {/* Expenses Card */}
                <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-6 shadow-sm sm:shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-semibold text-gray-400 dark:text-gray-500 truncate">Expenses</span>
                        <div className="flex h-7 w-7 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
                            <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                    </div>
                    <div className="mt-2.5 sm:mt-4">
                        <span className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(stats.totalExpenses)}
                        </span>
                        <p className="text-[10px] sm:text-xs text-rose-600 dark:text-rose-400 font-medium mt-0.5 sm:mt-1 truncate">
                            Outgoing Payments
                        </p>
                    </div>
                </div>

                {/* Balance Card */}
                <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-6 shadow-sm sm:shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-semibold text-gray-400 dark:text-gray-500 truncate">Net Balance</span>
                        <div className="flex h-7 w-7 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                            <Scale className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                    </div>
                    <div className="mt-2.5 sm:mt-4">
                        <span className={`text-lg sm:text-2xl font-bold ${stats.currentBalance >= 0 ? "text-gray-900 dark:text-white" : "text-rose-600"}`}>
                            {formatCurrency(stats.currentBalance)}
                        </span>
                        <p className="text-[10px] sm:text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5 sm:mt-1 truncate">
                            Available in Ledger
                        </p>
                    </div>
                </div>

                {/* Total Transactions Card */}
                <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-6 shadow-sm sm:shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-semibold text-gray-400 dark:text-gray-500 truncate">Transactions</span>
                        <div className="flex h-7 w-7 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400">
                            <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                    </div>
                    <div className="mt-2.5 sm:mt-4">
                        <span className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {stats.totalTransactions}
                        </span>
                        <p className="text-[10px] sm:text-xs text-sky-600 dark:text-sky-400 font-medium mt-0.5 sm:mt-1 truncate">
                            Logged Operations
                        </p>
                    </div>
                </div>
            </div>

            {/* Resident & Household Metric Cards (2 per row on mobile) */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-6 lg:grid-cols-4 mb-5 sm:mb-8">
                {/* Registered Households */}
                <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-6 shadow-sm sm:shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-semibold text-gray-400 dark:text-gray-500 truncate">Households</span>
                        <div className="flex h-7 w-7 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                            <HomeIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                    </div>
                    <div className="mt-2.5 sm:mt-4">
                        <span className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {stats.residentStats.totalHouseholds}
                        </span>
                        <p className="text-[10px] sm:text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5 sm:mt-1 truncate">
                            Active families
                        </p>
                    </div>
                </div>

                {/* Resident Population */}
                <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-6 shadow-sm sm:shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-semibold text-gray-400 dark:text-gray-500 truncate">Population</span>
                        <div className="flex h-7 w-7 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400">
                            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                    </div>
                    <div className="mt-2.5 sm:mt-4">
                        <span className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {stats.residentStats.totalResidents}
                        </span>
                        <p className="text-[10px] sm:text-xs text-violet-600 dark:text-violet-400 font-medium mt-0.5 sm:mt-1 truncate">
                            Family members
                        </p>
                    </div>
                </div>

                {/* Registered Flats */}
                <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-6 shadow-sm sm:shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-semibold text-gray-400 dark:text-gray-500 truncate">Flats Reg.</span>
                        <div className="flex h-7 w-7 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                            <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                    </div>
                    <div className="mt-2.5 sm:mt-4">
                        <span className="text-base sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {stats.residentStats.totalRegisteredFlats} / {stats.residentStats.totalExpectedFlats}
                        </span>
                        <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 sm:mt-1 truncate">
                            Of {stats.residentStats.totalExpectedFlats} flats
                        </p>
                    </div>
                </div>

                {/* Unregistered + Mahaprasad Meals */}
                <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-6 shadow-sm sm:shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-semibold text-gray-400 dark:text-gray-500 truncate">Remaining</span>
                        <div className="flex h-7 w-7 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                            <KeyRound className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                    </div>
                    <div className="mt-2.5 sm:mt-4">
                        <span className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {stats.residentStats.remainingFlats}
                        </span>
                        <p className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5 sm:mt-1 truncate">
                            Meals: {stats.mahaprasad.recommendedMeals}
                        </p>
                    </div>
                </div>
            </div>

            {/* Graphs / Analytics Layout */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
                {/* Monthly Bar Chart */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
                    <h3 className="text-md font-bold text-gray-800 dark:text-white mb-6">
                        Monthly Inflow vs Outflow
                    </h3>
                    <div className="h-80 w-full text-xs">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.monthlyComparison}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                <XAxis dataKey="month" tickLine={false} />
                                <YAxis tickLine={false} />
                                <Tooltip
                                    formatter={(value) => [`₹${value}`, ""]}
                                    contentStyle={{ borderRadius: "12px", border: "1px solid #f3f4f6" }}
                                />
                                <Legend verticalAlign="top" height={36} />
                                <Bar dataKey="donations" name="Donations" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart Expense Category */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900">
                    <h3 className="text-md font-bold text-gray-800 dark:text-white mb-6">
                        Expenses by Category
                    </h3>
                    <div className="relative flex h-80 flex-col items-center justify-center">
                        {stats.expensesByCategory.length === 0 ? (
                            <p className="text-sm text-gray-400">No expenses recorded for {selectedYear}</p>
                        ) : (
                            <>
                                <div className="h-60 w-full text-xs">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={stats.expensesByCategory}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={4}
                                                dataKey="amount"
                                                nameKey="category"
                                            >
                                                {stats.expensesByCategory.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => `₹${value}`} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                {/* Custom Legend */}
                                <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] font-medium text-gray-500">
                                    {stats.expensesByCategory.map((entry, index) => (
                                        <div key={entry.category} className="flex items-center gap-1.5">
                                            <span
                                                className="h-2.5 w-2.5 rounded-full"
                                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                            ></span>
                                            <span>{entry.category}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Resident vs External Donation & Wing Flats Charts */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
                {/* Donation Collection by Donor Type */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900">
                    <h3 className="text-md font-bold text-gray-800 dark:text-white mb-6">
                        Resident vs External Collections
                    </h3>
                    <div className="relative flex h-80 flex-col items-center justify-center">
                        {donorTypePieData.length === 0 ? (
                            <p className="text-sm text-gray-400">No donations recorded for {selectedYear}</p>
                        ) : (
                            <>
                                <div className="h-60 w-full text-xs">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={donorTypePieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={4}
                                                dataKey="amount"
                                                nameKey="label"
                                            >
                                                {donorTypePieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.donorType === "resident" ? "#6366f1" : entry.donorType === "external" ? "#eab308" : "#6b7280"} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => `₹${value}`} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] font-medium text-gray-500">
                                    {donorTypePieData.map((entry) => (
                                        <div key={entry.donorType} className="flex items-center gap-1.5">
                                            <span
                                                className="h-2.5 w-2.5 rounded-full"
                                                style={{ backgroundColor: entry.donorType === "resident" ? "#6366f1" : entry.donorType === "external" ? "#eab308" : "#6b7280" }}
                                            ></span>
                                            <span>{entry.label} · {formatCurrency(entry.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Registered vs Expected Flats by Wing */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
                    <h3 className="text-md font-bold text-gray-800 dark:text-white mb-6">
                        Registered vs Expected Flats
                    </h3>
                    <div className="h-80 w-full text-xs">
                        {wingFlatsData.length === 0 ? (
                            <div className="flex h-full items-center justify-center">
                                <p className="text-sm text-gray-400">Configure buildings & wings to see flat registration status</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={wingFlatsData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                    <XAxis dataKey="name" tickLine={false} />
                                    <YAxis tickLine={false} allowDecimals={false} />
                                    <Tooltip
                                        formatter={(value, name) => [`${value} flats`, name]}
                                        contentStyle={{ borderRadius: "12px", border: "1px solid #f3f4f6" }}
                                    />
                                    <Legend verticalAlign="top" height={36} />
                                    <Bar dataKey="expected" name="Expected Flats" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="registered" name="Registered Households" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Building & Wing Statistics Table */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900 mb-8">
                <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-gray-800">
                    <h3 className="text-md font-bold text-gray-800 dark:text-white">Building & Wing Statistics</h3>
                    <Link
                        to="/households"
                        className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
                    >
                        Manage Households
                        <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                </div>

                {stats.residentStats.buildings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Building2 className="h-10 w-10 text-gray-300 mb-2" />
                        <p className="text-sm font-semibold text-gray-400">No building configurations yet</p>
                        <p className="text-xs text-gray-400">Configure buildings & wings to track registered vs remaining flats.</p>
                    </div>
                ) : (
                    <>
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:bg-gray-800/20 dark:border-gray-800">
                                        <th className="px-6 py-4">Building</th>
                                        <th className="px-6 py-4">Wings</th>
                                        <th className="px-6 py-4">Expected Flats</th>
                                        <th className="px-6 py-4">Registered</th>
                                        <th className="px-6 py-4">Remaining Flats</th>
                                        <th className="px-6 py-4">Households</th>
                                        <th className="px-6 py-4">Total People</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                                    {stats.residentStats.buildings.map((b) => (
                                        <tr key={b.building} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10">
                                            <td className="px-6 py-4.5 font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                                Building {b.building}
                                            </td>
                                            <td className="px-6 py-4.5 text-xs font-medium text-gray-500">
                                                {b.wings ? b.wings.length : (stats.residentStats.wings.filter((w) => w.building === b.building).length)} wings
                                            </td>
                                            <td className="px-6 py-4.5 font-semibold text-gray-700 dark:text-gray-300">
                                                {b.expectedFlats}
                                            </td>
                                            <td className="px-6 py-4.5 font-semibold text-emerald-600 dark:text-emerald-400">
                                                {b.registeredFlats}
                                            </td>
                                            <td className={`px-6 py-4.5 font-semibold ${b.remainingFlats > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-400"}`}>
                                                {b.remainingFlats}
                                            </td>
                                            <td className="px-6 py-4.5 font-semibold text-gray-700 dark:text-gray-300">
                                                {b.households}
                                            </td>
                                            <td className="px-6 py-4.5 font-semibold text-violet-600 dark:text-violet-400">
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
                    </>
                )}

                {/* Unregistered flats list */}
                {stats.residentStats.unregisteredFlats.length > 0 && (
                    <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-800">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                            Flats Not Yet Registered
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {stats.residentStats.unregisteredFlats.map((u) => (
                                <span
                                    key={`${u.building}-${u.wing}`}
                                    className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400"
                                >
                                    B{u.building} · Wing {u.wing}: Flats {u.flats.join(", ")}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Wing-wise Statistics Table */}
                {stats.residentStats.wings.length > 0 && (
                    <div className="border-t border-gray-100 dark:border-gray-800">
                        <div className="px-6 py-4">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                                Wing-wise Statistics
                            </p>
                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:bg-gray-800/20 dark:border-gray-800">
                                            <th className="px-4 py-3">Building & Wing</th>
                                            <th className="px-4 py-3">Expected Flats</th>
                                            <th className="px-4 py-3">Registered</th>
                                            <th className="px-4 py-3">Remaining</th>
                                            <th className="px-4 py-3">Households</th>
                                            <th className="px-4 py-3">Total People</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                                        {stats.residentStats.wings.map((w) => (
                                            <tr key={`${w.building}-${w.wing}`} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10">
                                                <td className="px-4 py-3 font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                                    Building {w.building} · Wing {w.wing}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                                                    {w.expectedFlats}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                                                    {w.registeredFlats}
                                                </td>
                                                <td className={`px-4 py-3 font-semibold ${w.remainingFlats > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-400"}`}>
                                                    {w.remainingFlats}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                                                    {w.registeredFlats}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-violet-600 dark:text-violet-400">
                                                    {w.people}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile wing stats cards */}
                            <div className="divide-y divide-gray-100 md:hidden dark:divide-gray-800/40">
                                {stats.residentStats.wings.map((w) => (
                                    <div key={`${w.building}-${w.wing}`} className="flex items-center justify-between gap-3 py-3">
                                        <div className="min-w-0">
                                            <div className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                                Building {w.building} · Wing {w.wing}
                                            </div>
                                            <div className="mt-0.5 text-[11px] text-gray-400">
                                                {w.people} people · {w.registeredFlats} households
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">
                                            <span className="text-emerald-600 dark:text-emerald-400">{w.registeredFlats}</span>
                                            <span className="text-gray-400"> / </span>
                                            {w.expectedFlats}
                                            <span className={`ml-1.5 ${w.remainingFlats > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-400"}`}>
                                                · {w.remainingFlats} left
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Mahaprasad summary card */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900 mb-8">
                <div className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20">
                            <UtensilsCrossed className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-md font-bold text-gray-800 dark:text-white">Mahaprasad Planning</h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {stats.mahaprasad.registeredHouseholds} registered households · {stats.mahaprasad.totalPeople} residents · External donors excluded
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4 sm:gap-6">
                        <div className="text-right">
                            <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                                {stats.mahaprasad.expectedAttendance}
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Expected Attendees</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-bold text-violet-600 dark:text-violet-400">
                                {stats.mahaprasad.recommendedMeals}
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Recommended Meals</div>
                        </div>
                    </div>
                    <Link
                        to="/mahaprasad"
                        className="flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50/50 px-4 py-2.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100/60 transition-colors dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-400"
                    >
                        Plan Mahaprasad
                        <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            </div>

            {/* Recent activity log */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-gray-800">
                    <h3 className="text-md font-bold text-gray-800 dark:text-white">Recent Transactions</h3>
                    <Link
                        to="/ledger"
                        className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
                    >
                        View Full Ledger
                        <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                </div>

                <div className="hidden overflow-x-auto md:block">
                    {stats.recentActivity.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Activity className="h-10 w-10 text-gray-300 mb-2" />
                            <p className="text-sm font-semibold text-gray-400">No activity yet</p>
                            <p className="text-xs text-gray-400">Start logging donations and expenses to populate charts.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:bg-gray-800/20 dark:border-gray-800">
                                    <th className="px-6 py-4">Title / Name</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Category / Method</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                                {stats.recentActivity.map((act) => (
                                    <tr key={act._id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10">
                                        <td className="px-6 py-4.5">
                                            <div className="font-semibold text-gray-700 dark:text-gray-300">
                                                {act.type === "donation" ? `Donation: ${act.donorName}` : act.title}
                                            </div>
                                            {act.type === "donation" && act.donorType && (
                                                <div className="text-[10px] text-gray-400 mt-0.5">
                                                    {act.donorType === "resident" ? "Resident Household" : act.donorType === "external" ? "External Donor" : "Regular"}
                                                </div>
                                            )}
                                            {act.note && (
                                                <div className="text-[10px] text-gray-400 truncate max-w-xs mt-0.5">
                                                    {act.note}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4.5">
                                            <span
                                                className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold ${act.type === "donation"
                                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                                                    : "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400"
                                                    }`}
                                            >
                                                {act.type === "donation" ? "Donation" : "Expense"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4.5 font-medium text-gray-500 text-xs">
                                            {act.type === "donation"
                                                ? `Payment: ${act.paymentMethod.toUpperCase()}`
                                                : act.category}
                                        </td>
                                        <td className="px-6 py-4.5 text-xs text-gray-400">
                                            <div className="flex items-center gap-1">
                                                <CalendarDays className="h-3.5 w-3.5" />
                                                {new Date(act.date).toLocaleDateString("en-IN", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric"
                                                })}
                                            </div>
                                        </td>
                                        <td className={`px-6 py-4.5 text-right font-bold text-sm ${act.type === "donation" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                            }`}>
                                            {act.type === "donation" ? "+" : "-"} ₹{act.amount.toLocaleString("en-IN")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Mobile recent activity cards */}
                {stats.recentActivity.length > 0 && (
                    <div className="divide-y divide-gray-100 md:hidden dark:divide-gray-800/40">
                        {stats.recentActivity.map((act) => (
                            <div key={act._id} className="px-5 py-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                                            {act.type === "donation" ? `Donation: ${act.donorName}` : act.title}
                                        </div>
                                        {act.type === "donation" && act.donorType && (
                                            <div className="mt-0.5 text-[11px] text-gray-400">
                                                {act.donorType === "resident" ? "Resident Household" : act.donorType === "external" ? "External Donor" : "Regular"}
                                            </div>
                                        )}
                                        {act.note && (
                                            <div className="mt-0.5 truncate text-[11px] text-gray-400">
                                                {act.note}
                                            </div>
                                        )}
                                        <div className="mt-1 flex flex-wrap items-center gap-2">
                                            <span
                                                className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ${act.type === "donation"
                                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                                                    : "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400"
                                                    }`}
                                            >
                                                {act.type === "donation" ? "Donation" : "Expense"}
                                            </span>
                                            <span className="text-[11px] text-gray-400">
                                                {act.type === "donation"
                                                    ? `Payment: ${act.paymentMethod.toUpperCase()}`
                                                    : act.category}
                                            </span>
                                            <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                                <CalendarDays className="h-3 w-3" />
                                                {new Date(act.date).toLocaleDateString("en-IN", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric"
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`shrink-0 text-sm font-bold ${act.type === "donation" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                        {act.type === "donation" ? "+" : "-"} ₹{act.amount.toLocaleString("en-IN")}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Dashboard;


