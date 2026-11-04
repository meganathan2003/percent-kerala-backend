import { prisma } from "../../config/database";
import {
    CampaignStatus,
    PaymentStatus,
    QuotationStatus,
} from "../../generated/prisma/client";

interface CreateCampaignInput {
    quotationId: string;
    campaignName: string;
    platform: string;
    objective?: string;
    targetAudience?: string;
    startDate: Date;
    endDate: Date;
    notes?: string;
    createdById: string;
}

async function getEligibleQuotation(quotationId: string) {
    const quotation = await prisma.quotation.findUnique({
        where: { id: quotationId },
        include: {
            property: true,
            payments: true,
        },
    });

    if (!quotation) throw new Error("QUOTATION_NOT_FOUND");

    if (quotation.status !== QuotationStatus.ACCEPTED) {
        throw new Error("QUOTATION_NOT_ACCEPTED");
    }

    if (quotation.property.status !== "VERIFIED") {
        throw new Error("PROPERTY_NOT_VERIFIED");
    }

    const verifiedAmount = quotation.payments
        .filter((payment) => payment.status === PaymentStatus.VERIFIED)
        .reduce((total, payment) => total + Number(payment.amount), 0);

    if (verifiedAmount < Number(quotation.totalAmount)) {
        throw new Error("FULL_PAYMENT_NOT_VERIFIED");
    }

    return quotation;
}

export async function createCampaign(data: CreateCampaignInput) {
    await getEligibleQuotation(data.quotationId);

    if (data.startDate >= data.endDate) {
        throw new Error("INVALID_CAMPAIGN_DATES");
    }

    const existingCampaign = await prisma.campaign.findUnique({
        where: { quotationId: data.quotationId },
    });

    if (existingCampaign) {
        throw new Error("CAMPAIGN_ALREADY_EXISTS");
    }

    return prisma.campaign.create({
        data: {
            quotationId: data.quotationId,
            campaignName: data.campaignName,
            platform: data.platform,
            objective: data.objective,
            targetAudience: data.targetAudience,
            startDate: data.startDate,
            endDate: data.endDate,
            notes: data.notes,
            createdById: data.createdById,
        },
        include: {
            quotation: {
                include: { property: true },
            },
        },
    });
}

export async function submitCampaign(id: string) {
    const campaign = await prisma.campaign.findUnique({
        where: { id },
    });

    if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");

    if (
        campaign.status !== CampaignStatus.DRAFT &&
        campaign.status !== CampaignStatus.REJECTED
    ) {
        throw new Error("CAMPAIGN_CANNOT_BE_SUBMITTED");
    }

    // Recheck payment and property eligibility before submission.
    await getEligibleQuotation(campaign.quotationId);

    return prisma.campaign.update({
        where: { id },
        data: {
            status: CampaignStatus.PENDING_APPROVAL,
            submittedAt: new Date(),
            rejectionReason: null,
        },
    });
}

export async function approveCampaign(id: string, adminId: string) {
    const campaign = await prisma.campaign.findUnique({
        where: { id },
    });

    if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");

    if (campaign.status !== CampaignStatus.PENDING_APPROVAL) {
        throw new Error("CAMPAIGN_NOT_PENDING_APPROVAL");
    }

    await getEligibleQuotation(campaign.quotationId);

    return prisma.campaign.update({
        where: { id },
        data: {
            status: CampaignStatus.APPROVED,
            approvedById: adminId,
            approvedAt: new Date(),
            rejectionReason: null,
        },
    });
}

export async function rejectCampaign(
    id: string,
    adminId: string,
    rejectionReason: string,
) {
    const campaign = await prisma.campaign.findUnique({
        where: { id },
    });

    if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");

    if (campaign.status !== CampaignStatus.PENDING_APPROVAL) {
        throw new Error("CAMPAIGN_NOT_PENDING_APPROVAL");
    }

    return prisma.campaign.update({
        where: { id },
        data: {
            status: CampaignStatus.REJECTED,
            rejectedById: adminId,
            rejectedAt: new Date(),
            rejectionReason,
        },
    });
}

export async function launchCampaign(id: string, adminId: string) {
    const campaign = await prisma.campaign.findUnique({
        where: { id },
    });

    if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");

    if (campaign.status !== CampaignStatus.APPROVED) {
        throw new Error("CAMPAIGN_NOT_APPROVED");
    }

    if (campaign.startDate > new Date()) {
        throw new Error("CAMPAIGN_START_DATE_NOT_REACHED");
    }

    if (campaign.endDate <= new Date()) {
        throw new Error("CAMPAIGN_ALREADY_EXPIRED");
    }

    await getEligibleQuotation(campaign.quotationId);

    return prisma.campaign.update({
        where: { id },
        data: {
            status: CampaignStatus.LIVE,
            launchedById: adminId,
            launchedAt: new Date(),
        },
    });
}

export async function getAllCampaigns() {
    return prisma.campaign.findMany({
        include: {
            quotation: {
                include: {
                    property: {
                        include: { owner: true },
                    },
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });
}

export async function getCampaignById(id: string) {
    const campaign = await prisma.campaign.findUnique({
        where: { id },
        include: {
            quotation: {
                include: {
                    property: {
                        include: { owner: true },
                    },
                    payments: true,
                },
            },
        },
    });

    if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");

    return campaign;
}