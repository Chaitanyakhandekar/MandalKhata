import { Donation } from "../models/donation.model.js";
import { Expense } from "../models/expense.model.js";
import { FestivalYear } from "../models/festivalYear.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiUtils.js";
import { calculateResidentStatistics, getMahaprasadPlanning } from "../services/residentStats.service.js";

const getDashboardStats = asyncHandler(async (req, res) => {
    const { festivalYear } = req.query;
    const userId = req.user._id;

    let targetYear = festivalYear;
    if (!targetYear) {
        const activeYear = await FestivalYear.findOne({ isActive: true, createdBy: userId });
        if (!activeYear) {
            return res.status(200).json(new ApiResponse(200, {
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
                    festivalYear: null,
                    registeredHouseholds: 0,
                    totalPeople: 0,
                    expectedAttendancePercentage: 80,
                    safetyBufferPercentage: 10,
                    expectedAttendance: 0,
                    recommendedMeals: 0,
                    externalDonorsExcluded: true
                }
            }, "No active year found. Returned empty stats."));
        }
        targetYear = activeYear.year;
    }

    const yearMatch = { festivalYear: targetYear, createdBy: userId };

    // 1. Core Financial Aggregates
    const donationsAggregate = await Donation.aggregate([
        { $match: yearMatch },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]);

    const expensesAggregate = await Expense.aggregate([
        { $match: yearMatch },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]);

    const totalDonations = donationsAggregate[0]?.total || 0;
    const totalExpenses = expensesAggregate[0]?.total || 0;
    const donationsCount = donationsAggregate[0]?.count || 0;
    const expensesCount = expensesAggregate[0]?.count || 0;

    const currentBalance = totalDonations - totalExpenses;
    const totalTransactions = donationsCount + expensesCount;

    // 1b. Resident vs External Donation Breakdown
    const donationsByDonorTypeAggregate = await Donation.aggregate([
        { $match: yearMatch },
        {
            $group: {
                _id: { $ifNull: ["$donorType", "regular"] },
                total: { $sum: "$amount" },
                count: { $sum: 1 }
            }
        },
        { $project: { donorType: "$_id", amount: "$total", count: 1, _id: 0 } }
    ]);

    const totalResidentDonations = donationsByDonorTypeAggregate.find(d => d.donorType === "resident")?.amount || 0;
    const totalExternalDonorDonations = donationsByDonorTypeAggregate.find(d => d.donorType === "external")?.amount || 0;

    // 2. Recent Activities (Latest 5 donations and 5 expenses merged)
    const recentDonations = await Donation.find(yearMatch)
        .sort({ date: -1, createdAt: -1 })
        .limit(5)
        .lean();

    const recentExpenses = await Expense.find(yearMatch)
        .sort({ date: -1, createdAt: -1 })
        .limit(5)
        .lean();

    const mergedActivity = [
        ...recentDonations.map(d => ({ ...d, type: "donation" })),
        ...recentExpenses.map(e => ({ ...e, type: "expense" }))
    ]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);

    // 3. Expenses by Category Breakdown
    const expensesByCategory = await Expense.aggregate([
        { $match: yearMatch },
        { $group: { _id: "$category", totalAmount: { $sum: "$amount" } } },
        { $project: { category: "$_id", amount: "$totalAmount", _id: 0 } },
        { $sort: { amount: -1 } }
    ]);

    // 4. Donations by Payment Method Breakdown
    const donationsByPaymentMethod = await Donation.aggregate([
        { $match: yearMatch },
        { $group: { _id: "$paymentMethod", totalAmount: { $sum: "$amount" } } },
        { $project: { paymentMethod: "$_id", amount: "$totalAmount", _id: 0 } }
    ]);

    // 5. Monthly Comparison (Group by month)
    // We group both donations and expenses by month (1 to 12)
    const donationsByMonth = await Donation.aggregate([
        { $match: yearMatch },
        {
            $group: {
                _id: { $month: "$date" },
                total: { $sum: "$amount" }
            }
        }
    ]);

    const expensesByMonth = await Expense.aggregate([
        { $match: yearMatch },
        {
            $group: {
                _id: { $month: "$date" },
                total: { $sum: "$amount" }
            }
        }
    ]);

    // Map month IDs (1-12) to Names
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyMap = {};

    for (let i = 1; i <= 12; i++) {
        monthlyMap[i] = { month: monthNames[i - 1], donations: 0, expenses: 0 };
    }

    donationsByMonth.forEach(d => {
        if (monthlyMap[d._id]) monthlyMap[d._id].donations = d.total;
    });

    expensesByMonth.forEach(e => {
        if (monthlyMap[e._id]) monthlyMap[e._id].expenses = e.total;
    });

    const monthlyComparison = Object.values(monthlyMap);

    // 6. Resident / Household Statistics (computed only from resident households)
    const [residentStats, mahaprasad] = await Promise.all([
        calculateResidentStatistics(userId),
        getMahaprasadPlanning(userId, targetYear)
    ]);

    return res.status(200).json(new ApiResponse(200, {
        totalDonations,
        totalExpenses,
        currentBalance,
        totalTransactions,
        recentActivity: mergedActivity,
        expensesByCategory,
        donationsByPaymentMethod,
        monthlyComparison,
        totalResidentDonations,
        totalExternalDonorDonations,
        donationsByDonorType: donationsByDonorTypeAggregate,
        residentStats,
        mahaprasad
    }, "Dashboard statistics compiled successfully"));
});

