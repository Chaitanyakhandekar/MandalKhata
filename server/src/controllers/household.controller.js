import { Household } from "../models/household.model.js";
import { Donation } from "../models/donation.model.js";
import { BuildingConfig } from "../models/buildingConfig.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiUtils.js";
import { calculateResidentStatistics } from "../services/residentStats.service.js";
import { isFlatInRanges, describeRanges, normalizeConfigRanges } from "../utils/flatRanges.util.js";

const PHONE_REGEX = /^[0-9+\-\s]{7,15}$/;

const validateHouseholdInput = ({ building, wing, flatNumber, memberCount, phone }) => {
    if (building === undefined || building === null || Number(building) < 1 || !Number.isInteger(Number(building))) {
        return "Building number must be a valid number (1 or above)";
    }
    if (!wing || !wing.trim()) {
        return "Wing is required";
    }
    if (!/^[A-Z0-9]{1,5}$/.test(wing.trim().toUpperCase())) {
        return "Wing must be 1 to 5 letters or digits (e.g. A, B)";
    }
    if (flatNumber === undefined || flatNumber === null || Number(flatNumber) < 1 || !Number.isInteger(Number(flatNumber))) {
        return "Flat number must be a valid number (1 or above)";
    }
    if (memberCount !== undefined && memberCount !== null && (Number(memberCount) < 1 || !Number.isInteger(Number(memberCount)))) {
        return "Member count must be at least 1";
    }
    if (phone !== undefined && phone !== null && phone.trim() && !PHONE_REGEX.test(phone.trim())) {
        return "Phone number must be 7 to 15 digits (may include +, -, spaces)";
    }
    return null;
};

const validateFlatAgainstConfig = async (userId, building, wing, flatNumber) => {
    const config = await BuildingConfig.findOne({ createdBy: userId, building, wing });
    if (!config) {
        return null;
    }
    const ranges = normalizeConfigRanges(config);
    if (!isFlatInRanges(ranges, flatNumber)) {
        return `Flat ${flatNumber} is not part of the configured flats for Building ${building}, Wing ${wing} (configured ranges: ${describeRanges(ranges)}). Add this flat range to the wing configuration first.`;
    }
    return null;
};

const getHouseholds = asyncHandler(async (req, res) => {
    const { search, building, wing, active, page = 1, limit = 50 } = req.query;

    const query = { createdBy: req.user._id };

    if (search && search.trim()) {
        const regex = new RegExp(search.trim(), "i");
        const orConditions = [
            { headOfFamily: regex },
            { phone: regex }
        ];
        const numericSearch = Number(search.trim());
        if (!Number.isNaN(numericSearch)) {
            orConditions.push({ flatNumber: numericSearch }, { building: numericSearch });
        }
        query.$or = orConditions;
    }

    if (building !== undefined && building !== "") {
        query.building = Number(building);
    }

    if (wing && wing.trim()) {
        query.wing = wing.trim().toUpperCase();
    }

    if (active === "true") {
        query.active = true;
    } else if (active === "false") {
        query.active = false;
    }

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const skipIndex = (pageNum - 1) * limitNum;

    const households = await Household.find(query)
        .sort({ building: 1, wing: 1, flatNumber: 1 })
        .skip(skipIndex)
        .limit(limitNum);

    const total = await Household.countDocuments(query);

    return res.status(200).json(new ApiResponse(200, {
        households,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
    }, "Households fetched successfully"));
});

const getHouseholdOverview = asyncHandler(async (req, res) => {
    const statistics = await calculateResidentStatistics(req.user._id);
    return res.status(200).json(new ApiResponse(200, statistics, "Resident statistics computed successfully"));
});

const createHousehold = asyncHandler(async (req, res) => {
    const { building, wing, flatNumber, headOfFamily, phone, memberCount, note, active } = req.body;

    const validationError = validateHouseholdInput({ building, wing, flatNumber, memberCount, phone });
    if (validationError) {
        return res.status(400).json(new ApiResponse(400, null, validationError, false));
    }

    if (!headOfFamily || !headOfFamily.trim()) {
        return res.status(400).json(new ApiResponse(400, null, "Head of family name is required", false));
    }

    const buildingValue = Number(building);
    const wingValue = wing.trim().toUpperCase();
    const flatValue = Number(flatNumber);

    const configError = await validateFlatAgainstConfig(req.user._id, buildingValue, wingValue, flatValue);
    if (configError) {
        return res.status(400).json(new ApiResponse(400, null, configError, false));
    }

    const existingHousehold = await Household.findOne({
        createdBy: req.user._id,
        building: buildingValue,
        wing: wingValue,
        flatNumber: flatValue
    });

    if (existingHousehold) {
        if (existingHousehold.active) {
            return res.status(409).json(new ApiResponse(409, null, `Household already exists for Building ${buildingValue}, Wing ${wingValue}, Flat ${flatValue}`, false));
        }

        // Reactivate the previously deactivated household instead of duplicating the record
        existingHousehold.active = true;
        existingHousehold.headOfFamily = headOfFamily.trim();
        existingHousehold.phone = phone ? phone.trim() : "";
        existingHousehold.memberCount = memberCount !== undefined && memberCount !== null ? Number(memberCount) : existingHousehold.memberCount;
        existingHousehold.note = note ? note.trim() : existingHousehold.note;
        await existingHousehold.save();

        return res.status(200).json(new ApiResponse(200, existingHousehold, "Household reactivated successfully"));
    }

    const household = await Household.create({
        building: buildingValue,
        wing: wingValue,
        flatNumber: flatValue,
        headOfFamily: headOfFamily.trim(),
        phone: phone ? phone.trim() : "",
        memberCount: memberCount !== undefined && memberCount !== null ? Number(memberCount) : 1,
        note: note ? note.trim() : "",
        active: active === false ? false : true,
        createdBy: req.user._id
    });

    return res.status(201).json(new ApiResponse(201, household, "Household registered successfully"));
});

