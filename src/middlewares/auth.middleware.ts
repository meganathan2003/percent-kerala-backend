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

export async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Access token required",
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET!
        );

        if (
            typeof decoded === "string" ||
            decoded.type !== "access" ||
            typeof decoded.sub !== "string"
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid access token",
            });
        }

        const user = await prisma.adminUser.findUnique({
            where: { id: decoded.sub },
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

        req.user = {
            id: user.id,
            role: user.role,
        };

        next();

    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired access token",
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
    return (req: Request, res: Response, next: NextFunction) => {
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

        next();
    };
}