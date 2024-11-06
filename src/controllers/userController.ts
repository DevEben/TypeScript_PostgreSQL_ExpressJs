import { Request, Response } from 'express';
import * as userModel from '../models/userModel';
import * as adminModel from '../models/adminModel';
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Bowser from 'bowser';
import { sendMail } from "../utils/email";
import { generateDynamicEmail } from "../utils/emailText";
import { verifiedHTML } from "../utils/verified";
import { AuthenticatedRequest } from "../middleware/authentication";
import { resetFunc } from "../utils/forgot";
import { validateUser, validateResetPassword, validateUpdatedUser } from "../middleware/validator";
import { generateLoginNotificationEmail } from "../utils/sendLoginEmail";
import cloudinary from "../middleware/cloudinary";
import path from "path";
import fs from "fs";
import { PrismaClient, Picture } from '@prisma/client';

const prisma = new PrismaClient();

// Function to get device information from user-agent
const getDeviceInfo = (userAgent: string) => {
  const parser = Bowser.getParser(userAgent);
  const browserInfo = parser.getBrowser();
  const osInfo = parser.getOS();
  const platformInfo = parser.getPlatform();

  return {
    browser: {
      name: browserInfo.name || "Unknown browser",
      version: browserInfo.version || "Unknown version",
    },
    os: {
      name: osInfo.name || "Unknown OS",
      version: osInfo.version || "Unknown version",
    },
    platform: platformInfo.type || "web", // "desktop", "mobile", "tablet", etc.
  };
};


const toTitleCase = (str: string) => {
  return str.toLowerCase().split(" ").map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
};

// Function to Register a new user on the platform
export const signUp_User = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { error } = validateUser(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
      });
    }

    const userDetail = {
      username: req.body.username.toLowerCase().trim(),
      email: req.body.email.toLowerCase().trim(),
      password: req.body.password,
    };

    if ( !userDetail.username || !userDetail.email || !userDetail.password ) {
      return res.status(400).json({ message: "Please fill all fields below!" });
    }

    const emailExist = await userModel.getUserByEmail(userDetail.email);
    if (emailExist)
      return res.status(400).json({ message: "Email already exists!" });

    // Hash password
    const SALT_ROUNDS = 12;
    const hashedPassword = bcrypt.hashSync(userDetail.password, SALT_ROUNDS);

    const user = await userModel.createUser({
      username: userDetail.username, 
      email: userDetail.email,
      password: hashedPassword,
    });

    const token = jwt.sign({ userId: user.id }, process.env.SECRET as string, {
      expiresIn: "1800s",
    });
    user.token = token;
    const subject = "Email Verification";
    const name = `${user.username}`;

    const link = `${req.protocol}://${req.get("host")}/api/v1/verify-user/${
      user.id
    }/${user.token}`;
    const html = generateDynamicEmail((name), link);

    try {
      await sendMail({
        email: user.email,
        html,
        subject,
      });
    } catch (emailError: any) {
      console.error("Error sending email:", emailError);
      return res.status(500).json({
        message:
          "Account created, but failed to send verification email. Please contact support.",
        error: emailError.message,
      });
    }

    // await user.save();
    return res.status(201).json({
      message:
        "Successfully created an account, Please log in to your email and verify your account",
      data: {
        ...user,
        password: undefined,
      },
    });
  } catch (error: unknown) {
    // Type guard to check if the error is an instance of Error
    if (error instanceof Error) {
      return res.status(500).json({
        message: "Internal Server Error: " + error.message,
      });
    }

    // Fallback for unexpected error types
    return res.status(500).json({
      message: "Internal Server Error: An unexpected error occurred.",
    });
  }
};

//Function to verify a new user through link
export const verify_User = async (req: Request, res: Response) => {
  try {
    const { id, token } = req.params;

    const user = await userModel.getUserById(id);
    if (!user) return res.status(404).json({ message: "user not found" });

    // Verify the token
    jwt.verify(token, process.env.SECRET as string, async (err, decoded) => {
      if (err) {
        // If token is invalid/expired, generate a new token and ask the user to re-verify
        const newToken = jwt.sign(
          { userId: user.id },
          process.env.SECRET as string,
          { expiresIn: "1800s" }
        );

        user.token = newToken;
        // await user.save();

        const link = `${req.protocol}://${req.get("host")}/api/v1/verify-user/${id}/${newToken}`;
        const name = `${user.username}`;
        await sendMail({
          email: user.email,
          html: generateDynamicEmail(name, link),
          subject: "RE-VERIFY YOUR ACCOUNT",
        });

        return res.status(400).send("Token expired. A new verification link has been sent to your email.");
      } else {
        // Token is valid, proceed to verify the user
        const userVerified = await userModel.updateUserById( id, { isVerified: true } );
        return res.send(verifiedHTML());
      }
    });
  } catch (error: unknown) {
    // Type guard to check if the error is an instance of Error
    if (error instanceof Error) {
      return res.status(500).json({
        message: "Internal Server Error: " + error.message,
      });
    }

    // Fallback for unexpected error types
    return res.status(500).json({
      message: "Internal Server Error: An unexpected error occurred.",
    });
  }
};

