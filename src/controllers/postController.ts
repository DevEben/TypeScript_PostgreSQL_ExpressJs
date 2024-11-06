import { Prisma } from "@prisma/client";
import { Request, Response } from 'express';
import { AuthenticatedRequest } from "../middleware/authentication";
import * as postModel from '../models/postModel';
import * as userModel from '../models/userModel';
import cloudinary from "../middleware/cloudinary";
import fs from "fs";


  
  // Function to upload a single media file to Cloudinary
  const uploadImageToCloudinary = async (mediaFilePath: string) => {
    try {
      const uploadOptions = {
        public_id: `mediaImg_${Date.now()}`, // Unique naming using timestamp
        folder: "BlogMedia",
      };
      const uploadedImage = await cloudinary.uploader.upload(mediaFilePath, uploadOptions);
      return uploadedImage; // Return the uploaded image details
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Error uploading photo to Cloudinary: ${error.message}`);
      }
      throw new Error("Error uploading photo to Cloudinary: An unknown error occurred.");
    }
  };
  
// Function to create a post with multiple media files
export const createPostController = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(400).json({ message: "User ID not provided" });
      }
  
      const { title, content } = req.body;
      const uploadedMediaFiles = [];
  
    // Iterate directly over `req.files` if using multer `.array()`
    if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          const uploadedFile = await uploadImageToCloudinary(file.path);
          uploadedMediaFiles.push({
            url: uploadedFile.secure_url,
            public_id: uploadedFile.public_id,
          });
          fs.unlinkSync(file.path); // Delete temp file after upload
        }
      }
  
      // Prepare post data according to the schema
      const postData: Prisma.PostCreateInput = {
        title,
        content,
        author: { connect: { id: userId } }, // Connect the author by ID
        mediaFiles: {
          create: uploadedMediaFiles, // Add media files
        },
      };
  
      // Create the post using the postModel function
      const newPost = await postModel.createPost(postData);
  
      return res.status(200).json({
        message: "Post created successfully",
        post: newPost,
      });

    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(500).json({ message: "Internal Server Error: " + error.message });
      }
      return res.status(500).json({ message: "Internal Server Error: An unexpected error occurred." });
    }
  };
  

// Function to View a post
export const viewOnePost = async (req: Request, res: Response): Promise<Response> => {
  try {
    const postId = req.params.postId;
    const post = await postModel.getPostById(postId);
    if (!post) {
      return res.status(404).json({ message: "No post found" });
    }
    return res.status(200).json({ message: "The selected post is:", Post: post });

  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ message: "Internal Server Error: " + error.message });
    }
    return res.status(500).json({ message: "Internal Server Error: An unexpected error occurred." });
  }
};

// Function to View all posts
export const viewPosts = async (req: Request, res: Response): Promise<Response> => {
  try {
    const posts = await postModel.getAllPosts();
    if (!posts) {
      return res.status(404).json({ message: "No posts found" });
    }
    return res.status(200).json({
      message: "List of all posts in the blog: " + posts.length,
      Posts: posts
    });

  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ message: "Internal Server Error: " + error.message });
    }
    return res.status(500).json({ message: "Internal Server Error: An unexpected error occurred." });
  }
};

// Function to update a post
export const updatePost = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const postId = req.params.postId;
      const post = await postModel.getPostById(postId);
  
      if (!post) {
        return res.status(404).json({ message: "No post found" });
      }
  
      const existingMediaFiles = post.mediaFiles || [];
      const uploadedMediaFiles: { url: string; public_id: string }[] = [];
  
      // Iterate directly over `req.files` if using multer `.array()`
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          const uploadedFile = await uploadImageToCloudinary(file.path);
          uploadedMediaFiles.push({
            url: uploadedFile.secure_url,
            public_id: uploadedFile.public_id,
          });
          fs.unlinkSync(file.path); // Delete temp file after upload
        }
      }

      const userId = req.user?.userId;
  
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
  
      // Construct the updatedPost object conditionally
      const updatedPost: Prisma.PostUpdateInput = {
        title: req.body.title || post.title,
        content: req.body.content || post.content,
        author: { connect: { id: userId } }, // Connect the author by ID
        mediaFiles: uploadedMediaFiles.length > 0 
          ? { create: uploadedMediaFiles }  // If there are new media files, create them
          : { connect: existingMediaFiles.map(file => ({ id: file.id })) },  // If no new files, connect existing ones
      };
  
      const newPost = await postModel.updatePost(postId, updatedPost);
  
      return res.status(200).json({
        message: 'Post updated successfully',
        Post: {
          title: newPost.title,
          content: newPost.content,
          mediaFiles: newPost?.mediaFiles,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(500).json({ message: "Internal Server Error: " + error.message });
      }
      return res.status(500).json({ message: "Internal Server Error: An unexpected error occurred." });
    }
  };


// Function to Delete a post
export const deletePost = async (req: Request, res: Response): Promise<Response> => {
    try {
      const postId = req.params.postId;
  
      // Get the post and its associated media files before deleting
      const post = await postModel.getPostById(postId);
  
      if (!post) {
        return res.status(404).json({ message: "No post found" });
      }
  
      // Check if there are media files associated with the post
      const mediaFiles = post.mediaFiles || [];
  
      // Delete media files from Cloudinary if they exist
      for (const mediaFile of mediaFiles) {
        const publicId = mediaFile.public_id;
        await cloudinary.uploader.destroy(publicId);
      }
  
      // Now delete the post and the associated media files from the database
      const deletedPost = await postModel.deletePost(postId); // Adjust as per your ORM model
  
      if (!deletedPost) {
        return res.status(500).json({ message: "Failed to delete the post from the database" });
      }
  
      // Optionally, delete associated media files from the media table
      await postModel.deleteMediaFilesByPostId(postId); // Assuming you have a method to delete media files
  
      return res.status(200).json({ message: 'Post and associated media files deleted successfully' });
  
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(500).json({ message: "Internal Server Error: " + error.message });
      }
      return res.status(500).json({ message: "Internal Server Error: An unexpected error occurred." });
    }
  };