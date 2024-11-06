import { PrismaClient, Admin } from '@prisma/client';

const prisma = new PrismaClient();

// Create Admin
export const createAdmin = async (data: Omit<Admin, 'id' | 'createdAt' | 'updatedAt'>): Promise<Admin> => {
  return await prisma.admin.create({ data });
};

// Get One Admin by ID
export const getAdminById = async (id: string): Promise<Admin | null> => {
  return await prisma.admin.findUnique({ where: { id } });
};

// Get All Admins
export const getAllAdmins = async (): Promise<Admin[]> => {
  return await prisma.admin.findMany();
};

// Update Admin by ID
export const updateAdmin = async (id: string, data: Partial<Admin>): Promise<Admin> => {
  return await prisma.admin.update({
    where: { id },
    data,
  });
};

// Delete Admin by ID
export const deleteAdmin = async (id: string): Promise<Admin> => {
  return await prisma.admin.delete({ where: { id } });
};
