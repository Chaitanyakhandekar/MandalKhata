import { Household } from "../models/household.model.js";
import { BuildingConfig } from "../models/buildingConfig.model.js";
import { Mahaprasad } from "../models/mahaprasad.model.js";
import { getFlatNumbers, normalizeConfigRanges } from "../utils/flatRanges.util.js";

/**
 * Calculates resident/household statistics from active households and
 * building & wing configurations for a given user.
 *
 * External donors are NEVER tracked here - only resident households.
 */
const calculateResidentStatistics = async (userId) => {
    const [households, configs] = await Promise.all([
        Household.find({ createdBy: userId, active: true }).lean(),
        BuildingConfig.find({ createdBy: userId }).sort({ building: 1, wing: 1 }).lean()
    ]);

    const wingMap = new Map();
    configs.forEach((c) => {
        const flatNumbers = getFlatNumbers(normalizeConfigRanges(c));
        wingMap.set(`${c.building}-${c.wing}`, {
            building: c.building,
            wing: c.wing,
            expectedFlats: flatNumbers.length,
            flatNumbers,
            registeredFlats: 0,
            people: 0,
            registeredFlatNumbers: new Set()
        });
    });

    let totalHouseholds = 0;
    let totalResidents = 0;

    households.forEach((h) => {
        totalHouseholds++;
        totalResidents += h.memberCount;
        const wing = wingMap.get(`${h.building}-${h.wing}`);
        if (wing) {
            wing.registeredFlats++;
            wing.people += h.memberCount;
            wing.registeredFlatNumbers.add(h.flatNumber);
        }
    });

    const wings = [];
    const buildingMap = new Map();
    let totalExpectedFlats = 0;

    wingMap.forEach((wing) => {
        wing.remainingFlats = Math.max(wing.expectedFlats - wing.registeredFlats, 0);
        wing.unregisteredFlats = wing.flatNumbers.filter((flat) => !wing.registeredFlatNumbers.has(flat));

        const { registeredFlatNumbers, flatNumbers, ...wingData } = wing;
        wings.push(wingData);
        totalExpectedFlats += wing.expectedFlats;

        if (!buildingMap.has(wing.building)) {
            buildingMap.set(wing.building, {
                building: wing.building,
                expectedFlats: 0,
                registeredFlats: 0,
                remainingFlats: 0,
                households: 0,
                people: 0,
                wings: []
            });
        }
        const building = buildingMap.get(wing.building);
        building.expectedFlats += wing.expectedFlats;
        building.registeredFlats += wing.registeredFlats;
        building.remainingFlats = Math.max(building.expectedFlats - building.registeredFlats, 0);
        building.households += wing.registeredFlats;
        building.people += wing.people;
        building.wings.push(wingData);
    });

    const remainingFlats = Math.max(totalExpectedFlats - totalHouseholds, 0);

    return {
        totalHouseholds,
        totalRegisteredFlats: totalHouseholds,
        totalExpectedFlats,
        remainingFlats,
        totalResidents,
        buildings: [...buildingMap.values()].map((building) => {
            const { wings: buildingWings, ...buildingData } = building;
            return buildingData;
        }),
        wings: wings.map((wing) => {
            const { unregisteredFlats: flatList, ...wingData } = wing;
            return wingData;
        }),
        unregisteredFlats: wings
            .filter((wing) => wing.remainingFlats > 0)
            .map((wing) => ({ building: wing.building, wing: wing.wing, flats: wing.unregisteredFlats }))
    };
};

/**
 * Computes the Mahaprasad planning figures using ONLY resident household population.
 * External donors are never included in this calculation.
 *
 * expectedAttendance  = Math.round(totalResidents * expectedAttendancePercentage / 100)
 * recommendedMeals    = Math.round(expectedAttendance * (1 + safetyBufferPercentage / 100))
 */
const getMahaprasadPlanning = async (userId, festivalYear) => {
    const config = await Mahaprasad.findOne({ createdBy: userId, festivalYear });

    const expectedAttendancePercentage = config ? config.expectedAttendancePercentage : 80;
    const safetyBufferPercentage = config ? config.safetyBufferPercentage : 10;

    const residentStats = await calculateResidentStatistics(userId);

    const expectedAttendance = Math.round(residentStats.totalResidents * (expectedAttendancePercentage / 100));
    const recommendedMeals = Math.round(expectedAttendance * (1 + safetyBufferPercentage / 100));

    return {
        _id: config ? config._id : null,
        festivalYear,
        expectedAttendancePercentage,
        safetyBufferPercentage,
        note: config ? config.note : "",
        registeredHouseholds: residentStats.totalHouseholds,
        totalPeople: residentStats.totalResidents,
        expectedAttendance,
        recommendedMeals,
        externalDonorsExcluded: true
    };
};

export {
    calculateResidentStatistics,
    getMahaprasadPlanning
};