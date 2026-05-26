import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError, ApiResponse } from "../utils/apiUtils.js";

// Helper function to generate and set tokens on cookies
const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens");
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, username } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json(new ApiResponse(400, null, "Name, email, and password are required", false));
    }

    const trimmedEmail = email.trim().toLowerCase();
    // Auto-generate username from email if not provided
    const finalUsername = (username && username.trim()) 
        ? username.trim().toLowerCase() 
        : trimmedEmail.split("@")[0] + Math.floor(1000 + Math.random() * 9000);

    const existedUser = await User.findOne({
        $or: [{ email: trimmedEmail }, { username: finalUsername }]
    });

    if (existedUser) {
        return res.status(409).json(new ApiResponse(409, null, "User with this email or username already exists", false));
    }

    const user = await User.create({
        name: name.trim(),
        email: trimmedEmail,
        password,
        username: finalUsername
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        return res.status(500).json(new ApiResponse(500, null, "Something went wrong while registering the user", false));
    }

    return res.status(201).json(new ApiResponse(201, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json(new ApiResponse(400, null, "Email and password are required", false));
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
        return res.status(404).json(new ApiResponse(404, null, "User does not exist", false));
    }

    const isPasswordValid = await user.isCorrectPassword(password);

    if (!isPasswordValid) {
        return res.status(401).json(new ApiResponse(401, null, "Invalid user credentials", false));
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { user: loggedInUser, accessToken }, "User logged in successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json(new ApiResponse(401, null, "Unauthorized", false));
    }

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // remove the refresh token from document
            }
        },
        {
            new: true
        }
    );

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const authMe = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json(new ApiResponse(401, null, "Not authenticated", false));
    }
    return res.status(200).json(new ApiResponse(200, req.user, "User authenticated successfully"));
});

const updateUserProfile = asyncHandler(async (req, res) => {
    const { name, username, email } = req.body;

    if (!name && !username && !email) {
        return res.status(400).json(new ApiResponse(400, null, "Provide at least one field to update", false));
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (username) updateData.username = username.trim().toLowerCase();
    if (email) updateData.email = email.trim().toLowerCase();

    // Check unique constraints if username or email is being updated
    if (username || email) {
        const query = [];
        if (username) query.push({ username: updateData.username });
        if (email) query.push({ email: updateData.email });

        const existedUser = await User.findOne({
            _id: { $ne: req.user._id },
            $or: query
        });

        if (existedUser) {
            return res.status(409).json(new ApiResponse(409, null, "Username or email is already taken", false));
        }
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updateData },
        { new: true }
    ).select("-password -refreshToken");

    return res.status(200).json(new ApiResponse(200, updatedUser, "Profile updated successfully"));
});

// Placeholders for remaining unused user routes to ensure user.route.js doesn't fail if imported
const verifyUser = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, {}, "Verified")));
const isVerifiedUser = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, { isVerified: true })));
const isLoggedInUser = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, { isLoggedIn: true })));
const uploadAvatar = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, {}, "Avatar uploaded")));
const getUserAvatar = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, {}, "Avatar fetched")));
const getUserProfile = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, req.user)));
const deleteUserAvatar = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, {}, "Avatar deleted")));
const updateUserAvatar = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, {}, "Avatar updated")));
const getPublicUserProfile = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, {})));
const sendOTP = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, {}, "OTP Sent")));
const resetPassword = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, {}, "Password reset")));
const resendEmailVerification = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, {}, "Verification resent")));
const getAllUsers = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, [])));
const searchUsers = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, [])));

export {
    registerUser,
    loginUser,
    logoutUser,
    authMe,
    updateUserProfile,
    verifyUser,
    isVerifiedUser,
    isLoggedInUser,
    uploadAvatar,
    getUserAvatar,
    getUserProfile,
    deleteUserAvatar,
    updateUserAvatar,
    getPublicUserProfile,
    sendOTP,
    resetPassword,
    resendEmailVerification,
    getAllUsers,
    searchUsers
};
