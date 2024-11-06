import { PrismaClient } from "@prisma/client";
import { Request, Response } from 'express';
import { AuthenticatedRequest } from "../middleware/authentication";
import * as commentModel from '../models/commentModel';
import * as postModel from '../models/postModel';
import * as userModel from '../models/userModel';
import fs from "fs";

const prisma = new PrismaClient();


// Function to Like a Post
export const likePost = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(400).json({ message: "User ID not provided" });
        }

        const postId = req.params.postId;
        const post = await postModel.getPostById(postId);
        if (!post) return res.status(404).json({ message: "Post not found!" });

        // Check if the user has already liked the post
        const existingLike = await prisma.like.findFirst({
            where: { postId, userId }
        });

        if (!existingLike) {
            // If not liked, create a new like
            await prisma.like.create({
                data: {
                    postId,
                    userId
                }
            });
            return res.status(200).json({ message: "Post liked successfully" });

        } else {
            // If already liked, delete the existing like
            await prisma.like.delete({
                where: { id: existingLike.id }
            });
            return res.status(200).json({ message: "Post unliked successfully" });
        }

    } catch (error: unknown) {
        if (error instanceof Error) {
            return res.status(500).json({ message: "Internal Server Error: " + error.message });
        }
        return res.status(500).json({ message: "Internal Server Error: An unexpected error occurred." });
    }
};
  
  
  // Function to Share a Post
export const sharePost = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(400).json({ message: "User ID not provided" });
        }

        const postId = req.params.postId;
        const post = await postModel.getPostById(postId);
        if (!post) return res.status(404).json({ message: "Post not found!" });

        // Function to generate a Facebook share link
        const generateFacebookShareLink = () => {
            const postUrl = `${req.protocol}://${req.get('host')}/api/v1/viewapost/${postId}`;
            const postTitle = encodeURIComponent(post.title);
            return `https://www.facebook.com/sharer/sharer.php?u=${postUrl}&quote=${postTitle}`;
        };

        // Function to generate a Twitter share link
        const generateTwitterShareLink = () => {
            const postUrl = `${req.protocol}://${req.get('host')}/api/v1/viewapost/${postId}`;
            const postTitle = encodeURIComponent(post.title);
            return `https://twitter.com/intent/tweet?url=${postUrl}&text=${postTitle}`;
        };

        // Function to generate a LinkedIn share link
        const generateLinkedInShareLink = () => {
            const postUrl = `${req.protocol}://${req.get('host')}/api/v1/viewapost/${postId}`;
            const postTitle = encodeURIComponent(post.title);
            return `https://www.linkedin.com/sharing/share-offsite/?url=${postUrl}&title=${postTitle}`;
        };

        const shareButtons = {
            facebook: generateFacebookShareLink(),
            twitter: generateTwitterShareLink(),
            linkedin: generateLinkedInShareLink()
        };

        // Add a new share to the Share model
        await prisma.share.create({
            data: {
                postId,
                userId
            }
        });

        return res.status(200).json({
            message: 'Post shared successfully',
            shareButtons: shareButtons
        });

    } catch (error: unknown) {
        if (error instanceof Error) {
            return res.status(500).json({ message: "Internal Server Error: " + error.message });
        }
        return res.status(500).json({ message: "Internal Server Error: An unexpected error occurred." });
    }
};
