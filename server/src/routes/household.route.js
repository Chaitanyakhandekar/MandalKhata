import { Router } from "express";
import {
    getHouseholds,
    getHouseholdOverview,
    createHousehold,
    updateHousehold,
    toggleHouseholdActive,
    deleteHousehold
} from "../controllers/household.controller.js";
import { userAuth } from "../middlewares/userAuth.middleware.js";

const router = Router();

// Apply auth middleware to all household routes
router.use(userAuth);

router.route("/")
    .get(getHouseholds)
    .post(createHousehold);

router.route("/overview")
    .get(getHouseholdOverview);

router.route("/:id")
    .put(updateHousehold)
    .delete(deleteHousehold);

router.route("/:id/active")
    .patch(toggleHouseholdActive);

export default router;