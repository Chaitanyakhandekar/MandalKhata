import { Router } from "express";
import {
    getExternalDonors,
    getExternalDonorDonations,
    createExternalDonor,
    updateExternalDonor,
    toggleExternalDonorActive,
    deleteExternalDonor
} from "../controllers/externalDonor.controller.js";
import { userAuth } from "../middlewares/userAuth.middleware.js";

const router = Router();

// Apply auth middleware to all external donor routes
router.use(userAuth);

router.route("/")
    .get(getExternalDonors)
    .post(createExternalDonor);

router.route("/:id/donations")
    .get(getExternalDonorDonations);

router.route("/:id")
    .put(updateExternalDonor)
    .delete(deleteExternalDonor);

router.route("/:id/active")
    .patch(toggleExternalDonorActive);

export default router;