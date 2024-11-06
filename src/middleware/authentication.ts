import express, { Request, Response, NextFunction } from "express";
import prisma from '../config/dbConfig';
import jwt, { JwtPayload } from 'jsonwebtoken';
import dotenv from "dotenv";

dotenv.config();


export interface AuthenticatedRequest extends Request {
    user?: { userId: string; isAdmin: boolean };
}

const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const hasAuthorization = req.headers.authorization;
        if (!hasAuthorization) {
            return res.status(400).json({
                message: 'Invalid authorization',
            });
        }

        const token = hasAuthorization.split(" ")[1];
        if (!token) {
            return res.status(404).json({
                message: "Token not found",
            });
        }

        const SECRET = process.env.SECRET as string;
        if (!SECRET) {
            return res.status(500).json({
                message: "Internal error: Secret key not defined",
            });
        }

        const decodedToken = jwt.verify(token, SECRET) as JwtPayload & { userId: string };

        // Use Prisma to find the user by ID
        const user = await prisma.user.findUnique({ where: { id: decodedToken.userId } });
        if (!user) {
            return res.status(404).json({
                message: "Not authorized: User not found",
            });
        }

        // Assuming `isAdmin` is a property on the User model
        req.user = { userId: decodedToken.userId, isAdmin: user.isAdmin };


        next();
    } catch (error: any) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                message: 'Session timeout, please login to continue',
            });
        }
        return res.status(500).json({
            error: "Authentication Error: " + error.message,
        });
    }
};

// Middleware to restrict access to Admins only
const Admin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    authenticate(req, res, async () => {
        if (req.user?.isAdmin) {
            next();
        } else {
            return res.status(403).json({
                message: "Not an Admin! User not authorized",
            });
        }
    });
};

export { authenticate, Admin };