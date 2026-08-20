import { Router } from "express";
import {
    getBuildingConfigs,
    createBuildingConfig,
    updateBuildingConfig,
    deleteBuildingConfig,
    getFlatsDonationStatus
} from "../controllers/buildingConfig.controller.js";
import { userAuth } from "../middlewares/userAuth.middleware.js";

const router = Router();

// Apply auth middleware to all building config routes
router.use(userAuth);

router.route("/flats-donation-status").get(getFlatsDonationStatus);

router.route("/")
    .get(getBuildingConfigs)
    .post(createBuildingConfig);

router.route("/:id")
    .put(updateBuildingConfig)
    .delete(deleteBuildingConfig);

export default router;