import { Request, Response } from "express";
import * as dashboardService from "./dashboard.service";

export async function getDashboardOverview(
    req: Request,
    res: Response,
) {
    try {
        const data = await dashboardService.getDashboardOverview();

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("Dashboard overview error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch dashboard overview",
        });
    }
}

export async function getRecentProperties(
    req: Request,
    res: Response,
) {
    try {
        const data = await dashboardService.getRecentProperties();

        res.status(200).json({
            success: true,
            count: data.length,
            data,
        });
    } catch {
        res.status(500).json({
            success: false,
            message: "Unable to fetch recent properties",
        });
    }
}

export async function getPendingPayments(
    req: Request,
    res: Response,
) {
    try {
        const data = await dashboardService.getPendingPayments();

        res.status(200).json({
            success: true,
            count: data.length,
            data,
        });
    } catch {
        res.status(500).json({
            success: false,
            message: "Unable to fetch pending payments",
        });
    }
}

export async function getPendingCampaigns(
    req: Request,
    res: Response,
) {
    try {
        const data = await dashboardService.getPendingCampaigns();

        res.status(200).json({
            success: true,
            count: data.length,
            data,
        });
    } catch {
        res.status(500).json({
            success: false,
            message: "Unable to fetch pending campaigns",
        });
    }
}

export async function getRecentQuotations(
    req: Request,
    res: Response,
) {
    try {
        const data = await dashboardService.getRecentQuotations();

        res.status(200).json({
            success: true,
            count: data.length,
            data,
        });
    } catch {
        res.status(500).json({
            success: false,
            message: "Unable to fetch recent quotations",
        });
    }
}