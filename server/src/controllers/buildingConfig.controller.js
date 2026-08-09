import { BuildingConfig } from "../models/buildingConfig.model.js";
import { Household } from "../models/household.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiUtils.js";
import {
    isValidRange,
    getFlatCount,
    findOverlappingRanges,
    normalizeConfigRanges
} from "../utils/flatRanges.util.js";

const parseRanges = (body) => {
    if (Array.isArray(body.flatRanges) && body.flatRanges.length > 0) {
        return body.flatRanges.map((range) => ({
            start: Number(range.start),
            end: Number(range.end)
        }));
    }
    if (body.flatStart !== undefined && body.flatEnd !== undefined) {
        return [{ start: Number(body.flatStart), end: Number(body.flatEnd) }];
    }
    if (body.expectedFlats !== undefined && Number(body.expectedFlats) > 0) {
        return [{ start: 1, end: Number(body.expectedFlats) }];
    }
    return null;
};

const validateRangesInput = (ranges) => {
    if (!ranges || ranges.length === 0) {
        return "At least one flat range is required";
    }
    for (const range of ranges) {
        if (!isValidRange(range)) {
            return "Each flat range needs a valid start and end number with start ≤ end";
        }
    }
    const overlap = findOverlappingRanges(ranges);
    if (overlap) {
        return `Flat ranges must not overlap with each other (conflict between ${overlap})`;
    }
    return null;
};

const getBuildingConfigs = asyncHandler(async (req, res) => {
    const configs = await BuildingConfig.find({ createdBy: req.user._id })
        .sort({ building: 1, wing: 1 });

    const result = configs.map((config) => {
        // Lazily migrate legacy expectedFlats-only documents to flat ranges
        if (!config.flatRanges || config.flatRanges.length === 0) {
            config.flatRanges = [{ start: 1, end: config.expectedFlats || 1 }];
            config.save().catch(() => {});
        }
        return {
            ...config.toObject(),
            flatRanges: normalizeConfigRanges(config),
            expectedFlats: getFlatCount(normalizeConfigRanges(config))
        };
    });

    return res.status(200).json(new ApiResponse(200, result, "Building configurations fetched successfully"));
});

const createBuildingConfig = asyncHandler(async (req, res) => {
    const { building, wing } = req.body;

    if (building === undefined || Number(building) < 1 || !Number.isInteger(Number(building))) {
        return res.status(400).json(new ApiResponse(400, null, "Building number must be a valid number (1 or above)", false));
    }
    if (!wing || !wing.trim()) {
        return res.status(400).json(new ApiResponse(400, null, "Wing is required", false));
    }
    if (!/^[A-Z0-9]{1,5}$/.test(wing.trim().toUpperCase())) {
        return res.status(400).json(new ApiResponse(400, null, "Wing must be 1 to 5 letters or digits (e.g. A, B)", false));
    }

    const ranges = parseRanges(req.body);
    const rangeError = validateRangesInput(ranges);
    if (rangeError) {
        return res.status(400).json(new ApiResponse(400, null, rangeError, false));
    }

    const buildingValue = Number(building);
    const wingValue = wing.trim().toUpperCase();

    const duplicate = await BuildingConfig.findOne({
        createdBy: req.user._id,
        building: buildingValue,
        wing: wingValue
    });
    if (duplicate) {
        return res.status(409).json(new ApiResponse(409, null, `Configuration already exists for Building ${buildingValue}, Wing ${wingValue}. Edit it to add another range.`, false));
    }

    const config = await BuildingConfig.create({
        building: buildingValue,
        wing: wingValue,
        flatRanges: ranges,
        createdBy: req.user._id
    });

    return res.status(201).json(new ApiResponse(201, {
        ...config.toObject(),
        expectedFlats: getFlatCount(ranges)
    }, "Building configuration created successfully"));
});

const updateBuildingConfig = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { building, wing, confirmRemove } = req.body;

    const config = await BuildingConfig.findOne({ _id: id, createdBy: req.user._id });
    if (!config) {
        return res.status(404).json(new ApiResponse(404, null, "Building configuration not found", false));
    }

    if (building === undefined || Number(building) < 1 || !Number.isInteger(Number(building))) {
        return res.status(400).json(new ApiResponse(400, null, "Building number must be a valid number (1 or above)", false));
    }
    if (!wing || !wing.trim() || !/^[A-Z0-9]{1,5}$/.test(wing.trim().toUpperCase())) {
        return res.status(400).json(new ApiResponse(400, null, "Wing must be 1 to 5 letters or digits (e.g. A, B)", false));
    }

    const buildingValue = Number(building);
    const wingValue = wing.trim().toUpperCase();

    const duplicate = await BuildingConfig.findOne({
        createdBy: req.user._id,
        building: buildingValue,
        wing: wingValue,
        _id: { $ne: config._id }
    });
    if (duplicate) {
        return res.status(409).json(new ApiResponse(409, null, `Configuration already exists for Building ${buildingValue}, Wing ${wingValue}`, false));
    }

    const ranges = parseRanges(req.body);
    const rangeError = validateRangesInput(ranges);
    if (rangeError) {
        return res.status(400).json(new ApiResponse(400, null, rangeError, false));
    }

    const oldRanges = normalizeConfigRanges(config);
    const oldFlatNumbers = new Set();
    oldRanges.forEach((range) => {
        for (let i = range.start; i <= range.end; i++) oldFlatNumbers.add(i);
    });
    const newFlatNumbers = new Set();
    ranges.forEach((range) => {
        for (let i = range.start; i <= range.end; i++) newFlatNumbers.add(i);
    });

    // Flats that were configured but are no longer covered by the new ranges
    const removedFlats = [...oldFlatNumbers].filter((flat) => !newFlatNumbers.has(flat));

    if (removedFlats.length > 0) {
        const householdsOnRemoved = await Household.countDocuments({
            createdBy: req.user._id,
            building: buildingValue,
            wing: wingValue,
            flatNumber: { $in: removedFlats }
        });

        if (householdsOnRemoved > 0 && confirmRemove !== true) {
            return res.status(400).json(new ApiResponse(400, {
                removedFlats,
                householdsAffected: householdsOnRemoved
            }, `Removing flat numbers (${removedFlats.join(", ")}) that already have registered households. Household and donation records will be preserved but will no longer count under configured flats. Confirm to proceed.`, false));
        }
    }

    const updatedConfig = await BuildingConfig.findByIdAndUpdate(
        id,
        { $set: { building: buildingValue, wing: wingValue, flatRanges: ranges } },
        { new: true }
    );

    return res.status(200).json(new ApiResponse(200, {
        ...updatedConfig.toObject(),
        expectedFlats: getFlatCount(ranges)
    }, "Building configuration updated successfully"));
});

const deleteBuildingConfig = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const config = await BuildingConfig.findOne({ _id: id, createdBy: req.user._id });
    if (!config) {
        return res.status(404).json(new ApiResponse(404, null, "Building configuration not found", false));
    }

    const hasHouseholds = await Household.exists({ createdBy: req.user._id, building: config.building, wing: config.wing });
    if (hasHouseholds) {
        return res.status(400).json(new ApiResponse(400, null, `Households are already registered in Building ${config.building}, Wing ${config.wing}. Deactivate or move them before removing this configuration.`, false));
    }

    await BuildingConfig.findByIdAndDelete(id);

    return res.status(200).json(new ApiResponse(200, null, "Building configuration deleted successfully"));
});

export {
    getBuildingConfigs,
    createBuildingConfig,
    updateBuildingConfig,
    deleteBuildingConfig
};