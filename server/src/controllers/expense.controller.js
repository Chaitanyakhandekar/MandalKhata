import { Expense } from "../models/expense.model.js";
import { Category } from "../models/category.model.js";
import { FestivalYear } from "../models/festivalYear.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiUtils.js";
import { uploadFileOnCloudinary, deleteFileFromCloudinary } from "../services/cloudinary.service.js";
import { DEFAULT_EXPENSE_CATEGORIES, normalizeCategoryName } from "../constants/categories.js";

const getExpenses = asyncHandler(async (req, res) => {
    const { festivalYear, search, category, paymentStatus, startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = { createdBy: req.user._id };

    // Filter by festival year (always default to active year if not provided)
    if (festivalYear) {
        query.festivalYear = festivalYear;
    } else {
        const activeYear = await FestivalYear.findOne({ isActive: true, createdBy: req.user._id });
        if (activeYear) {
            query.festivalYear = activeYear.year;
        }
    }

    // Keyword search (title or vendorName)
    if (search && search.trim()) {
        const regex = new RegExp(search.trim(), "i");
        query.$or = [
            { title: regex },
            { vendorName: regex },
            { note: regex }
        ];
    }

    // Category filter
    if (category && typeof category === "string" && category.trim()) {
        query.category = category.trim();
    }

    // Payment status filter
    if (paymentStatus && ["paid", "partially_paid", "pending"].includes(paymentStatus)) {
        query.paymentStatus = paymentStatus;
    }

    // Date range filter
    if (startDate || endDate) {
        query.date = {};
        if (startDate) {
            query.date.$gte = new Date(startDate);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.date.$lte = end;
        }
    }

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const skipIndex = (pageNum - 1) * limitNum;

    const [expenses, total, statsAggregate] = await Promise.all([
        Expense.find(query)
            .sort({ date: -1, createdAt: -1 })
            .skip(skipIndex)
            .limit(limitNum)
            .populate("createdBy", "name username"),
        Expense.countDocuments(query),
        Expense.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$amount" },
                    totalPaidAmount: { $sum: "$paidAmount" },
                    totalOutstanding: {
                        $sum: {
                            $max: [{ $subtract: ["$amount", "$paidAmount"] }, 0]
                        }
                    }
                }
            }
        ])
    ]);

    const stats = statsAggregate && statsAggregate[0] ? statsAggregate[0] : {};
    const totalAmount = stats.totalAmount || 0;
    const totalPaidAmount = stats.totalPaidAmount || 0;
    const totalOutstanding = stats.totalOutstanding || 0;

    return res.status(200).json(new ApiResponse(200, {
        expenses,
        total,
        totalAmount,
        totalPaidAmount,
        totalOutstanding,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
    }, "Expenses fetched successfully"));
});