//Function to login a verified user
export const logIn_User = async (req: Request, res: Response) => {
  try {
    const userData = {
      email: req.body.email.trim(),
      password: req.body.password.trim(),
    };

    if (!userData.email || !userData.password)
      return res.status(400).json({ message: "Please fill all the fields below!" });

    const checkEmail = await userModel.getUserByEmail(userData.email.toLowerCase());
    if (!checkEmail)
      return res.status(404).json({ message: "User not registered" });

    const checkPassword = bcrypt.compareSync(userData.password, checkEmail.password);
    if (!checkPassword) return res.status(404).json({ message: "Password is incorrect" });

    const token = jwt.sign( { userId: checkEmail.id, isAdmin: checkEmail.isAdmin }, process.env.SECRET as string, { expiresIn: "20h" });
    checkEmail.token = token;

    // await checkEmail.save();

    // Get device information from user-agent
    const userAgent = req.headers['user-agent'] as string;
    const deviceInfo = getDeviceInfo(userAgent);
    const deviceType = deviceInfo.platform;
    const deviceBrowser = `${deviceInfo.browser.name} ${deviceInfo.browser.version}`;
    const deviceOS = `${deviceInfo.os.name} ${deviceInfo.os.version}`;

    const loginTime = new Date().toLocaleString();
    console.log(`Successful login: ${checkEmail.email}, (${checkEmail.username}) on ${deviceType} (OS: ${deviceOS}) (Browser: ${deviceBrowser}) at ${loginTime}`);

    // Send login notification email
    await sendMail({
      email: checkEmail.email,
      html: generateLoginNotificationEmail(
        checkEmail.username,
        loginTime,
        deviceType,
        deviceOS,
        deviceBrowser
      ),
      subject: "Login Notification",
    });

    // If login is successful
    const { password: _, ...newUser } = checkEmail;

    if (checkEmail.isVerified) {
      return res.status(200).json({
        message: "Login Successfully! Welcome " + checkEmail.username,
        token: token,
        user: newUser,
        device: { type: deviceType, name: deviceOS },
      });
    } else {
      return res.status(400).json({
        message: "Sorry user not verified yet. Check your mail to verify your account!",
      });
    }
  } catch (error: unknown) {
    // Type guard to check if the error is an instance of Error
    if (error instanceof Error) {
      return res.status(500).json({
        message: "Internal Server Error: " + error.message,
      });
    }

    // Fallback for unexpected error types
    return res.status(500).json({
      message: "Internal Server Error: An unexpected error occurred.",
    });
  }
};

//Function to help user, incase password is forgotten
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        message: "Please enter your email address!",
      });
    }

    const user = await userModel.getUserByEmail(email.toLowerCase());
    if (!user) return res.status(404).json({ message: "Email does not exist" });

    const subject = "Kindly Reset Your Password";
    const link = `${req.protocol}://${req.get("host")}/api/v1/reset-password/${user.id}`;
    const html = resetFunc(user.email, link);
    sendMail({
      email: user.email,
      html,
      subject,
    });

    const newToken = jwt.sign(
      { userId: user.id },
      process.env.SECRET as string,
      { expiresIn: "900s" }
    );
    user.token = newToken;
    // await user.save();

    return res.status(200).json({
      message: "Kindly check your email to reset your password",
    });
  } catch (error: unknown) {
    // Type guard to check if the error is an instance of Error
    if (error instanceof Error) {
      return res.status(500).json({
        message: "Internal Server Error: " + error.message,
      });
    }

    // Fallback for unexpected error types
    return res.status(500).json({
      message: "Internal Server Error: An unexpected error occurred.",
    });
  }
};

