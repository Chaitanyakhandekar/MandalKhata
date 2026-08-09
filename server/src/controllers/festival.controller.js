import { FestivalYear } from "../models/festivalYear.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiUtils.js";

const getFestivalYears = asyncHandler(async (req, res) => {
    const years = await FestivalYear.find({ createdBy: req.user._id }).sort({ year: -1 });
    return res.status(200).json(new ApiResponse(200, years, "Festival years fetched successfully"));
});

const createFestivalYear = asyncHandler(async (req, res) => {
    const { year, isActive } = req.body;

    if (!year || !year.trim()) {
        return res.status(400).json(new ApiResponse(400, null, "Year is required", false));
    }

    const trimmedYear = year.trim();

    const existedYear = await FestivalYear.findOne({ year: trimmedYear, createdBy: req.user._id });
    if (existedYear) {
        return res.status(409).json(new ApiResponse(409, null, "Festival year already exists", false));
    }

    const totalCount = await FestivalYear.countDocuments({ createdBy: req.user._id });
    const activeStatus = totalCount === 0 ? true : !!isActive;

    const festivalYear = await FestivalYear.create({
        year: trimmedYear,
        isActive: activeStatus,
        createdBy: req.user._id
    });

    if (activeStatus) {
        await FestivalYear.updateMany(
            { createdBy: req.user._id, _id: { $ne: festivalYear._id } },
            { $set: { isActive: false } }
        );
    }

    return res.status(201).json(new ApiResponse(201, festivalYear, "Festival year created successfully"));
});

const setActiveFestivalYear = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const targetYear = await FestivalYear.findOne({ _id: id, createdBy: req.user._id });
    if (!targetYear) {
        return res.status(404).json(new ApiResponse(404, null, "Festival year not found", false));
    }

    await FestivalYear.updateMany(
        { createdBy: req.user._id, _id: { $ne: id } },
        { $set: { isActive: false } }
    );

    targetYear.isActive = true;
    await targetYear.save();

    const allYears = await FestivalYear.find({ createdBy: req.user._id }).sort({ year: -1 });

    return res.status(200).json(new ApiResponse(200, allYears, `Active year set to ${targetYear.year} successfully`));
});

const deleteFestivalYear = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const yearToDelete = await FestivalYear.findOne({ _id: id, createdBy: req.user._id });
    if (!yearToDelete) {
        return res.status(404).json(new ApiResponse(404, null, "Festival year not found", false));
    }

    if (yearToDelete.isActive) {
        return res.status(400).json(new ApiResponse(400, null, "Active festival year cannot be deleted", false));
    }

    await FestivalYear.findByIdAndDelete(id);

    return res.status(200).json(new ApiResponse(200, null, "Festival year deleted successfully"));
});

export {
    getFestivalYears,
    createFestivalYear,
    setActiveFestivalYear,
    deleteFestivalYear
};