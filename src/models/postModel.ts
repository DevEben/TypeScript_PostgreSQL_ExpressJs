import { PrismaClient, Post, MediaFile, Prisma, Comment, } from '@prisma/client';

const prisma = new PrismaClient();

// Post type with mediaFiles
export interface Posts extends Post {
  mediaFiles: MediaFile[];
  comments?: Comment[];
}


// Create Post with Media Files and Author
export const createPost = async (
  data: Omit<Prisma.PostCreateInput, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Posts> => {
  return await prisma.post.create({
    data,
    include: {
      mediaFiles: true,  // Include media files if they're provided
      author: true,      // Include author details
    },
  });
};

// Get One Post by ID with Related Data
export const getPostById = async (id: string): Promise<Posts | null> => {
  return await prisma.post.findUnique({
    where: { id },
    include: {
      mediaFiles: true,  // Include associated media files
      comments: {
        include: {
          author: true,  // Include author details in each comment
        },
      },
      likes: true,       // Include likes
      shares: true,      // Include shares
      author: true,      // Include author details
    },
  });
};

// Get All Posts with Related Data
export const getAllPosts = async (): Promise<Posts[]> => {
  return await prisma.post.findMany({
    include: {
      mediaFiles: true,
      comments: true,
      likes: true,
      shares: true,
      author: true,
    },
  });
};


// Update Post by ID with Partial Data
export const updatePost = async (
  id: string,
  data: Prisma.PostUpdateInput
): Promise<Posts> => {
  return await prisma.post.update({
    where: { id },
    data,
    include: {
      mediaFiles: true,
      comments: true,
      likes: true,
      shares: true,
      author: true,
    },
  });
};


// Delete Post by ID
export const deletePost = async (id: string): Promise<Posts> => {
  return await prisma.post.delete({
    where: { id },
    include: {
      mediaFiles: true,
      comments: true,
      likes: true,
      shares: true,
    },
  });
};


// Delete Post media files by PostId
export const deleteMediaFilesByPostId = async (postId: string) => {
  // This assumes you have a `mediaFiles` table with a `postId` column
  return await prisma.mediaFile.deleteMany({
    where: {
      postId: postId,
    },
  });
};
