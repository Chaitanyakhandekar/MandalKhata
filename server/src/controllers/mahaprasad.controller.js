import { Mahaprasad } from "../models/mahaprasad.model.js";
import { FestivalYear } from "../models/festivalYear.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiUtils.js";
import { getMahaprasadPlanning } from "../services/residentStats.service.js";

const getMahaprasad = asyncHandler(async (req, res) => {
    const { festivalYear } = req.query;
    const userId = req.user._id;

    let targetYear = festivalYear;
    if (!targetYear) {
        const activeYear = await FestivalYear.findOne({ isActive: true, createdBy: userId });
        if (!activeYear) {
            return res.status(200).json(new ApiResponse(200, {
                festivalYear: null,
                expectedAttendancePercentage: 80,
                safetyBufferPercentage: 10,
                note: "",
                registeredHouseholds: 0,
                totalPeople: 0,
                expectedAttendance: 0,
                recommendedMeals: 0,
                externalDonorsExcluded: true
            }, "No active festival year found. Returned empty Mahaprasad planning."));
        }
        targetYear = activeYear.year;
    }

    const planning = await getMahaprasadPlanning(userId, targetYear);

    return res.status(200).json(new ApiResponse(200, planning, "Mahaprasad planning fetched successfully"));
});

const updateMahaprasad = asyncHandler(async (req, res) => {
    const { festivalYear, expectedAttendancePercentage, safetyBufferPercentage, note } = req.body;
    const userId = req.user._id;

    let targetYear = festivalYear;
    if (!targetYear) {
        const activeYear = await FestivalYear.findOne({ isActive: true, createdBy: userId });
        if (!activeYear) {
            return res.status(400).json(new ApiResponse(400, null, "No active festival year found. Please create a year first.", false));
        }
        targetYear = activeYear.year;
    }

    const attendanceValue = Number(expectedAttendancePercentage);
    if (expectedAttendancePercentage === undefined || expectedAttendancePercentage === null || Number.isNaN(attendanceValue) || attendanceValue < 0 || attendanceValue > 100) {
        return res.status(400).json(new ApiResponse(400, null, "Expected attendance percentage must be between 0 and 100", false));
    }

    const bufferValue = Number(safetyBufferPercentage);
    if (safetyBufferPercentage === undefined || safetyBufferPercentage === null || Number.isNaN(bufferValue) || bufferValue < 0 || bufferValue > 100) {
        return res.status(400).json(new ApiResponse(400, null, "Safety buffer percentage must be between 0 and 100", false));
    }

    const config = await Mahaprasad.findOneAndUpdate(
        { createdBy: userId, festivalYear: targetYear },
        {
            $set: {
                expectedAttendancePercentage: attendanceValue,
                safetyBufferPercentage: bufferValue,
                note: note ? note.trim() : ""
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const planning = await getMahaprasadPlanning(userId, targetYear);

    return res.status(200).json(new ApiResponse(200, { config, planning }, "Mahaprasad planning saved successfully"));
});

export {
    getMahaprasad,
    updateMahaprasad
};