const createExpense = asyncHandler(async (req, res) => {
    const {
        title,
        amount,
        category,
        vendorName,
        paymentType, // "full" or "partial"
        paymentStatus, // "paid", "partially_paid", "pending"
        amountPaid,
        paymentMethod,
        note,
        date,
        festivalYear
    } = req.body;

    if (!title || !title.trim()) {
        return res.status(400).json(new ApiResponse(400, null, "Expense title is required", false));
    }

    if (amount === undefined || amount === null || Number(amount) < 0) {
        return res.status(400).json(new ApiResponse(400, null, "Valid expense amount is required", false));
    }

    const totalExpenseAmount = Number(amount);

    if (!category || typeof category !== "string" || !category.trim()) {
        return res.status(400).json(new ApiResponse(400, null, "Valid category is required", false));
    }

    const trimmedCategory = category.trim();
    const normalizedCategory = normalizeCategoryName(trimmedCategory);

    // Check system category
    const systemCategoryMatch = DEFAULT_EXPENSE_CATEGORIES.find(
        (c) => normalizeCategoryName(c) === normalizedCategory
    );

    let resolvedCategoryName = "";
    let resolvedCategoryId = null;

    if (systemCategoryMatch) {
        resolvedCategoryName = systemCategoryMatch;
    } else {
        // Look up active custom category for user
        const customCategory = await Category.findOne({
            createdBy: req.user._id,
            normalizedName: normalizedCategory,
            isActive: true
        });

        if (!customCategory) {
            const inactiveCategory = await Category.findOne({
                createdBy: req.user._id,
                normalizedName: normalizedCategory,
                isActive: false
            });
            if (inactiveCategory) {
                return res.status(400).json(new ApiResponse(400, null, `Category '${inactiveCategory.name}' is deactivated and cannot be used for new expenses`, false));
            }
            return res.status(400).json(new ApiResponse(400, null, "Valid category is required", false));
        }

        resolvedCategoryName = customCategory.name;
        resolvedCategoryId = customCategory._id;
    }

    // Resolve festival year
    let targetYear = festivalYear;
    if (!targetYear) {
        const activeYear = await FestivalYear.findOne({ isActive: true, createdBy: req.user._id });
        if (!activeYear) {
            return res.status(400).json(new ApiResponse(400, null, "No active festival year found. Please create a year first.", false));
        }
        targetYear = activeYear.year;
    }

    // Determine payment configuration
    const isPartial = paymentType === "partial" || paymentStatus === "partially_paid";
    const isPending = paymentStatus === "pending";
    const validMethod = ["cash", "upi", "bank"].includes(paymentMethod) ? paymentMethod : "cash";
    const expenseDate = date ? new Date(date) : new Date();

    let finalPaidAmount = 0;
    let finalPaymentStatus = "paid";
    const initialPayments = [];

    if (isPending) {
        finalPaidAmount = 0;
        finalPaymentStatus = "pending";
    } else if (isPartial) {
        if (amountPaid === undefined || amountPaid === null || amountPaid === "" || isNaN(Number(amountPaid))) {
            return res.status(400).json(new ApiResponse(400, null, "Amount paid is required for partial payment", false));
        }
        const paidNum = Number(amountPaid);
        if (paidNum <= 0) {
            return res.status(400).json(new ApiResponse(400, null, "Amount paid must be greater than 0", false));
        }
        if (paidNum >= totalExpenseAmount) {
            return res.status(400).json(new ApiResponse(400, null, "Amount paid must be strictly less than total expense amount for partial payment", false));
        }
        finalPaidAmount = paidNum;
        finalPaymentStatus = "partially_paid";
        initialPayments.push({
            amount: finalPaidAmount,
            paymentMethod: validMethod,
            date: expenseDate,
            note: note ? note.trim() : "",
            paidBy: req.user._id,
            createdAt: new Date()
        });
    } else {
        // Full Payment (default)
        finalPaidAmount = totalExpenseAmount;
        finalPaymentStatus = "paid";
        if (totalExpenseAmount > 0) {
            initialPayments.push({
                amount: finalPaidAmount,
                paymentMethod: validMethod,
                date: expenseDate,
                note: note ? note.trim() : "",
                paidBy: req.user._id,
                createdAt: new Date()
            });
        }
    }

    let billImage = "";
    let billImagePublicId = "";

    if (req.file) {
        const uploadResult = await uploadFileOnCloudinary(req.file.path);
        if (uploadResult && uploadResult.success) {
            billImage = uploadResult.secure_url;
            billImagePublicId = uploadResult.public_id;
        } else {
            return res.status(500).json(new ApiResponse(500, null, "Failed to upload bill image to Cloudinary", false));
        }
    }

    const expense = await Expense.create({
        title: title.trim(),
        amount: totalExpenseAmount,
        paidAmount: finalPaidAmount,
        category: resolvedCategoryName,
        categoryId: resolvedCategoryId,
        vendorName: vendorName ? vendorName.trim() : "",
        paymentStatus: finalPaymentStatus,
        payments: initialPayments,
        billImage,
        billImagePublicId,
        note: note ? note.trim() : "",
        date: expenseDate,
        festivalYear: targetYear,
        createdBy: req.user._id
    });

    const populatedExpense = await Expense.findById(expense._id).populate("createdBy", "name username");

    return res.status(201).json(new ApiResponse(201, populatedExpense, "Expense recorded successfully"));
});

const addPaymentToExpense = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { amount, paymentMethod, date, note } = req.body;

    const expense = await Expense.findById(id);
    if (!expense) {
        return res.status(404).json(new ApiResponse(404, null, "Expense not found", false));
    }

    if (expense.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json(new ApiResponse(403, null, "You can only add payments to your own expenses", false));
    }

    if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json(new ApiResponse(400, null, "Payment amount must be greater than 0", false));
    }

    const paymentNum = Number(amount);
    const currentPaid = expense.paidAmount || 0;
    const outstanding = Math.max(expense.amount - currentPaid, 0);

    if (outstanding <= 0) {
        return res.status(400).json(new ApiResponse(400, null, "This expense is already fully paid", false));
    }

    if (paymentNum > outstanding) {
        return res.status(400).json(new ApiResponse(400, null, `Payment amount cannot exceed outstanding balance of ₹${outstanding.toLocaleString("en-IN")}`, false));
    }

    const validPaymentMethod = ["cash", "upi", "bank"].includes(paymentMethod) ? paymentMethod : "cash";
    const paymentDate = date ? new Date(date) : new Date();

    const newPayment = {
        amount: paymentNum,
        paymentMethod: validPaymentMethod,
        date: paymentDate,
        note: note ? note.trim() : "",
        paidBy: req.user._id,
        createdAt: new Date()
    };

    expense.payments.push(newPayment);
    expense.paidAmount = currentPaid + paymentNum;

    if (expense.paidAmount >= expense.amount) {
        expense.paymentStatus = "paid";
    } else if (expense.paidAmount > 0) {
        expense.paymentStatus = "partially_paid";
    } else {
        expense.paymentStatus = "pending";
    }

    await expense.save();

    const updatedExpense = await Expense.findById(expense._id)
        .populate("createdBy", "name username");

    return res.status(200).json(new ApiResponse(200, updatedExpense, "Payment recorded successfully"));
});

