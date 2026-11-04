import { Request, Response, NextFunction } from "express";
import { AdminRole } from "../generated/prisma/client";

export function authorize(...allowedRoles: AdminRole[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "You don't have permission to access this resource",
            });
        }

        next();
    };
}