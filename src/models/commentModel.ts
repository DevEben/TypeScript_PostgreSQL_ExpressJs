import { PrismaClient, Comment, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Create Comment with Author and Post Relation
export const createComment = async (
  data: Omit<Prisma.CommentCreateInput, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Comment> => {
  return await prisma.comment.create({
    data,
    include: {
      author: true,  // Include author details
      post: true,    // Include post details
    },
  });
};

// Get One Comment by ID with Related Data
export const getCommentById = async (id: string): Promise<Comment | null> => {
  return await prisma.comment.findUnique({
    where: { id },
    include: {
      author: true,  // Include author details
      post: true,    // Include post details
    },
  });
};

// Get All Comments with Related Data
export const getAllComments = async (): Promise<Comment[]> => {
  return await prisma.comment.findMany({
    include: {
      author: true,  // Include author details
      post: true,    // Include post details
    },
  });
};

// Update Comment by ID with Partial Data
export const updateComment = async (
  id: string,
  data: Prisma.CommentUpdateInput
): Promise<Comment> => {
  return await prisma.comment.update({
    where: { id },
    data,
    include: {
      author: true,  // Include author details
      post: true,    // Include post details
    },
  });
};

// Delete Comment by ID
export const deleteComment = async (id: string): Promise<Comment> => {
  return await prisma.comment.delete({
    where: { id },
    include: {
      author: true,  // Include author details
      post: true,    // Include post details
    },
  });
};
