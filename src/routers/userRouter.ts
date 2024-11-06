import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { signUp_User, verify_User, logIn_User, forgotPassword, resetPassword, signOut, getUser, getAllUsers, uploadPhoto, updateUserProfile, deleteUserProfile, makeAdmin } from '../controllers/userController';
import { authenticate, Admin } from '../middleware/authentication';
import { upload } from '../middleware/multer';


const router = Router();

// Define the route
router.post('/signup', asyncHandler(signUp_User));

//endpoint to verify a registered user
router.get('/verify-user/:id/:token', asyncHandler(verify_User));

//endpoint to login with email
router.post("/login", asyncHandler(logIn_User));

//endpoint for forgot password
router.post("/forgot-password", asyncHandler(forgotPassword));

//endpoint to reset user Password
router.put('/reset-password/:id', asyncHandler(resetPassword));

//endpoint to sign out a user
router.post("/signout", asyncHandler(authenticate), asyncHandler(signOut));

//endpoint to upload a profile photo
router.put('/upload-pic', upload.single('userPicture'), asyncHandler(authenticate),  asyncHandler(uploadPhoto));

//endpoint to get a user profile
router.get("/get-user", asyncHandler(authenticate), asyncHandler(getUser));

//endpoint to get all users on the platform
router.get("/get-all", asyncHandler(authenticate), asyncHandler(getAllUsers));

//endpoint to update the user's profile
router.put("/update-profile", asyncHandler(authenticate), asyncHandler(updateUserProfile));

//endpoint to delete user profile 
router.delete("/delete-profile/:id", asyncHandler(authenticate), asyncHandler(deleteUserProfile));

//endpoint to make a user an Admin
router.put('/makeadmin/:userId', asyncHandler(authenticate), asyncHandler(makeAdmin));


export default router;