import { Prisma } from "@prisma/client";
import { Request, Response } from 'express';
import { AuthenticatedRequest } from "../middleware/authentication";
import * as commentModel from '../models/commentModel';
import * as postModel from '../models/postModel';
import * as userModel from '../models/userModel';
import fs from "fs";



// Function to Comment on a post
export const commentPost = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
        const { postId } = req.params;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(400).json({ message: "User ID not provided" });
        }

        const user = await userModel.getUserById(userId);
        if (!user) return res.status(404).json({ message: "User not found!" });

        const { comment } = req.body;
        if (!comment) {
            return res.status(400).json({ message: "Comment content is required" });
        }

        const post = await postModel.getPostById(postId);
        if (!post) return res.status(404).json({ message: "Post not found!" });

      // Prepare comment data according to the schema
      const commentData: Prisma.CommentCreateInput = {
        content: comment,
        post: { connect: { id: postId } },
        author: { connect: { id: userId } },
      };

        // Create a new comment associated with the post and author
        const newComment = await commentModel.createComment(commentData);

        return res.status(201).json({
            message: "Comment added successfully",
            comment: newComment,
        });

    } catch (error: unknown) {
        if (error instanceof Error) {
            return res.status(500).json({ message: "Error adding comment: " + error.message });
        }
        return res.status(500).json({ message: "Internal Server Error: An unexpected error occurred." });
    }
};  
  
  
// Function to View comments on a post
export const viewComments = async (req: Request, res: Response) => {
    try {
      const { postId } = req.params;
  
      // Fetch the post with related comments and author details in each comment
      const post = await postModel.getPostById(postId);
      if (!post) {
        return res.status(404).json({
          message: "Post not found",
        });
      }
  
      // Check if the post has comments
      const comments = post.comments;
      if (!comments || comments.length === 0) {
        return res.status(200).json({
          message: "No comments on this post",
          comments: [],
        });
      }
  
      return res.status(200).json({
        message: `List of comments on post: ${comments.length}`,
        comments,
      });
    } catch (error: unknown) {
        if (error instanceof Error) {
            return res.status(500).json({ message: "Error viewing comment: " + error.message });
        }
        return res.status(500).json({ message: "Internal Server Error: An unexpected error occurred." });
    }
  };
  
  
  // Function to Delete a comment on a post
  export const deleteComment = async (req: Request, res: Response) => {
    try {
      const { postId } = req.params;
      const { commentId } = req.params;
      const post = await postModel.getPostById(postId);
      if (!post) {
        return res.status(404).json({
          message: "Post not found",
        });
      }

      const comment = await commentModel.deleteComment(commentId);
      if (!comment) return res.status(400).json({ message: "Unable to delete comment!" })

      return res.status(400).json({
        message: "Comment deleted successfully",
      });
    } catch (error: unknown) {
        if (error instanceof Error) {
            return res.status(500).json({ message: "Error deleting comment: " + error.message });
        }
        return res.status(500).json({ message: "Internal Server Error: An unexpected error occurred." });
    }
  };