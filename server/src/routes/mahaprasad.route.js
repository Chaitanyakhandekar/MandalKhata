import { Router } from "express";
import {
    getMahaprasad,
    updateMahaprasad
} from "../controllers/mahaprasad.controller.js";
import { userAuth } from "../middlewares/userAuth.middleware.js";

const router = Router();

// Apply auth middleware to all mahaprasad routes
router.use(userAuth);

router.route("/")
    .get(getMahaprasad)
    .put(updateMahaprasad);

export default router;