// Function to reset the user's password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { error } = validateResetPassword(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
      });
    }

    // Extract userId from request parameters and passwords from request body
    const { id } = req.params;
    const { password, confirmPassword } = req.body;

    // Check if password or confirmPassword are empty
    if (!password || !confirmPassword) {
      return res.status(400).json({
        message: "Password and Confirm Password cannot be empty",
      });
    }

    // Find the user by email
    const user = await userModel.getUserById(id);
    if (!user) return res.status(404).json({ message: "user not found" });

    // Check if the token exists and is valid
    if (!user.token) {
      return res.status(400).json({ message: "No reset token provided" });
    }

    //Check if the link is valid or has expired
    jwt.verify( user.token, process.env.SECRET as string, async (err, decoded) => {
        if (err) {
          // If token is invalid/expired
          return res.status(400).json({ message: "Link has expired!" + err.message });
        } else {
          // Check if password and confirmPassword match
          if (password !== confirmPassword) {
            return res.status(400).json({
              message: "Passwords do not match",
            });
          }

          // If the user already has a password, check if the new password is the same as the old password
          if (user.password && bcrypt.compareSync(password, user.password)) {
            return res.status(400).json({ message: "Can't use previous password!" });
          }

          // Generate a salt and hash the new password
          const salt = bcrypt.genSaltSync(12);
          const hashPassword = bcrypt.hashSync(password, salt);
          const userId = user.id;
          // Update the user password with the new hashed password
          const updatedUser = await userModel.updateUserById(userId, { password: hashPassword });
          if (!updatedUser)
            return res.status(400).json({ message: "Unable to reset user's password" });

          // Send a successful reset response
          // return res.send(resetSuccessfulHTML(req));
          return res.status(200).json({ message: "Password reset successful!" });
        }
      }
    );
  } catch (error: unknown) {
    // Type guard to check if the error is an instance of Error
    if (error instanceof Error) {
      return res.status(500).json({
        message: "Internal Server Error: " + error.message,
      });
    }

    // Fallback for unexpected error types
    return res.status(500).json({
      message: "Internal Server Error: An unexpected error occurred.",
    });
  }
};

// Function to signOut a Merchant
export const signOut = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Extract the user ID from the request object
    const id = req.user?.userId; 
    if (!id) {
      return res.status(400).json({ message: "User ID not provided" });
    }

    const user = await userModel.getUserById(id);
    if (!user) return res.status(404).json({ message: "user not found" });

    user.token = null;
    // await user.save();

    const name = `${user.username}`

    return res.status(201).json({
      message: `${toTitleCase(name)} has been signed out successfully`,
    });
  } catch (error: unknown) {
    // Type guard to check if the error is an instance of Error
    if (error instanceof Error) {
      return res.status(500).json({
        message: "Internal Server Error: " + error.message,
      });
    }

    // Fallback for unexpected error types
    return res.status(500).json({
      message: "Internal Server Error: An unexpected error occurred.",
    });
  }
};

// Get a user
export const getUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(400).json({ message: "User ID not provided" });
    }

    const user = await userModel.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        message: "user not found",
      });
    }

    // Exclude the password, otp etc
    const { password: _, ...userDetails } = user;

    return res.status(200).json({
      message: "user Profile successfully fetched!",
      data: userDetails,
    });
  } catch (error) {
    // Type guard to check if the error is an instance of Error
    if (error instanceof Error) {
      return res.status(500).json({
        message: "Internal Server Error: " + error.message,
      });
    }

    // Fallback for unexpected error types
    return res.status(500).json({
      message: "Internal Server Error: An unexpected error occurred.",
    });
  }
};

// get all users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await userModel.getUsers({ createdAt: 'desc' });

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    return res.status(200).json({
      message: `${users.length} user(s) found`,
      data: users,
    });
  } catch (error: unknown) {
    // Type guard to check if the error is an instance of Error
    if (error instanceof Error) {
      return res.status(500).json({
        message: "Internal Server Error: " + error.message,
      });
    }

    // Fallback for unexpected error types
    return res.status(500).json({
      message: "Internal Server Error: An unexpected error occurred.",
    });
  }
};



export const updateUserProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error } = validateUpdatedUser(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
      });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(400).json({ message: "User ID not provided" });
    }

    const user = await userModel.getUserById(userId);
    if (!user) return res.status(404).json({ message: "User not found!" });


    const userData = {
      username: req.body.username?.toLowerCase().trim() || user.username,
      email: req.body.email?.toLowerCase().trim() || user.email,
    }

    const updatedUser = await userModel.updateUserById(userId, userData);
    if (!updatedUser) return res.status(400).json({ message: "Unable to update user profile!" });

    // Respond with success message and updated profile data
    return res.status(200).json({
        message: "Your profile has been updated successfully",
        data: updatedUser
    });

  } catch (error: unknown) {
    // Type guard to check if the error is an instance of Error
    if (error instanceof Error) {
      return res.status(500).json({
        message: "Internal Server Error: " + error.message,
      });
    }

    // Fallback for unexpected error types
    return res.status(500).json({
      message: "Internal Server Error: An unexpected error occurred.",
    });
  }
};


export const deleteUserProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await userModel.getUserById(id);
    if (!user) return res.status(404).json({message: "User not found"});

    const deleteduser = await userModel.deleteUserById(id);
    if (!deleteduser) return res.status(400).json({message: "Unable to delete user profile"});

    return res.status(200).json({ message: "User profile successfully deleted!" });

  } catch (error: unknown) {
    // Type guard to check if the error is an instance of Error
    if (error instanceof Error) {
      return res.status(500).json({
        message: "Internal Server Error: " + error.message,
      });
    }

    // Fallback for unexpected error types
    return res.status(500).json({
      message: "Internal Server Error: An unexpected error occurred.",
    });
  }
};


