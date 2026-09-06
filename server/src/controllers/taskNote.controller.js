import { Task } from "../models/task.model.js";
import { ShoppingItem } from "../models/shoppingItem.model.js";
import { Note } from "../models/note.model.js";
import { FestivalYear } from "../models/festivalYear.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse, ApiError } from "../utils/apiUtils.js";

// Helper to resolve festival year from query/body or fallback to active year
const resolveFestivalYear = async (providedYear, userId) => {
    if (providedYear && typeof providedYear === "string" && providedYear.trim() !== "") {
        return providedYear.trim();
    }
    const activeYearDoc = await FestivalYear.findOne({ isActive: true, createdBy: userId });
    return activeYearDoc ? activeYearDoc.year : null;
};

// ==================== DASHBOARD / SUMMARY ====================
export const getTaskNoteSummary = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const festivalYear = await resolveFestivalYear(req.query.festivalYear, userId);

    if (!festivalYear) {
        return res.status(200).json(
            new ApiResponse(200, {
                festivalYear: null,
                pendingTasks: 0,
                completedTasks: 0,
                overdueTasks: 0,
                pendingShopping: 0,
                purchasedShopping: 0,
                totalNotes: 0,
            }, "No active festival year found")
        );
    }

    const now = new Date();

    const [
        pendingTasks,
        completedTasks,
        overdueTasks,
        pendingShopping,
        purchasedShopping,
        totalNotes,
    ] = await Promise.all([
        Task.countDocuments({ createdBy: userId, festivalYear, isCompleted: false }),
        Task.countDocuments({ createdBy: userId, festivalYear, isCompleted: true }),
        Task.countDocuments({
            createdBy: userId,
            festivalYear,
            isCompleted: false,
            dueDate: { $ne: null, $lt: now },
        }),
        ShoppingItem.countDocuments({ createdBy: userId, festivalYear, isPurchased: false }),
        ShoppingItem.countDocuments({ createdBy: userId, festivalYear, isPurchased: true }),
        Note.countDocuments({ createdBy: userId, festivalYear }),
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            festivalYear,
            pendingTasks,
            completedTasks,
            overdueTasks,
            pendingShopping,
            purchasedShopping,
            totalNotes,
        }, "Tasks & Notes summary fetched successfully")
    );
});

// ==================== TASKS CONTROLLERS ====================
export const getTasks = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { status, search } = req.query;
    const festivalYear = await resolveFestivalYear(req.query.festivalYear, userId);

    if (!festivalYear) {
        return res.status(200).json(new ApiResponse(200, [], "No active festival year"));
    }

    const filter = { createdBy: userId, festivalYear };

    if (status === "pending") {
        filter.isCompleted = false;
    } else if (status === "completed") {
        filter.isCompleted = true;
    }

    if (search && search.trim()) {
        const regex = new RegExp(search.trim(), "i");
        filter.$or = [{ title: regex }, { description: regex }];
    }

    // Sort order: Incomplete first, then due date ascending (nulls last), then priority/created
    const tasks = await Task.find(filter).sort({
        isCompleted: 1,
        dueDate: 1,
        createdAt: -1,
    });

    return res.status(200).json(new ApiResponse(200, tasks, "Tasks fetched successfully"));
});

export const createTask = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { title, description, priority, dueDate, festivalYear: bodyYear } = req.body;

    if (!title || !title.trim()) {
        throw new ApiError(400, "Task title is required");
    }

    const festivalYear = await resolveFestivalYear(bodyYear, userId);
    if (!festivalYear) {
        throw new ApiError(400, "No active festival year found. Please create one first.");
    }

    const validPriority = ["low", "medium", "high"].includes(priority) ? priority : "medium";

    const task = await Task.create({
        title: title.trim(),
        description: description ? description.trim() : "",
        priority: validPriority,
        dueDate: dueDate ? new Date(dueDate) : null,
        festivalYear,
        createdBy: userId,
    });

    return res.status(201).json(new ApiResponse(201, task, "Task created successfully"));
});

export const updateTask = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;
    const { title, description, priority, dueDate } = req.body;

    const task = await Task.findOne({ _id: id, createdBy: userId });
    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    if (title !== undefined) {
        if (!title.trim()) throw new ApiError(400, "Task title cannot be empty");
        task.title = title.trim();
    }
    if (description !== undefined) {
        task.description = description.trim();
    }
    if (priority !== undefined) {
        if (["low", "medium", "high"].includes(priority)) {
            task.priority = priority;
        }
    }
    if (dueDate !== undefined) {
        task.dueDate = dueDate ? new Date(dueDate) : null;
    }

    await task.save();

    return res.status(200).json(new ApiResponse(200, task, "Task updated successfully"));
});

export const toggleTaskComplete = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;

    const task = await Task.findOne({ _id: id, createdBy: userId });
    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    task.isCompleted = !task.isCompleted;
    task.completedAt = task.isCompleted ? new Date() : null;
    await task.save();

    return res.status(200).json(
        new ApiResponse(200, task, `Task marked as ${task.isCompleted ? "completed" : "pending"}`)
    );
});

export const deleteTask = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;

    const task = await Task.findOneAndDelete({ _id: id, createdBy: userId });
    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    return res.status(200).json(new ApiResponse(200, null, "Task deleted successfully"));
});

// ==================== SHOPPING ITEM CONTROLLERS ====================
export const getShoppingItems = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { status, search } = req.query;
    const festivalYear = await resolveFestivalYear(req.query.festivalYear, userId);

    if (!festivalYear) {
        return res.status(200).json(new ApiResponse(200, [], "No active festival year"));
    }

    const filter = { createdBy: userId, festivalYear };

    if (status === "pending") {
        filter.isPurchased = false;
    } else if (status === "purchased") {
        filter.isPurchased = true;
    }

    if (search && search.trim()) {
        const regex = new RegExp(search.trim(), "i");
        filter.$or = [{ itemName: regex }, { note: regex }];
    }

    const items = await ShoppingItem.find(filter).sort({
        isPurchased: 1,
        createdAt: -1,
    });

    return res.status(200).json(new ApiResponse(200, items, "Shopping items fetched successfully"));
});

