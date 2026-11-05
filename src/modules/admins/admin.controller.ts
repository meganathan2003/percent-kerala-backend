import { Request, Response } from "express";
import { z } from "zod";
import { AdminRole } from "../../generated/prisma/client";
import * as adminService from "./admin.service";

const createAdminSchema = z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email(),
    password: z.string().min(12),
    role: z.enum([AdminRole.SALES, AdminRole.OPERATIONS]),
});

export async function createAdmin(req: Request, res: Response) {
    try {
        const data = createAdminSchema.parse(req.body);

        const admin = await adminService.createAdmin(data);

        return res.status(201).json({
            success: true,
            message: "Admin created successfully",
            data: admin,
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Invalid input",
                errors: error.issues,
            });
        }

        if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
            return res.status(409).json({
                success: false,
                message: "Email already exists",
            });
        }

        if (error instanceof Error && error.message === "INVALID_ROLE") {
            return res.status(400).json({
                success: false,
                message: "Only SALES and OPERATIONS roles can be created",
            });
        }

        console.error("CREATE ADMIN ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

export async function getAllAdmins(req: Request, res: Response) {
    try {
        const admins = await adminService.getAllAdmins();

        return res.status(200).json({
            success: true,
            message: "Admins fetched successfully",
            data: admins,
        });
    } catch (error) {
        console.error("GET ADMINS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

const updateAdminSchema = z.object({
    name: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().email().optional(),
    role: z.enum([
        AdminRole.SALES,
        AdminRole.OPERATIONS
    ]).optional(),
}).refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field is required" }
);

export async function updateAdmin(req: Request, res: Response) {
    try {
        const data = updateAdminSchema.parse(req.body);

        const admin = await adminService.updateAdmin(
            String(req.params.id),
            data
        );


        return res.status(200).json({
            success: true,
            message: "Admin updated successfully",
            data: admin,
        });

    } catch (error) {
        if (error instanceof z.ZodError) {

            if (
                error instanceof Error &&
                error.message === "EMAIL_ALREADY_EXISTS"
            ) {
                return res.status(409).json({
                    success: false,
                    message: "Email already exists",
                });
            }
            return res.status(400).json({
                success: false,
                message: "Invalid input",
                errors: error.issues,
            });
        }

        if (error instanceof Error && error.message === "ADMIN_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Admin not found",
            });
        }

        if (error instanceof Error && error.message === "INVALID_ROLE") {
            return res.status(400).json({
                success: false,
                message: "Invalid role",
            });
        }

        if (error instanceof Error && error.message === "CANNOT_MODIFY_SUPER_ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Cannot modify Super Admin through this endpoint",
            });
        }

        console.error("UPDATE ADMIN ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

const updateStatusSchema = z.object({
    isActive: z.boolean(),
});

export async function updateAdminStatus(req: Request, res: Response) {
    try {
        const data = updateStatusSchema.parse(req.body);

        const admin = await adminService.updateAdminStatus(
            String(req.params.id),
            data.isActive
        );

        return res.status(200).json({
            success: true,
            message: "Admin status updated successfully",
            data: admin,
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Invalid input",
                errors: error.issues,
            });
        }

        if (error instanceof Error && error.message === "ADMIN_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Admin not found",
            });
        }

        if (error instanceof Error && error.message === "CANNOT_MODIFY_SUPER_ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Cannot deactivate Super Admin",
            });
        }

        console.error("UPDATE ADMIN STATUS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

export async function getAdminById(req: Request, res: Response) {
    try {
        const admin = await adminService.getAdminById(
            String(req.params.id)
        );

        return res.status(200).json({
            success: true,
            message: "Admin fetched successfully",
            data: admin,
        });

    } catch (error) {
        if (error instanceof Error && error.message === "ADMIN_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Admin not found",
            });
        }

        console.error("GET ADMIN ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

const resetPasswordSchema = z.object({
    newPassword: z.string().min(12).max(128),
});

export async function resetAdminPassword(req: Request, res: Response) {
    try {
        const data = resetPasswordSchema.parse(req.body);

        const admin = await adminService.resetAdminPassword(
            String(req.params.id),
            data.newPassword
        );

        return res.status(200).json({
            success: true,
            message: "Password reset successfully",
            data: admin,
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Invalid password",
                errors: error.issues,
            });
        }

        if (error instanceof Error && error.message === "ADMIN_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Admin not found",
            });
        }

        if (error instanceof Error && error.message === "CANNOT_RESET_SUPER_ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Cannot reset Super Admin password through this endpoint",
            });
        }

        console.error("RESET PASSWORD ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}