// Define types for user and userPicture according to the schema
interface User {
  id: string; // Match id type with your schema
  username: string; // Match User model
  email: string; // Match User model
  password: string; // Match User model
  isAdmin: boolean; // Match User model
  isVerified: boolean; // Match User model
  userPicture?: UserPicture; // Picture relation
}

interface UserPicture {
  id?: string;
  public_id: string;
  url: string;
}

// Function to upload a user photo
const uploadImageToCloudinary = async (userPicturePath: string) => {
  try {
    const uploadOptions = {
      public_id: `userPic_${Date.now()}`, // Use timestamp for unique naming
      folder: "user-Images",
    };

    const uploadedImage = await cloudinary.uploader.upload(userPicturePath, uploadOptions);
    return uploadedImage; // Return the uploaded image details
  } catch (error: unknown) {
    // Type guard to check if the error is an instance of Error
    if (error instanceof Error) {
      throw new Error(`Error uploading photo to Cloudinary: ${error.message}`);
    }
    throw new Error("Error uploading photo to Cloudinary: An unknown error occurred.");
  }
};

// Endpoint to upload a user profile photo
export const uploadPhoto = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId; // Get user ID from the request
    if (!userId) {
      return res.status(400).json({ message: "User ID not provided" });
    }
    
    // Retrieve user from the database
    const user = await userModel.getUserById(userId) as User;
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if a file was uploaded
    if (!req.file) return res.status(400).json({ message: "No file was uploaded" });

    // Check if the file exists before proceeding
    if (!fs.existsSync(req.file.path)) {
      return res.status(400).json({ message: "Uploaded image not found" });
    }

    // Upload the image to Cloudinary
    let fileUploader;
    try {
      fileUploader = await uploadImageToCloudinary(req.file.path); // Upload image
    } catch (uploadError: unknown) {
      if (uploadError instanceof Error) {
        return res.status(500).json({
          message: "Error uploading profile photo: " + uploadError.message,
        });
      }
    }

    // Clean up the uploaded file from the local file system
    fs.unlinkSync(req.file.path);

    // Handle the uploaded photo
    if (fileUploader) {
      const userPicture: UserPicture = {
        public_id: fileUploader.public_id,
        url: fileUploader.secure_url,
      };

      let updatedPicture;

      // Check if the user already has a picture
      if (user.userPicture) {
        // Update the existing picture record
        updatedPicture = await prisma.picture.update({
          where: { id: user.userPicture.id }, // Use the existing picture's ID
          data: {
            public_id: userPicture.public_id,
            url: userPicture.url,
          },
        });
      } else {
        // Create a new picture record and link it to the user
        updatedPicture = await prisma.picture.create({
          data: {
            public_id: userPicture.public_id,
            url: userPicture.url,
            user: {
              connect: { id: userId }, // Associate the picture with the user
            },
          },
        });
      }

      // Update the user with the new picture details
      const updatedUser = await userModel.updateUserById(userId, {
        pictureId: updatedPicture.id, // Update pictureId instead of userPicture
      });

      if (!updatedUser) {
        return res.status(400).json({ message: "Unable to upload user photo!" });
      }

      return res.status(200).json({
        message: "Photo successfully uploaded!",
        profilePicture: userPicture, // Return the new user picture details
      });
    } else {
      return res.status(500).json({ message: "Failed to upload profile image" });
    }
  } catch (error: any) {
    return res.status(500).json({
      message: "Internal Server Error: " + error.message,
    });
  } finally {
    // Ensure the local file is deleted
    if (req.file && fs.existsSync(req.file?.path)) {
      fs.unlinkSync(path.resolve(req.file.path));
    }
  }
};



//Function to make a user an admin
export const makeAdmin = async (req: Request, res: Response) => {
  try {
    const userId = req.params?.userId;
    if (!userId) {
        return res.status(400).json({ message: "User ID not provided" });
    }

    const user = await userModel.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }
    const makeAdmin = await userModel.updateUserById(userId, { isAdmin: true });

    const updateAdmin = await adminModel.createAdmin({userId});
    if (!updateAdmin) return res.status(400).json({ message: "Unable to make user an admin" });

    return res.status(200).json({
      message: "User have been made an Admin successfully",
      data: makeAdmin
    })

  } catch (error: unknown) {
    if (error instanceof Error) {
        return res.status(500).json({ message: "Error adding comment: " + error.message });
    }
    return res.status(500).json({ message: "Internal Server Error: An unexpected error occurred." });
}
};