const updateHousehold = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { building, wing, flatNumber, headOfFamily, phone, memberCount, note, active } = req.body;

    const household = await Household.findOne({ _id: id, createdBy: req.user._id });
    if (!household) {
        return res.status(404).json(new ApiResponse(404, null, "Household not found", false));
    }

    const buildingValue = building !== undefined ? Number(building) : household.building;
    const wingValue = wing !== undefined ? wing.trim().toUpperCase() : household.wing;
    const flatValue = flatNumber !== undefined ? Number(flatNumber) : household.flatNumber;

    const validationError = validateHouseholdInput({ building: buildingValue, wing: wingValue, flatNumber: flatValue, memberCount, phone });
    if (validationError) {
        return res.status(400).json(new ApiResponse(400, null, validationError, false));
    }

    const configError = await validateFlatAgainstConfig(req.user._id, buildingValue, wingValue, flatValue);
    if (configError) {
        return res.status(400).json(new ApiResponse(400, null, configError, false));
    }

    // Duplicate check when the location changes (only against other active households)
    const locationChanged = buildingValue !== household.building || wingValue !== household.wing || flatValue !== household.flatNumber;
    if (locationChanged) {
        const duplicate = await Household.findOne({
            createdBy: req.user._id,
            building: buildingValue,
            wing: wingValue,
            flatNumber: flatValue,
            active: true,
            _id: { $ne: household._id }
        });
        if (duplicate) {
            return res.status(409).json(new ApiResponse(409, null, `Another active household already exists for Building ${buildingValue}, Wing ${wingValue}, Flat ${flatValue}`, false));
        }
    }

    const updateData = {
        building: buildingValue,
        wing: wingValue,
        flatNumber: flatValue,
        headOfFamily: headOfFamily !== undefined && headOfFamily.trim() ? headOfFamily.trim() : household.headOfFamily,
        phone: phone !== undefined ? (phone ? phone.trim() : "") : household.phone,
        memberCount: memberCount !== undefined && memberCount !== null ? Number(memberCount) : household.memberCount,
        note: note !== undefined ? note.trim() : household.note,
        active: active !== undefined ? !!active : household.active
    };

    const updatedHousehold = await Household.findByIdAndUpdate(id, { $set: updateData }, { new: true });

    return res.status(200).json(new ApiResponse(200, updatedHousehold, "Household updated successfully"));
});

const toggleHouseholdActive = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { active } = req.body;

    if (typeof active !== "boolean") {
        return res.status(400).json(new ApiResponse(400, null, "Active status must be a boolean", false));
    }

    const household = await Household.findOne({ _id: id, createdBy: req.user._id });
    if (!household) {
        return res.status(404).json(new ApiResponse(404, null, "Household not found", false));
    }

    if (active) {
        const duplicate = await Household.findOne({
            createdBy: req.user._id,
            building: household.building,
            wing: household.wing,
            flatNumber: household.flatNumber,
            active: true,
            _id: { $ne: household._id }
        });
        if (duplicate) {
            return res.status(409).json(new ApiResponse(409, null, "Another active household already occupies this flat", false));
        }
    }

    household.active = active;
    await household.save();

    return res.status(200).json(new ApiResponse(200, household, active ? "Household activated successfully" : "Household deactivated successfully"));
});

const deleteHousehold = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const household = await Household.findOne({ _id: id, createdBy: req.user._id });
    if (!household) {
        return res.status(404).json(new ApiResponse(404, null, "Household not found", false));
    }

    const hasDonations = await Donation.exists({ household: household._id });
    if (hasDonations) {
        return res.status(400).json(new ApiResponse(400, null, "This household has donation records. Deactivate it instead of deleting to keep financial records intact.", false));
    }

    await Household.findByIdAndDelete(id);

    return res.status(200).json(new ApiResponse(200, null, "Household deleted successfully"));
});

export {
    getHouseholds,
    getHouseholdOverview,
    createHousehold,
    updateHousehold,
    toggleHouseholdActive,
    deleteHousehold
};