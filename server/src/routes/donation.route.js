import { Router } from "express";
import {
    getDonations,
    createDonation,
    addPaymentToDonation,
    updateDonationPayment,
    deleteDonationPayment,
    updateDonation,
    deleteDonation
} from "../controllers/donation.controller.js";
import { userAuth } from "../middlewares/userAuth.middleware.js";

const router = Router();

// Apply auth middleware to all donation routes
router.use(userAuth);

router.route("/")
    .get(getDonations)
    .post(createDonation);

router.route("/:id")
    .put(updateDonation)
    .delete(deleteDonation);

// Multi-payment routes for a donation
router.route("/:id/payments")
    .post(addPaymentToDonation);

router.route("/:id/payments/:paymentId")
    .put(updateDonationPayment)
    .delete(deleteDonationPayment);

export default router;
