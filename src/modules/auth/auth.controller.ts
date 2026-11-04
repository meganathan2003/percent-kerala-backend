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

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: result,
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