const getLedger = asyncHandler(async (req, res) => {
    const { festivalYear } = req.query;
    const userId = req.user._id;

    let targetYear = festivalYear;
    if (!targetYear) {
        const activeYear = await FestivalYear.findOne({ isActive: true, createdBy: userId });
        if (!activeYear) {
            return res.status(200).json(new ApiResponse(200, [], "No active year found"));
        }
        targetYear = activeYear.year;
    }

    const yearMatch = { festivalYear: targetYear, createdBy: userId };

    const donations = await Donation.find(yearMatch).lean();
    const expenses = await Expense.find(yearMatch).lean();

    // Map and combine
    const expenseTransactions = [];
    expenses.forEach(e => {
        if (Array.isArray(e.payments) && e.payments.length > 0) {
            e.payments.forEach((p, idx) => {
                if (p.amount > 0) {
                    const payRef = p._id
                        ? `EXP-${p._id.toString().slice(-6).toUpperCase()}`
                        : `EXP-${String(e._id).slice(-6).toUpperCase()}-${idx + 1}`;
                    expenseTransactions.push({
                        _id: p._id || `${e._id}_pay_${idx}`,
                        expenseId: e._id,
                        title: e.title,
                        amount: p.amount,
                        type: "expense",
                        category: e.category,
                        vendorName: e.vendorName,
                        paymentMethod: p.paymentMethod || "cash",
                        paymentStatus: e.paymentStatus,
                        date: p.date || e.date,
                        note: p.note || e.note,
                        billImage: e.billImage,
                        referenceNumber: payRef
                    });
                }
            });
        } else if (e.paymentStatus === "paid" && e.amount > 0) {
            // Backward compatibility for legacy expenses without a payments array
            expenseTransactions.push({
                _id: e._id,
                expenseId: e._id,
                title: e.title,
                amount: e.amount,
                type: "expense",
                category: e.category,
                vendorName: e.vendorName,
                paymentMethod: "cash",
                paymentStatus: e.paymentStatus,
                date: e.date,
                note: e.note,
                billImage: e.billImage,
                referenceNumber: `EXP-${String(e._id).slice(-6).toUpperCase()}`
            });
        }
    });

    const mergedTransactions = [
        ...donations.map(d => ({
            _id: d._id,
            title: `Donation: ${d.donorName}`,
            donorName: d.donorName,
            amount: d.amount,
            type: "donation",
            donorType: d.donorType || "regular",
            paymentMethod: d.paymentMethod,
            receiptNumber: d.receiptNumber,
            date: d.date,
            note: d.note,
            referenceNumber: d.receiptNumber
        })),
        ...expenseTransactions
    ];

    // Sort by date ascending to calculate running balance
    mergedTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    let balance = 0;
    const ledger = mergedTransactions.map(tx => {
        if (tx.type === "donation") {
            balance += tx.amount;
        } else {
            balance -= tx.amount;
        }
        return {
            ...tx,
            runningBalance: balance
        };
    });

    // Reverse to chronological descending order (latest transactions first) for display
    ledger.reverse();

    return res.status(200).json(new ApiResponse(200, ledger, "Ledger fetched successfully"));
});

export {
    getDashboardStats,
    getLedger
};