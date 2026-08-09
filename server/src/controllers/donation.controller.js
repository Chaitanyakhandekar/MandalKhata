import { Donation } from "../models/donation.model.js";
import { FestivalYear } from "../models/festivalYear.model.js";
import { Household } from "../models/household.model.js";
import { ExternalDonor } from "../models/externalDonor.model.js";
import { BuildingConfig } from "../models/buildingConfig.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiUtils.js";
import { isFlatInRanges, describeRanges, normalizeConfigRanges } from "../utils/flatRanges.util.js";

const DONOR_TYPES = ["resident", "external"];
const DONOR_CATEGORIES = ["Individual", "Business", "Organization", "Shop", "Well-wisher"];
const PHONE_REGEX = /^[0-9+\-\s]{7,15}$/;

const getDonations = asyncHandler(async (req, res) => {
    const { festivalYear, search, paymentMethod, donorType, startDate, endDate, page = 1, limit = 50 } = req.query;

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

    // Keyword search (donorName or receiptNumber)
    if (search && search.trim()) {
        const regex = new RegExp(search.trim(), "i");
        query.$or = [
            { donorName: regex },
            { receiptNumber: regex },
            { phone: regex }
        ];
    }

    // Payment method filter
    if (paymentMethod && ["cash", "upi", "bank"].includes(paymentMethod)) {
        query.paymentMethod = paymentMethod;
    }

    // Donor type filter (resident / external)
    if (donorType && DONOR_TYPES.includes(donorType)) {
        query.donorType = donorType;
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

    const donations = await Donation.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skipIndex)
        .limit(limitNum)
        .populate("createdBy", "name username")
        .populate("household", "building wing flatNumber headOfFamily phone memberCount active")
        .populate("externalDonor", "donorName donorType organizationName active");

    const total = await Donation.countDocuments(query);

    const [amountAggregate] = await Donation.aggregate([
        { $match: query },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
    ]);

    const totalAmount = amountAggregate && amountAggregate.totalAmount != null ? amountAggregate.totalAmount : 0;

    return res.status(200).json(new ApiResponse(200, {
        donations,
        total,
        totalAmount,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
    }, "Donations fetched successfully"));
});

