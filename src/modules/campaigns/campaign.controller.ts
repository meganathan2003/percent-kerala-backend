import { Request, Response } from "express";
import { z } from "zod";
import * as service from "./campaign.service";

const createSchema = z.object({
    quotationId: z.string().uuid(),
    campaignName: z.string().min(3),
    platform: z.string().min(2),
    objective: z.string().optional(),
    targetAudience: z.string().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    notes: z.string().optional(),
});

const rejectSchema = z.object({
    rejectionReason: z.string().min(5),
});

export async function createCampaign(req: Request, res: Response) {
    try {
        const data = createSchema.parse(req.body);

        const campaign = await service.createCampaign({
            ...data,
            createdById: req.user!.id,
        });

        res.status(201).json({
            success: true,
            message: "Campaign created as draft",
            data: campaign,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Campaign creation failed",
        });
    }
}

export async function submitCampaign(req: Request, res: Response) {
    try {
        const campaign = await service.submitCampaign(String(req.params.id));

        res.status(200).json({
            success: true,
            message: "Campaign submitted for Super Admin approval",
            data: campaign,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Campaign submission failed",
        });
    }
}

export async function approveCampaign(req: Request, res: Response) {
    try {
        const campaign = await service.approveCampaign(
            String(req.params.id),
            req.user!.id,
        );

        res.status(200).json({
            success: true,
            message: "Campaign approved",
            data: campaign,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Campaign approval failed",
        });
    }
}

export async function rejectCampaign(req: Request, res: Response) {
    try {
        const { rejectionReason } = rejectSchema.parse(req.body);

        const campaign = await service.rejectCampaign(
            String(req.params.id),
            req.user!.id,
            rejectionReason,
        );

        res.status(200).json({
            success: true,
            message: "Campaign rejected",
            data: campaign,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Campaign rejection failed",
        });
    }
}

export async function launchCampaign(req: Request, res: Response) {
    try {
        const campaign = await service.launchCampaign(
            String(req.params.id),
            req.user!.id,
        );

        res.status(200).json({
            success: true,
            message: "Campaign launched",
            data: campaign,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Campaign launch failed",
        });
    }
}

export async function getAllCampaigns(req: Request, res: Response) {
    try {
        const campaigns = await service.getAllCampaigns();

        res.status(200).json({
            success: true,
            count: campaigns.length,
            data: campaigns,
        });
    } catch {
        res.status(500).json({
            success: false,
            message: "Unable to fetch campaigns",
        });
    }
}

export async function getCampaignById(req: Request, res: Response) {
    try {
        const campaign = await service.getCampaignById(String(req.params.id));

        res.status(200).json({
            success: true,
            data: campaign,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error instanceof Error ? error.message : "Campaign not found",
        });
    }
}