import { Request, Response } from "express";
import { z } from "zod";
import * as service from "./payment-configuration.service";

const configSchema = z.object({
    upiId: z.string().min(3),
    upiName: z.string().min(2),
    upiLink: z.string().optional(),
    qrCodeUrl: z.string().url().optional(),
    qrCodeId: z.string().optional(),
});

export async function createConfiguration(req: Request, res: Response) {
    try {
        const data = configSchema.parse(req.body);

        const configuration = await service.createConfiguration({
            ...data,
            createdById: req.user!.id,
        });

        res.status(201).json({
            success: true,
            message: "Payment configuration created",
            data: configuration,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Something went wrong",
        });
    }
}

export async function getActiveConfiguration(req: Request, res: Response) {
    try {
        const configuration = await service.getActiveConfiguration();

        res.status(200).json({
            success: true,
            data: configuration,
        });
    } catch {
        res.status(500).json({
            success: false,
            message: "Unable to fetch payment configuration",
        });
    }
}

export async function updateConfiguration(req: Request, res: Response) {
    try {
        const data = configSchema.partial().parse(req.body);

        const configuration = await service.updateConfiguration(
            String(req.params.id),
            data,
        );

        res.status(200).json({
            success: true,
            message: "Payment configuration updated",
            data: configuration,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Something went wrong",
        });
    }
}