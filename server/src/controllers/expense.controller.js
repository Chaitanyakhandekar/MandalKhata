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
    if (paymentStatus && ["paid", "pending"].includes(paymentStatus)) {
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

    const skipIndex = (parseInt(page) - 1) * parseInt(limit);

    const expenses = await Expense.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skipIndex)
        .limit(parseInt(limit))
        .populate("createdBy", "name username");

    const total = await Expense.countDocuments(query);

    return res.status(200).json(new ApiResponse(200, {
        expenses,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
    }, "Expenses fetched successfully"));
});

const createExpense = asyncHandler(async (req, res) => {
    const { title, amount, category, vendorName, paymentStatus, note, date, festivalYear } = req.body;

    if (!title || !title.trim()) {
        return res.status(400).json(new ApiResponse(400, null, "Expense title is required", false));
    }

    if (amount === undefined || amount === null || Number(amount) < 0) {
        return res.status(400).json(new ApiResponse(400, null, "Valid expense amount is required", false));
    }

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
        amount: Number(amount),
        category: resolvedCategoryName,
        categoryId: resolvedCategoryId,
        vendorName: vendorName ? vendorName.trim() : "",
        paymentStatus: paymentStatus || "paid",
        billImage,
        billImagePublicId,
        note: note ? note.trim() : "",
        date: date ? new Date(date) : new Date(),
        festivalYear: targetYear,
        createdBy: req.user._id
    });

    const populatedExpense = await Expense.findById(expense._id).populate("createdBy", "name username");

    return res.status(201).json(new ApiResponse(201, populatedExpense, "Expense recorded successfully"));
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
        if (Number(amount) < 0) {
            return res.status(400).json(new ApiResponse(400, null, "Amount cannot be negative", false));
        }
        updateData.amount = Number(amount);
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
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
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
    updateExpense,
    deleteExpense
};