const updateExpense = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, amount, category, vendorName, paymentStatus, note, date } = req.body;

    const expense = await Expense.findById(id);
    if (!expense) {
        return res.status(404).json(new ApiResponse(404, null, "Expense not found", false));
    }

    if (expense.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json(new ApiResponse(403, null, "You can only update your own expenses", false));
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();

    if (amount !== undefined) {
        const newAmount = Number(amount);
        if (isNaN(newAmount) || newAmount < 0) {
            return res.status(400).json(new ApiResponse(400, null, "Amount cannot be negative", false));
        }

        const currentPaid = expense.paidAmount || 0;
        if (newAmount < currentPaid) {
            return res.status(400).json(new ApiResponse(400, null, `Total expense amount (₹${newAmount.toLocaleString("en-IN")}) cannot be less than already paid amount (₹${currentPaid.toLocaleString("en-IN")})`, false));
        }

        updateData.amount = newAmount;

        // Auto-recalculate status when total expense amount changes
        if (currentPaid >= newAmount) {
            updateData.paymentStatus = "paid";
        } else if (currentPaid > 0) {
            updateData.paymentStatus = "partially_paid";
        } else {
            updateData.paymentStatus = "pending";
        }
    } else if (paymentStatus !== undefined && ["paid", "partially_paid", "pending"].includes(paymentStatus)) {
        updateData.paymentStatus = paymentStatus;
    }

    if (category !== undefined) {
        if (typeof category !== "string" || !category.trim()) {
            return res.status(400).json(new ApiResponse(400, null, "Invalid category", false));
        }

        const trimmedCategory = category.trim();
        const normalizedCategory = normalizeCategoryName(trimmedCategory);

        const systemCategoryMatch = DEFAULT_EXPENSE_CATEGORIES.find(
            (c) => normalizeCategoryName(c) === normalizedCategory
        );

        if (systemCategoryMatch) {
            updateData.category = systemCategoryMatch;
            updateData.categoryId = null;
        } else {
            // Find custom category (active, or already linked to this expense)
            const customCategory = await Category.findOne({
                createdBy: req.user._id,
                normalizedName: normalizedCategory
            });

            if (!customCategory) {
                return res.status(400).json(new ApiResponse(400, null, "Invalid category", false));
            }

            // If deactivated, only allow if the expense already had this category
            if (!customCategory.isActive && expense.category !== customCategory.name && String(expense.categoryId) !== String(customCategory._id)) {
                return res.status(400).json(new ApiResponse(400, null, `Category '${customCategory.name}' is deactivated and cannot be selected`, false));
            }

            updateData.category = customCategory.name;
            updateData.categoryId = customCategory._id;
        }
    }
    if (vendorName !== undefined) updateData.vendorName = vendorName.trim();
    if (note !== undefined) updateData.note = note.trim();
    if (date !== undefined) updateData.date = new Date(date);

    if (req.file) {
        // Upload new image
        const uploadResult = await uploadFileOnCloudinary(req.file.path);
        if (uploadResult && uploadResult.success) {
            updateData.billImage = uploadResult.secure_url;
            updateData.billImagePublicId = uploadResult.public_id;

            // Delete old image from Cloudinary
            if (expense.billImagePublicId) {
                await deleteFileFromCloudinary(expense.billImagePublicId);
            }
        } else {
            return res.status(500).json(new ApiResponse(500, null, "Failed to upload new bill image", false));
        }
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
    ).populate("createdBy", "name username");

    return res.status(200).json(new ApiResponse(200, updatedExpense, "Expense updated successfully"));
});

const deleteExpense = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const expense = await Expense.findById(id);
    if (!expense) {
        return res.status(404).json(new ApiResponse(404, null, "Expense not found", false));
    }

    if (expense.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json(new ApiResponse(403, null, "You can only delete your own expenses", false));
    }

    // Delete image from Cloudinary if it exists
    if (expense.billImagePublicId) {
        await deleteFileFromCloudinary(expense.billImagePublicId);
    }

    await Expense.findByIdAndDelete(id);

    return res.status(200).json(new ApiResponse(200, null, "Expense deleted successfully"));
});

export {
    getExpenses,
    createExpense,
    addPaymentToExpense,
    updateExpense,
    deleteExpense
};