export const createShoppingItem = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { itemName, quantity, unit, note, festivalYear: bodyYear } = req.body;

    if (!itemName || !itemName.trim()) {
        throw new ApiError(400, "Item name is required");
    }

    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
        throw new ApiError(400, "Quantity must be a positive number");
    }

    const festivalYear = await resolveFestivalYear(bodyYear, userId);
    if (!festivalYear) {
        throw new ApiError(400, "No active festival year found. Please create one first.");
    }

    const validUnits = [
        "kg",
        "g",
        "litre",
        "ml",
        "pieces",
        "packets",
        "boxes",
        "dozen",
        "cans",
        "bundle",
        "other",
    ];
    const itemUnit = validUnits.includes(unit) ? unit : "pieces";

    const item = await ShoppingItem.create({
        itemName: itemName.trim(),
        quantity: parsedQty,
        unit: itemUnit,
        note: note ? note.trim() : "",
        festivalYear,
        createdBy: userId,
    });

    return res.status(201).json(new ApiResponse(201, item, "Shopping item created successfully"));
});

export const updateShoppingItem = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;
    const { itemName, quantity, unit, note } = req.body;

    const item = await ShoppingItem.findOne({ _id: id, createdBy: userId });
    if (!item) {
        throw new ApiError(404, "Shopping item not found");
    }

    if (itemName !== undefined) {
        if (!itemName.trim()) throw new ApiError(400, "Item name cannot be empty");
        item.itemName = itemName.trim();
    }
    if (quantity !== undefined) {
        const parsedQty = parseFloat(quantity);
        if (isNaN(parsedQty) || parsedQty <= 0) {
            throw new ApiError(400, "Quantity must be a positive number");
        }
        item.quantity = parsedQty;
    }
    if (unit !== undefined) {
        const validUnits = [
            "kg",
            "g",
            "litre",
            "ml",
            "pieces",
            "packets",
            "boxes",
            "dozen",
            "cans",
            "bundle",
            "other",
        ];
        if (validUnits.includes(unit)) {
            item.unit = unit;
        }
    }
    if (note !== undefined) {
        item.note = note.trim();
    }

    await item.save();

    return res.status(200).json(new ApiResponse(200, item, "Shopping item updated successfully"));
});

export const toggleShoppingItemPurchased = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;

    const item = await ShoppingItem.findOne({ _id: id, createdBy: userId });
    if (!item) {
        throw new ApiError(404, "Shopping item not found");
    }

    item.isPurchased = !item.isPurchased;
    item.purchasedAt = item.isPurchased ? new Date() : null;
    await item.save();

    return res.status(200).json(
        new ApiResponse(200, item, `Item marked as ${item.isPurchased ? "purchased" : "pending"}`)
    );
});

export const deleteShoppingItem = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;

    const item = await ShoppingItem.findOneAndDelete({ _id: id, createdBy: userId });
    if (!item) {
        throw new ApiError(404, "Shopping item not found");
    }

    return res.status(200).json(new ApiResponse(200, null, "Shopping item deleted successfully"));
});

// ==================== NOTES CONTROLLERS ====================
export const getNotes = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { search } = req.query;
    const festivalYear = await resolveFestivalYear(req.query.festivalYear, userId);

    if (!festivalYear) {
        return res.status(200).json(new ApiResponse(200, [], "No active festival year"));
    }

    const filter = { createdBy: userId, festivalYear };

    if (search && search.trim()) {
        const regex = new RegExp(search.trim(), "i");
        filter.$or = [{ title: regex }, { content: regex }];
    }

    const notes = await Note.find(filter).sort({ createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, notes, "Notes fetched successfully"));
});

export const createNote = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { title, content, reminderDate, festivalYear: bodyYear } = req.body;

    if (!title || !title.trim()) {
        throw new ApiError(400, "Note title is required");
    }
    if (!content || !content.trim()) {
        throw new ApiError(400, "Note content is required");
    }

    const festivalYear = await resolveFestivalYear(bodyYear, userId);
    if (!festivalYear) {
        throw new ApiError(400, "No active festival year found. Please create one first.");
    }

    const note = await Note.create({
        title: title.trim(),
        content: content.trim(),
        reminderDate: reminderDate ? new Date(reminderDate) : null,
        festivalYear,
        createdBy: userId,
    });

    return res.status(201).json(new ApiResponse(201, note, "Note created successfully"));
});

export const updateNote = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;
    const { title, content, reminderDate } = req.body;

    const note = await Note.findOne({ _id: id, createdBy: userId });
    if (!note) {
        throw new ApiError(404, "Note not found");
    }

    if (title !== undefined) {
        if (!title.trim()) throw new ApiError(400, "Note title cannot be empty");
        note.title = title.trim();
    }
    if (content !== undefined) {
        if (!content.trim()) throw new ApiError(400, "Note content cannot be empty");
        note.content = content.trim();
    }
    if (reminderDate !== undefined) {
        note.reminderDate = reminderDate ? new Date(reminderDate) : null;
    }

    await note.save();

    return res.status(200).json(new ApiResponse(200, note, "Note updated successfully"));
});

export const deleteNote = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;

    const note = await Note.findOneAndDelete({ _id: id, createdBy: userId });
    if (!note) {
        throw new ApiError(404, "Note not found");
    }

    return res.status(200).json(new ApiResponse(200, null, "Note deleted successfully"));
});