const createDonation = asyncHandler(async (req, res) => {
    const {
        donorName, amount, paymentMethod, phone, note, date, festivalYear,
        donorType, householdId, externalDonorId, donorCategory, organizationName, address,
        building, wing, flatNumber, headOfFamily, memberCount
    } = req.body;

    const resolvedDonorType = donorType || "external";
    if (!DONOR_TYPES.includes(resolvedDonorType)) {
        return res.status(400).json(new ApiResponse(400, null, "Donor type must be either 'resident' or 'external'", false));
    }

    const amountValue = Number(amount);
    if (amount === undefined || amount === null || Number.isNaN(amountValue) || amountValue < 0) {
        return res.status(400).json(new ApiResponse(400, null, "Valid donation amount is required", false));
    }

    let resolvedDonorName = donorName ? donorName.trim() : "";
    let resolvedHousehold = null;
    let resolvedExternalDonor = null;

    if (resolvedDonorType === "resident") {
        if (!householdId) {
            // Enter Manually & Assign Household path: build the household first if the flat is unregistered
            const buildingValue = Number(building);
            const flatValue = Number(flatNumber);
            const memberValue = Number(memberCount);

            if (building === undefined || building === null || !Number.isInteger(buildingValue) || buildingValue < 1) {
                return res.status(400).json(new ApiResponse(400, null, "Building number must be a valid number (1 or above)", false));
            }
            if (!wing || !wing.trim() || !/^[A-Z0-9]{1,5}$/.test(wing.trim().toUpperCase())) {
                return res.status(400).json(new ApiResponse(400, null, "Wing must be 1 to 5 letters or digits (e.g. A, B)", false));
            }
            if (flatNumber === undefined || flatNumber === null || !Number.isInteger(flatValue) || flatValue < 1) {
                return res.status(400).json(new ApiResponse(400, null, "Flat number must be a valid number (1 or above)", false));
            }
            if (!headOfFamily || !headOfFamily.trim()) {
                return res.status(400).json(new ApiResponse(400, null, "Occupant name is required for the new household", false));
            }
            if (memberCount !== undefined && memberCount !== null && (!Number.isInteger(memberValue) || memberValue < 1)) {
                return res.status(400).json(new ApiResponse(400, null, "Member count must be at least 1", false));
            }
            if (phone !== undefined && phone !== null && phone.trim() && !PHONE_REGEX.test(phone.trim())) {
                return res.status(400).json(new ApiResponse(400, null, "Phone number must be 7 to 15 digits (may include +, -, spaces)", false));
            }

            const wingValue = wing.trim().toUpperCase();

            const config = await BuildingConfig.findOne({ createdBy: req.user._id, building: buildingValue, wing: wingValue });
            if (!config) {
                return res.status(400).json(new ApiResponse(400, null, `No configuration found for Building ${buildingValue}, Wing ${wingValue}. Configure the building and wing first.`, false));
            }
            const wingRanges = normalizeConfigRanges(config);
            if (!isFlatInRanges(wingRanges, flatValue)) {
                return res.status(400).json(new ApiResponse(400, null, `Flat ${flatValue} is not part of the configured flats for Building ${buildingValue}, Wing ${wingValue} (configured ranges: ${describeRanges(wingRanges)}). Select a flat from the configured ranges or add this range to the wing configuration first.`, false));
            }

            const existingHousehold = await Household.findOne({
                createdBy: req.user._id,
                building: buildingValue,
                wing: wingValue,
                flatNumber: flatValue
            });

            if (existingHousehold) {
                if (existingHousehold.active) {
                    const conflictMessage = `A household already exists for Building ${buildingValue}, Wing ${wingValue}, Flat ${flatValue} (${existingHousehold.headOfFamily}). Use the existing household or update its occupant information before completing this donation.`;
                    return res.status(409).json(new ApiResponse(409, { household: existingHousehold }, conflictMessage, false));
                }

                // Reuse the previously deactivated household instead of duplicating the record
                existingHousehold.active = true;
                existingHousehold.headOfFamily = headOfFamily.trim();
                existingHousehold.phone = phone ? phone.trim() : existingHousehold.phone;
                existingHousehold.memberCount = Number.isInteger(memberValue) && memberValue >= 1 ? memberValue : existingHousehold.memberCount;
                await existingHousehold.save();

                resolvedHousehold = existingHousehold._id;
                resolvedDonorName = existingHousehold.headOfFamily;
            } else {
                let household;
                try {
                    household = await Household.create({
                        building: buildingValue,
                        wing: wingValue,
                        flatNumber: flatValue,
                        headOfFamily: headOfFamily.trim(),
                        phone: phone ? phone.trim() : "",
                        memberCount: Number.isInteger(memberValue) && memberValue >= 1 ? memberValue : 1,
                        active: true,
                        createdBy: req.user._id
                    });
                } catch (error) {
                    if (error.code === 11000) {
                        const raceHousehold = await Household.findOne({
                            createdBy: req.user._id,
                            building: buildingValue,
                            wing: wingValue,
                            flatNumber: flatValue,
                            active: true
                        });
                        if (raceHousehold) {
                            const conflictMessage = `A household already exists for Building ${buildingValue}, Wing ${wingValue}, Flat ${flatValue} (${raceHousehold.headOfFamily}). Use the existing household or update its occupant information before completing this donation.`;
                            return res.status(409).json(new ApiResponse(409, { household: raceHousehold }, conflictMessage, false));
                        }
                    }
                    throw error;
                }

                resolvedHousehold = household._id;
                resolvedDonorName = household.headOfFamily;
            }
        } else {
            const household = await Household.findOne({ _id: householdId, createdBy: req.user._id });
            if (!household) {
                return res.status(400).json(new ApiResponse(400, null, "Selected household not found", false));
            }
            if (!household.active) {
                return res.status(400).json(new ApiResponse(400, null, "Selected household is currently inactive. Activate it to record donations.", false));
            }
            resolvedDonorName = household.headOfFamily;
            resolvedHousehold = household._id;
        }
    } else {
        if (!resolvedDonorName) {
            return res.status(400).json(new ApiResponse(400, null, "Donor name is required", false));
        }

        if (externalDonorId) {
            const donor = await ExternalDonor.findOne({ _id: externalDonorId, createdBy: req.user._id });
            if (!donor) {
                return res.status(400).json(new ApiResponse(400, null, "Selected external donor not found", false));
            }
            if (!donor.active) {
                return res.status(400).json(new ApiResponse(400, null, "Selected external donor is currently inactive. Activate it to record donations.", false));
            }
            resolvedExternalDonor = donor._id;
            resolvedDonorName = donor.donorName;
        } else {
            // Link to an existing matching active donor, otherwise create a new external donor record
            let donor = await ExternalDonor.findOne({ createdBy: req.user._id, donorName: resolvedDonorName, active: true });
            if (!donor) {
                donor = await ExternalDonor.create({
                    donorName: resolvedDonorName,
                    donorType: donorCategory && DONOR_CATEGORIES.includes(donorCategory) ? donorCategory : "Individual",
                    organizationName: organizationName ? organizationName.trim() : "",
                    phone: phone ? phone.trim() : "",
                    address: address ? address.trim() : "",
                    active: true,
                    createdBy: req.user._id
                });
            }
            resolvedExternalDonor = donor._id;
        }
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

    // Auto-generate sequential receipt number (retried on duplicate-key collisions)
    let count = await Donation.countDocuments({ festivalYear: targetYear, createdBy: req.user._id });
    let receiptNumber;
    let donation;
    let isSaved = false;

    while (!isSaved) {
        count++;
        receiptNumber = `MK-${targetYear}-${String(count).padStart(4, '0')}`;
        try {
            donation = await Donation.create({
                donorName: resolvedDonorName,
                amount: amountValue,
                paymentMethod: paymentMethod || "cash",
                phone: phone ? phone.trim() : "",
                note: note ? note.trim() : "",
                date: date ? new Date(date) : new Date(),
                donorType: resolvedDonorType,
                household: resolvedHousehold,
                externalDonor: resolvedExternalDonor,
                receiptNumber,
                festivalYear: targetYear,
                createdBy: req.user._id
            });
            isSaved = true;
        } catch (error) {
            if (error.code === 11000 && error.keyPattern && error.keyPattern.receiptNumber) {
                continue;
            }
            throw error;
        }
    }

    const populatedDonation = await Donation.findById(donation._id)
        .populate("createdBy", "name username")
        .populate("household", "building wing flatNumber headOfFamily")
        .populate("externalDonor", "donorName donorType organizationName");

    return res.status(201).json(new ApiResponse(201, populatedDonation, "Donation recorded successfully"));
});

const updateDonation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { donorName, amount, paymentMethod, phone, note, date, donorType, householdId, externalDonorId, donorCategory, organizationName, address } = req.body;

    const donation = await Donation.findById(id);
    if (!donation) {
        return res.status(404).json(new ApiResponse(404, null, "Donation not found", false));
    }

    if (donation.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json(new ApiResponse(403, null, "You can only update your own donations", false));
    }

    const updateData = {};

    // Handle donor type transitions
    if (donorType !== undefined && donation.donorType !== donorType) {
        if (!DONOR_TYPES.includes(donorType)) {
            return res.status(400).json(new ApiResponse(400, null, "Donor type must be either 'resident' or 'external'", false));
        }
        updateData.donorType = donorType;

        if (donorType === "resident") {
            const household = await Household.findOne({ _id: householdId, createdBy: req.user._id });
            if (!household || !household.active) {
                return res.status(400).json(new ApiResponse(400, null, "Please select a valid active resident household", false));
            }
            updateData.household = household._id;
            updateData.externalDonor = null;
            updateData.donorName = household.headOfFamily;
        } else {
            updateData.household = null;
            updateData.externalDonor = null;
            if (externalDonorId) {
                const donor = await ExternalDonor.findOne({ _id: externalDonorId, createdBy: req.user._id });
                if (!donor || !donor.active) {
                    return res.status(400).json(new ApiResponse(400, null, "Please select a valid active external donor", false));
                }
                updateData.externalDonor = donor._id;
                updateData.donorName = donor.donorName;
            } else if (donorName !== undefined && donorName.trim()) {
                updateData.donorName = donorName.trim();
            }
        }
    } else if (donation.donorType === "external" && externalDonorId !== undefined) {
        // Re-link to a different existing external donor
        if (externalDonorId) {
            const donor = await ExternalDonor.findOne({ _id: externalDonorId, createdBy: req.user._id });
            if (!donor || !donor.active) {
                return res.status(400).json(new ApiResponse(400, null, "Please select a valid active external donor", false));
            }
            updateData.externalDonor = donor._id;
            updateData.donorName = donor.donorName;
        } else {
            updateData.externalDonor = null;
        }
    } else if (donation.donorType === "resident" && householdId !== undefined) {
        // Re-link the existing resident donation to a different household
        const household = await Household.findOne({ _id: householdId, createdBy: req.user._id });
        if (!household || !household.active) {
            return res.status(400).json(new ApiResponse(400, null, "Please select a valid active resident household", false));
        }
        updateData.household = household._id;
        updateData.donorName = household.headOfFamily;
    }

    if (donation.donorType !== "resident" && donorType !== "resident" && donorName !== undefined && donorName.trim()) {
        updateData.donorName = donorName.trim();
    }
    if (amount !== undefined) {
        const amountValue = Number(amount);
        if (Number.isNaN(amountValue) || amountValue < 0) {
            return res.status(400).json(new ApiResponse(400, null, "Amount cannot be negative", false));
        }
        updateData.amount = amountValue;
    }
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (phone !== undefined) updateData.phone = phone.trim();
    if (note !== undefined) updateData.note = note.trim();
    if (date !== undefined) updateData.date = new Date(date);

    const updatedDonation = await Donation.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
    )
        .populate("createdBy", "name username")
        .populate("household", "building wing flatNumber headOfFamily")
        .populate("externalDonor", "donorName donorType organizationName");

    return res.status(200).json(new ApiResponse(200, updatedDonation, "Donation updated successfully"));
});

const deleteDonation = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const donation = await Donation.findById(id);
    if (!donation) {
        return res.status(404).json(new ApiResponse(404, null, "Donation not found", false));
    }

    if (donation.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json(new ApiResponse(403, null, "You can only delete your own donations", false));
    }

    await Donation.findByIdAndDelete(id);

    return res.status(200).json(new ApiResponse(200, null, "Donation deleted successfully"));
});

export {
    getDonations,
    createDonation,
    updateDonation,
    deleteDonation
};