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
                totalPledgedDonations: 0,
                totalCollectedDonations: 0,
                totalPendingDonations: 0,
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

    // Fetch all donations and expenses for target festival year
    const [donations, expensesAggregate] = await Promise.all([
        Donation.find(yearMatch).lean(),
        Expense.aggregate([
            { $match: yearMatch },
            { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
        ])
    ]);

    const totalExpenses = expensesAggregate[0]?.total || 0;
    const expensesCount = expensesAggregate[0]?.count || 0;

    // Financial aggregates for donations: Pledged vs Collected vs Pending
    let totalPledgedDonations = 0;
    let totalCollectedDonations = 0;
    let totalPendingDonations = 0;
    let totalResidentDonations = 0;
    let totalExternalDonorDonations = 0;

    const methodMap = { cash: 0, upi: 0, bank: 0 };
    const monthDonationsMap = {};
    for (let i = 1; i <= 12; i++) monthDonationsMap[i] = 0;

    const donorTypeMap = { resident: { amount: 0, count: 0 }, external: { amount: 0, count: 0 } };

    donations.forEach(d => {
        const pledged = d.amount || 0;
        totalPledgedDonations += pledged;

        let collected = 0;
        if (Array.isArray(d.payments) && d.payments.length > 0) {
            d.payments.forEach(p => {
                const pAmt = Number(p.amount) || 0;
                collected += pAmt;
                const pMethod = (p.paymentMethod || "cash").toLowerCase();
                if (methodMap[pMethod] !== undefined) {
                    methodMap[pMethod] += pAmt;
                } else {
                    methodMap[pMethod] = (methodMap[pMethod] || 0) + pAmt;
                }

                // Month grouping based on actual payment date
                const pDate = p.date ? new Date(p.date) : (d.date ? new Date(d.date) : new Date());
                const m = pDate.getMonth() + 1;
                monthDonationsMap[m] = (monthDonationsMap[m] || 0) + pAmt;
            });
        } else {
            // Legacy donation
            if (d.collectionStatus !== "not_collected") {
                collected = d.collectedAmount != null ? d.collectedAmount : pledged;
                const pMethod = (d.paymentMethod || "cash").toLowerCase();
                if (methodMap[pMethod] !== undefined) {
                    methodMap[pMethod] += collected;
                } else {
                    methodMap[pMethod] = (methodMap[pMethod] || 0) + collected;
                }
                const dDate = d.date ? new Date(d.date) : new Date();
                const m = dDate.getMonth() + 1;
                monthDonationsMap[m] = (monthDonationsMap[m] || 0) + collected;
            }
        }

        totalCollectedDonations += collected;
        totalPendingDonations += Math.max(pledged - collected, 0);

        const dType = d.donorType === "resident" ? "resident" : "external";
        donorTypeMap[dType].amount += collected;
        donorTypeMap[dType].count += 1;
    });

    totalResidentDonations = donorTypeMap.resident.amount;
    totalExternalDonorDonations = donorTypeMap.external.amount;

    const donationsByDonorType = [
        { donorType: "resident", amount: donorTypeMap.resident.amount, count: donorTypeMap.resident.count },
        { donorType: "external", amount: donorTypeMap.external.amount, count: donorTypeMap.external.count }
    ];

    const donationsByPaymentMethod = Object.entries(methodMap).map(([method, amount]) => ({
        paymentMethod: method,
        amount
    }));

    // Liquid cash balance strictly reflects collected donations minus expenses
    const currentBalance = totalCollectedDonations - totalExpenses;
    const totalTransactions = donations.length + expensesCount;

    // Recent Activities (Latest 5 donations and 5 expenses merged)
    const recentExpenses = await Expense.find(yearMatch)
        .sort({ date: -1, createdAt: -1 })
        .limit(5)
        .lean();

    const recentDonationsSorted = [...donations]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    const mergedActivity = [
        ...recentDonationsSorted.map(d => ({ ...d, type: "donation" })),
        ...recentExpenses.map(e => ({ ...e, type: "expense" }))
    ]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);

    // Expenses by Category Breakdown
    const expensesByCategory = await Expense.aggregate([
        { $match: yearMatch },
        { $group: { _id: "$category", totalAmount: { $sum: "$amount" } } },
        { $project: { category: "$_id", amount: "$totalAmount", _id: 0 } },
        { $sort: { amount: -1 } }
    ]);

    // Monthly Comparison
    const expensesByMonth = await Expense.aggregate([
        { $match: yearMatch },
        {
            $group: {
                _id: { $month: "$date" },
                total: { $sum: "$amount" }
            }
        }
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyMap = {};

    for (let i = 1; i <= 12; i++) {
        monthlyMap[i] = { month: monthNames[i - 1], donations: monthDonationsMap[i] || 0, expenses: 0 };
    }

    expensesByMonth.forEach(e => {
        if (monthlyMap[e._id]) monthlyMap[e._id].expenses = e.total;
    });

    const monthlyComparison = Object.values(monthlyMap);

    // Resident / Household Statistics & Mahaprasad
    const [residentStats, mahaprasad] = await Promise.all([
        calculateResidentStatistics(userId),
        getMahaprasadPlanning(userId, targetYear)
    ]);

    return res.status(200).json(new ApiResponse(200, {
        totalDonations: totalCollectedDonations,
        totalPledgedDonations,
        totalCollectedDonations,
        totalPendingDonations,
        totalExpenses,
        currentBalance,
        totalTransactions,
        recentActivity: mergedActivity,
        expensesByCategory,
        donationsByPaymentMethod,
        monthlyComparison,
        totalResidentDonations,
        totalExternalDonorDonations,
        donationsByDonorType,
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

    // Map expense transactions (individual payments as separate outflows)
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

    // Map donation transactions (individual payments as separate cash inflows)
    const donationTransactions = [];
    donations.forEach(d => {
        if (Array.isArray(d.payments) && d.payments.length > 0) {
            d.payments.forEach((p, idx) => {
                if (p.amount > 0) {
                    const payRef = d.payments.length > 1
                        ? `${d.receiptNumber}-P${idx + 1}`
                        : d.receiptNumber;

                    donationTransactions.push({
                        _id: p._id || `${d._id}_pay_${idx}`,
                        donationId: d._id,
                        title: `Donation: ${d.donorName}`,
                        donorName: d.donorName,
                        amount: p.amount,
                        type: "donation",
                        donorType: d.donorType || "regular",
                        paymentMethod: p.paymentMethod || "cash",
                        receiptNumber: d.receiptNumber,
                        date: p.date || d.date,
                        note: p.note || d.note,
                        referenceNumber: payRef
                    });
                }
            });
        } else if (d.collectionStatus !== "not_collected" && (d.amount > 0 || (d.collectedAmount || 0) > 0)) {
            // Legacy donation without payments array
            const amountVal = d.collectedAmount != null ? d.collectedAmount : d.amount;
            if (amountVal > 0) {
                donationTransactions.push({
                    _id: d._id,
                    donationId: d._id,
                    title: `Donation: ${d.donorName}`,
                    donorName: d.donorName,
                    amount: amountVal,
                    type: "donation",
                    donorType: d.donorType || "regular",
                    paymentMethod: d.paymentMethod || "cash",
                    receiptNumber: d.receiptNumber,
                    date: d.date,
                    note: d.note,
                    referenceNumber: d.receiptNumber
                });
            }
        }
    });

    const mergedTransactions = [
        ...donationTransactions,
        ...expenseTransactions
    ];

    // Sort chronologically ascending to calculate running balance
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

    // Reverse to descending order (latest transactions first) for display
    ledger.reverse();

    return res.status(200).json(new ApiResponse(200, ledger, "Ledger fetched successfully"));
});

export {
    getDashboardStats,
    getLedger
};