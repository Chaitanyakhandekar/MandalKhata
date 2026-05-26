import { Donation } from "../models/donation.model.js";
import { Expense } from "../models/expense.model.js";
import { FestivalYear } from "../models/festivalYear.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiUtils.js";

const getDashboardStats = asyncHandler(async (req, res) => {
    const { festivalYear } = req.query;

    let targetYear = festivalYear;
    if (!targetYear) {
        const activeYear = await FestivalYear.findOne({ isActive: true });
        if (!activeYear) {
            return res.status(200).json(new ApiResponse(200, {
                totalDonations: 0,
                totalExpenses: 0,
                currentBalance: 0,
                totalTransactions: 0,
                recentActivity: [],
                expensesByCategory: [],
                donationsByPaymentMethod: [],
                monthlyComparison: []
            }, "No active year found. Returned empty stats."));
        }
        targetYear = activeYear.year;
    }

    // 1. Core Financial Aggregates
    const donationsAggregate = await Donation.aggregate([
        { $match: { festivalYear: targetYear } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]);

    const expensesAggregate = await Expense.aggregate([
        { $match: { festivalYear: targetYear } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]);

    const totalDonations = donationsAggregate[0]?.total || 0;
    const totalExpenses = expensesAggregate[0]?.total || 0;
    const donationsCount = donationsAggregate[0]?.count || 0;
    const expensesCount = expensesAggregate[0]?.count || 0;

    const currentBalance = totalDonations - totalExpenses;
    const totalTransactions = donationsCount + expensesCount;

    // 2. Recent Activities (Latest 5 donations and 5 expenses merged)
    const recentDonations = await Donation.find({ festivalYear: targetYear })
        .sort({ date: -1, createdAt: -1 })
        .limit(5)
        .lean();

    const recentExpenses = await Expense.find({ festivalYear: targetYear })
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
        { $match: { festivalYear: targetYear } },
        { $group: { _id: "$category", totalAmount: { $sum: "$amount" } } },
        { $project: { category: "$_id", amount: "$totalAmount", _id: 0 } },
        { $sort: { amount: -1 } }
    ]);

    // 4. Donations by Payment Method Breakdown
    const donationsByPaymentMethod = await Donation.aggregate([
        { $match: { festivalYear: targetYear } },
        { $group: { _id: "$paymentMethod", totalAmount: { $sum: "$amount" } } },
        { $project: { paymentMethod: "$_id", amount: "$totalAmount", _id: 0 } }
    ]);

    // 5. Monthly Comparison (Group by month)
    // We group both donations and expenses by month (1 to 12)
    const donationsByMonth = await Donation.aggregate([
        { $match: { festivalYear: targetYear } },
        {
            $group: {
                _id: { $month: "$date" },
                total: { $sum: "$amount" }
            }
        }
    ]);

    const expensesByMonth = await Expense.aggregate([
        { $match: { festivalYear: targetYear } },
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

    return res.status(200).json(new ApiResponse(200, {
        totalDonations,
        totalExpenses,
        currentBalance,
        totalTransactions,
        recentActivity: mergedActivity,
        expensesByCategory,
        donationsByPaymentMethod,
        monthlyComparison
    }, "Dashboard statistics compiled successfully"));
});

const getLedger = asyncHandler(async (req, res) => {
    const { festivalYear } = req.query;

    let targetYear = festivalYear;
    if (!targetYear) {
        const activeYear = await FestivalYear.findOne({ isActive: true });
        if (!activeYear) {
            return res.status(200).json(new ApiResponse(200, [], "No active year found"));
        }
        targetYear = activeYear.year;
    }

    const donations = await Donation.find({ festivalYear: targetYear }).lean();
    const expenses = await Expense.find({ festivalYear: targetYear }).lean();

    // Map and combine
    const mergedTransactions = [
        ...donations.map(d => ({
            _id: d._id,
            title: `Donation: ${d.donorName}`,
            donorName: d.donorName,
            amount: d.amount,
            type: "donation",
            paymentMethod: d.paymentMethod,
            receiptNumber: d.receiptNumber,
            date: d.date,
            note: d.note,
            referenceNumber: d.receiptNumber
        })),
        ...expenses.map(e => ({
            _id: e._id,
            title: e.title,
            amount: e.amount,
            type: "expense",
            category: e.category,
            vendorName: e.vendorName,
            paymentStatus: e.paymentStatus,
            date: e.date,
            note: e.note,
            billImage: e.billImage,
            referenceNumber: "BILL-EXP"
        }))
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
