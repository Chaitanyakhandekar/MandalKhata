import { Category } from "../models/category.model.js";
import { Expense } from "../models/expense.model.js";
import { DEFAULT_EXPENSE_CATEGORIES, normalizeCategoryName } from "../constants/categories.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiUtils.js";

const getCategories = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Fetch custom categories created by the user
    const customCategories = await Category.find({ createdBy: userId })
        .sort({ name: 1 })
        .lean();

    // Calculate usage count for each category
    const expenseCounts = await Expense.aggregate([
        { $match: { createdBy: userId } },
        { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);
    const expenseCountMap = new Map();
    expenseCounts.forEach((e) => {
        if (e._id) expenseCountMap.set(e._id, e.count);
    });

    const systemCategories = DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
        name,
        isSystem: true,
        isActive: true,
        expenseCount: expenseCountMap.get(name) || 0
    }));

    const enrichedCustomCategories = customCategories.map((cat) => ({
        _id: cat._id,
        name: cat.name,
        isActive: cat.isActive,
        isSystem: false,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
        expenseCount: expenseCountMap.get(cat.name) || 0
    }));

    const allActiveCategories = [
        ...DEFAULT_EXPENSE_CATEGORIES,
        ...customCategories.filter((c) => c.isActive).map((c) => c.name)
    ];

    const allCategories = [
        ...DEFAULT_EXPENSE_CATEGORIES,
        ...customCategories.map((c) => c.name)
    ];

    return res.status(200).json(new ApiResponse(200, {
        systemCategories,
        customCategories: enrichedCustomCategories,
        allActiveCategories,
        allCategories
    }, "Categories retrieved successfully"));
});

const createCategory = asyncHandler(async (req, res) => {
    const { name } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json(new ApiResponse(400, null, "Category name is required", false));
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
        return res.status(400).json(new ApiResponse(400, null, "Category name must be at least 2 characters", false));
    }
    if (trimmedName.length > 50) {
        return res.status(400).json(new ApiResponse(400, null, "Category name cannot exceed 50 characters", false));
    }

    const normalized = normalizeCategoryName(trimmedName);

    // Check system category conflict
    const isSystemConflict = DEFAULT_EXPENSE_CATEGORIES.some(
        (c) => normalizeCategoryName(c) === normalized
    );
    if (isSystemConflict) {
        return res.status(400).json(new ApiResponse(400, null, "A system default category with this name already exists", false));
    }

    // Check custom category conflict for this user
    const existing = await Category.findOne({
        createdBy: req.user._id,
        normalizedName: normalized
    });
    if (existing) {
        return res.status(400).json(new ApiResponse(400, null, `Category '${trimmedName}' already exists`, false));
    }

    const category = await Category.create({
        name: trimmedName,
        normalizedName: normalized,
        isActive: true,
        createdBy: req.user._id
    });

    return res.status(201).json(new ApiResponse(201, {
        _id: category._id,
        name: category.name,
        isActive: category.isActive,
        isSystem: false,
        expenseCount: 0,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
    }, "Category created successfully"));
});

const updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const category = await Category.findOne({ _id: id, createdBy: req.user._id });
    if (!category) {
        return res.status(404).json(new ApiResponse(404, null, "Category not found", false));
    }

    // Handle rename if provided
    if (name !== undefined) {
        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json(new ApiResponse(400, null, "Category name is required", false));
        }

        const trimmedName = name.trim();
        if (trimmedName.length < 2) {
            return res.status(400).json(new ApiResponse(400, null, "Category name must be at least 2 characters", false));
        }
        if (trimmedName.length > 50) {
            return res.status(400).json(new ApiResponse(400, null, "Category name cannot exceed 50 characters", false));
        }

        const normalized = normalizeCategoryName(trimmedName);

        // Check system category conflict
        const isSystemConflict = DEFAULT_EXPENSE_CATEGORIES.some(
            (c) => normalizeCategoryName(c) === normalized
        );
        if (isSystemConflict) {
            return res.status(400).json(new ApiResponse(400, null, "A system default category with this name already exists", false));
        }

        // Check duplicate name with other custom categories of user
        const conflict = await Category.findOne({
            createdBy: req.user._id,
            normalizedName: normalized,
            _id: { $ne: category._id }
        });
        if (conflict) {
            return res.status(400).json(new ApiResponse(400, null, `Category '${trimmedName}' already exists`, false));
        }

        const oldName = category.name;
        category.name = trimmedName;
        category.normalizedName = normalized;

        // Propagate rename to all existing expenses for this user
        await Expense.updateMany(
            { createdBy: req.user._id, $or: [{ categoryId: category._id }, { category: oldName }] },
            { $set: { category: trimmedName, categoryId: category._id } }
        );
    }

    // Handle status change
    if (isActive !== undefined) {
        category.isActive = Boolean(isActive);
    }

    await category.save();

    const expenseCount = await Expense.countDocuments({
        createdBy: req.user._id,
        $or: [{ categoryId: category._id }, { category: category.name }]
    });

    return res.status(200).json(new ApiResponse(200, {
        _id: category._id,
        name: category.name,
        isActive: category.isActive,
        isSystem: false,
        expenseCount,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
    }, "Category updated successfully"));
});

const deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const category = await Category.findOne({ _id: id, createdBy: req.user._id });
    if (!category) {
        return res.status(404).json(new ApiResponse(404, null, "Category not found", false));
    }

    // Check if category is used by existing expenses
    const expenseCount = await Expense.countDocuments({
        createdBy: req.user._id,
        $or: [{ categoryId: category._id }, { category: category.name }]
    });

    if (expenseCount > 0) {
        return res.status(400).json(new ApiResponse(
            400,
            { expenseCount, canDeactivate: true },
            `Category '${category.name}' is referenced by ${expenseCount} expense(s) and cannot be deleted. Please deactivate it instead to preserve historical records.`,
            false
        ));
    }

    await Category.findByIdAndDelete(category._id);

    return res.status(200).json(new ApiResponse(200, null, "Category deleted successfully"));
});

export {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory
};
