import { BuildingConfig } from "../models/buildingConfig.model.js";
import { Household } from "../models/household.model.js";
import { Donation } from "../models/donation.model.js";
import { FestivalYear } from "../models/festivalYear.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiUtils.js";
import {
    isValidRange,
    getFlatCount,
    getFlatNumbers,
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
    }, "Building configuration saved successfully"));
});

const updateBuildingConfig = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { building, wing, confirmRemove } = req.body;

    const config = await BuildingConfig.findOne({ _id: id, createdBy: req.user._id });
    if (!config) {
        return res.status(404).json(new ApiResponse(404, null, "Building configuration not found", false));
    }

    const buildingValue = building !== undefined ? Number(building) : config.building;
    const wingValue = wing !== undefined ? wing.trim().toUpperCase() : config.wing;

    if (buildingValue < 1 || !Number.isInteger(buildingValue)) {
        return res.status(400).json(new ApiResponse(400, null, "Building number must be a valid number (1 or above)", false));
    }
    if (!wingValue || !/^[A-Z0-9]{1,5}$/.test(wingValue)) {
        return res.status(400).json(new ApiResponse(400, null, "Wing must be 1 to 5 letters or digits (e.g. A, B)", false));
    }

    // If changing building/wing identifiers, check uniqueness
    if (buildingValue !== config.building || wingValue !== config.wing) {
        const duplicate = await BuildingConfig.findOne({
            createdBy: req.user._id,
            building: buildingValue,
            wing: wingValue,
            _id: { $ne: id }
        });
        if (duplicate) {
            return res.status(409).json(new ApiResponse(409, null, `Configuration already exists for Building ${buildingValue}, Wing ${wingValue}`, false));
        }
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

/**
 * Returns building-wise and wing-wise flats matrix with registered occupant names,
 * donation status (paid / unpaid in target festival year), paid amounts, and receipts.
 */
const getFlatsDonationStatus = asyncHandler(async (req, res) => {
    const { festivalYear, building, wing } = req.query;
    const userId = req.user._id;

    // 1. Resolve Target Festival Year
    let targetYear = festivalYear;
    if (!targetYear) {
        const activeYear = await FestivalYear.findOne({ isActive: true, createdBy: userId });
        if (activeYear) {
            targetYear = activeYear.year;
        }
    }

    // 2. Fetch Building Configs, Active Households, and Resident Donations
    const configQuery = { createdBy: userId };
    if (building !== undefined && building !== "" && !isNaN(Number(building))) {
        configQuery.building = Number(building);
    }
    if (wing && wing.trim()) {
        configQuery.wing = wing.trim().toUpperCase();
    }

    const [configs, households, donations] = await Promise.all([
        BuildingConfig.find(configQuery).sort({ building: 1, wing: 1 }).lean(),
        Household.find({ createdBy: userId, active: true }).sort({ building: 1, wing: 1, flatNumber: 1 }).lean(),
        Donation.find({
            createdBy: userId,
            donorType: "resident",
            ...(targetYear ? { festivalYear: targetYear } : {})
        }).sort({ date: -1 }).lean()
    ]);

    // Map active households by "building-wing-flatNumber" and by "_id"
    const householdMap = new Map();
    const householdIdMap = new Map();
    households.forEach((h) => {
        const key = `${h.building}-${h.wing}-${h.flatNumber}`;
        householdMap.set(key, h);
        householdIdMap.set(String(h._id), h);
    });

    // Map donations by householdId and by "building-wing-flatNumber"
    const donationMap = new Map();
    donations.forEach((d) => {
        let key = null;
        if (d.household) {
            const hId = String(d.household);
            const h = householdIdMap.get(hId);
            if (h) {
                key = `${h.building}-${h.wing}-${h.flatNumber}`;
            }
        }
        if (!key && d.building && d.wing && d.flatNumber) {
            key = `${d.building}-${d.wing}-${d.flatNumber}`;
        }
        if (key) {
            if (!donationMap.has(key)) {
                donationMap.set(key, []);
            }
            donationMap.get(key).push({
                _id: d._id,
                receiptNumber: d.receiptNumber,
                amount: d.amount,
                paymentMethod: d.paymentMethod,
                date: d.date,
                note: d.note || ""
            });
        }
    });

    // 3. Assemble Building and Wing Matrix
    let overallFlats = 0;
    let overallRegistered = 0;
    let overallUnregistered = 0;
    let overallPaid = 0;
    let overallUnpaid = 0;
    let overallAmount = 0;

    const buildingGroups = new Map();

    configs.forEach((cfg) => {
        const bNum = cfg.building;
        const wStr = cfg.wing;
        const flatList = getFlatNumbers(normalizeConfigRanges(cfg));

        if (!buildingGroups.has(bNum)) {
            buildingGroups.set(bNum, {
                building: bNum,
                summary: {
                    totalFlats: 0,
                    registeredFlats: 0,
                    unregisteredFlats: 0,
                    paidFlats: 0,
                    unpaidFlats: 0,
                    totalDonationAmount: 0,
                    paidPercentage: 0
                },
                wings: []
            });
        }

        const bGroup = buildingGroups.get(bNum);

        let wingFlats = 0;
        let wingRegistered = 0;
        let wingUnregistered = 0;
        let wingPaid = 0;
        let wingUnpaid = 0;
        let wingAmount = 0;

        const flatStatusList = flatList.map((flatNum) => {
            const key = `${bNum}-${wStr}-${flatNum}`;
            const household = householdMap.get(key) || null;
            const flatDonations = donationMap.get(key) || [];
            const totalPaid = flatDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
            const isPaid = totalPaid > 0;
            const isRegistered = !!household;

            wingFlats++;
            if (isRegistered) {
                wingRegistered++;
            } else {
                wingUnregistered++;
            }

            if (isPaid) {
                wingPaid++;
                wingAmount += totalPaid;
            } else {
                wingUnpaid++;
            }

            return {
                building: bNum,
                wing: wStr,
                flatNumber: flatNum,
                floor: Math.floor(flatNum / 100) || 1,
                isRegistered,
                householdId: household ? household._id : null,
                occupantName: household ? household.headOfFamily : null,
                phone: household ? household.phone : null,
                memberCount: household ? household.memberCount : null,
                isPaid,
                totalPaid,
                donations: flatDonations
            };
        });

        // Include any registered households outside the configured ranges
        households
            .filter((h) => h.building === bNum && h.wing === wStr && !flatList.includes(h.flatNumber))
            .forEach((extraH) => {
                const key = `${bNum}-${wStr}-${extraH.flatNumber}`;
                const flatDonations = donationMap.get(key) || [];
                const totalPaid = flatDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
                const isPaid = totalPaid > 0;

                wingFlats++;
                wingRegistered++;
                if (isPaid) {
                    wingPaid++;
                    wingAmount += totalPaid;
                } else {
                    wingUnpaid++;
                }

                flatStatusList.push({
                    building: bNum,
                    wing: wStr,
                    flatNumber: extraH.flatNumber,
                    floor: Math.floor(extraH.flatNumber / 100) || 1,
                    isRegistered: true,
                    householdId: extraH._id,
                    occupantName: extraH.headOfFamily,
                    phone: extraH.phone,
                    memberCount: extraH.memberCount,
                    isPaid,
                    totalPaid,
                    donations: flatDonations
                });
            });

        // Sort flats by flat number
        flatStatusList.sort((a, b) => a.flatNumber - b.flatNumber);

        const wingSummary = {
            totalFlats: wingFlats,
            registeredFlats: wingRegistered,
            unregisteredFlats: wingUnregistered,
            paidFlats: wingPaid,
            unpaidFlats: wingUnpaid,
            totalDonationAmount: wingAmount,
            paidPercentage: wingFlats > 0 ? Math.round((wingPaid / wingFlats) * 100) : 0
        };

        bGroup.summary.totalFlats += wingFlats;
        bGroup.summary.registeredFlats += wingRegistered;
        bGroup.summary.unregisteredFlats += wingUnregistered;
        bGroup.summary.paidFlats += wingPaid;
        bGroup.summary.unpaidFlats += wingUnpaid;
        bGroup.summary.totalDonationAmount += wingAmount;

        bGroup.wings.push({
            wing: wStr,
            summary: wingSummary,
            flats: flatStatusList
        });

        overallFlats += wingFlats;
        overallRegistered += wingRegistered;
        overallUnregistered += wingUnregistered;
        overallPaid += wingPaid;
        overallUnpaid += wingUnpaid;
        overallAmount += wingAmount;
    });

    const buildingsList = [...buildingGroups.values()].map((b) => ({
        ...b,
        summary: {
            ...b.summary,
            paidPercentage: b.summary.totalFlats > 0 ? Math.round((b.summary.paidFlats / b.summary.totalFlats) * 100) : 0
        }
    }));

    return res.status(200).json(new ApiResponse(200, {
        festivalYear: targetYear,
        summary: {
            totalBuildings: buildingsList.length,
            totalWings: configs.length,
            totalFlats: overallFlats,
            totalRegisteredFlats: overallRegistered,
            totalUnregisteredFlats: overallUnregistered,
            totalPaidFlats: overallPaid,
            totalUnpaidFlats: overallUnpaid,
            totalDonationAmount: overallAmount,
            paidPercentage: overallFlats > 0 ? Math.round((overallPaid / overallFlats) * 100) : 0
        },
        buildings: buildingsList
    }, "Flats donation status fetched successfully"));
});

export {
    getBuildingConfigs,
    createBuildingConfig,
    updateBuildingConfig,
    deleteBuildingConfig,
    getFlatsDonationStatus
};