
import { Request, Response } from "express";
import { z } from "zod";

import * as authService from "./auth.service";

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export async function login(req: Request, res: Response) {
    try {
        const data = loginSchema.parse(req.body);

        const result = await authService.login(
            data.email,
            data.password
        );

        res.cookie(
            "accessToken",
            result.token,
            result.cookieOptions
        );

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user: result.user,
                expiresIn: result.expiresIn,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Invalid input",
                errors: error.issues,
            });
        }

        if (
            error instanceof Error &&
            error.message === "INVALID_CREDENTIALS"
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        console.error("LOGIN ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

export async function me(req: Request, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const user = await authService.getCurrentAdmin(req.user.id);

        return res.status(200).json({
            success: true,
            message: "Admin session verified",
            data: { user },
        });
    } catch (error) {
        console.error("GET CURRENT ADMIN ERROR:", error);

        return res.status(401).json({
            success: false,
            message: "Invalid or expired session",
        });
    }
}

export async function logout(req: Request, res: Response) {
    res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production"
            ? "none"
            : "lax",
        path: "/",
    });

    return res.status(200).json({
        success: true,
        message: "Logout successful",
    });
}
