
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { AdminRole } from "../generated/prisma/client";
import { prisma } from "../config/database";

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                role: AdminRole;
            };
        }
    }
}

function getJwtSecret(): string {
    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
        throw new Error("JWT_ACCESS_SECRET is not configured");
    }

    return secret;
}

export async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const token = req.cookies?.accessToken;

        if (!token || typeof token !== "string") {
            return res.status(401).json({
                success: false,
                message: "Access token required",
            });
        }

        const decoded = jwt.verify(token, getJwtSecret());

        if (
            typeof decoded === "string" ||
            decoded.type !== "access" ||
            typeof decoded.sub !== "string" ||
            typeof decoded.tokenVersion !== "number" ||
            typeof decoded.role !== "string"
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid access token",
            });
        }

        const user = await prisma.adminUser.findUnique({
            where: {
                id: decoded.sub,
            },
            select: {
                id: true,
                role: true,
                isActive: true,
                tokenVersion: true,
            },
        });

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: "Account inactive or not found",
            });
        }

        if (decoded.tokenVersion !== user.tokenVersion) {
            return res.status(401).json({
                success: false,
                message: "Session expired. Please login again.",
            });
        }

        if (decoded.role !== user.role) {
            return res.status(401).json({
                success: false,
                message: "Invalid user role in token",
            });
        }

        req.user = {
            id: user.id,
            role: user.role,
        };

        return next();

    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired access token",
            });
        }

        if (
            error instanceof Error &&
            error.message === "JWT_ACCESS_SECRET is not configured"
        ) {
            console.error("JWT CONFIGURATION ERROR:", error.message);

            return res.status(500).json({
                success: false,
                message: "Authentication configuration error",
            });
        }

        console.error("AUTH MIDDLEWARE ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

export function authorize(...allowedRoles: AdminRole[]) {
    return (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Forbidden",
            });
        }

        return next();
    };
}
