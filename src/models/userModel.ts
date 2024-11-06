import { PrismaClient, User } from '@prisma/client';

const prisma = new PrismaClient();

// Define a new type that excludes password
export type UserWithoutPassword = Omit<User, 'password'>;

// Create User
export const createUser = async (data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'isAdmin' | 'isVerified' | 'token' | 'pictureId'>): Promise<User> => {
  return await prisma.user.create({ data });
};

// Get One User by ID
export const getUserById = async (id: string): Promise<User | null> => {
  return await prisma.user.findUnique({ where: { id }, include: { userPicture: true } }); 
};

// Get One User by Email
export const getUserByEmail = async (email: string): Promise<User | null> => {
    return await prisma.user.findUnique({ where: { email } });
};

// Get All Users with optional sorting and selection
export const getUsers = async (orderBy?: { createdAt?: 'asc' | 'desc' }): Promise<UserWithoutPassword[]> => {
    return await prisma.user.findMany({
      orderBy,
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        isVerified: true,
        pictureId: true,
        token: true,
        createdAt: true,
        updatedAt: true,
        password: true,
      },
    });
  };

// Update User by ID
export const updateUserById = async (id: string, data: Partial<User>): Promise<User> => {
  return await prisma.user.update({
    where: { id },
    data,
    include: { userPicture: true }, // Include related picture
  });
};

// Delete User by ID
export const deleteUserById = async (id: string): Promise<User> => {
  return await prisma.user.delete({ where: { id } });
};


export const userWithPicture = async (id: string): Promise<User | null> => {
    return await prisma.user.findUnique({
    where: { id },
    include: { userPicture: true }, // Include related picture
  });
};