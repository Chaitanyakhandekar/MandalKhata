import Router from 'express';
import {
     registerUser,
     loginUser,
     logoutUser,
     authMe,
     updateUserProfile
} from '../controllers/user.controller.js';
import { userAuth } from '../middlewares/userAuth.middleware.js';

const router = Router();

router.route("/ping").get((req, res) => {
     res.status(200).json({
          success: true,
          message: "Server is running"
     });
});
router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/logout").get(userAuth, logoutUser);
router.route("/auth-me").get(userAuth, authMe);
router.route("/update-profile").put(userAuth, updateUserProfile);

export default router;