import { prisma } from "../../config/database";
import {
    CampaignStatus,
    PaymentStatus,
    PropertyStatus,
    QuotationStatus,
    VerificationStatus,
} from "../../generated/prisma/client";

export async function getDashboardOverview() {
    const [
        totalProperties,
        pendingProperties,
        verifiedProperties,
        rejectedProperties,
        totalOwners,
        totalQuotations,
        acceptedQuotations,
        pendingPayments,
        verifiedPayments,
        pendingCampaigns,
        liveCampaigns,
        totalAdmins,
    ] = await Promise.all([
        prisma.property.count(),

        prisma.property.count({
            where: {
                status: {
                    in: [
                        PropertyStatus.SUBMITTED,
                        PropertyStatus.UNDER_REVIEW,
                        PropertyStatus.VERIFICATION,
                    ],
                },
            },
        }),

        prisma.property.count({
            where: { status: PropertyStatus.VERIFIED },
        }),

        prisma.property.count({
            where: { status: PropertyStatus.REJECTED },
        }),

        prisma.owner.count(),

        prisma.quotation.count(),

        prisma.quotation.count({
            where: { status: QuotationStatus.ACCEPTED },
        }),

        prisma.payment.count({
            where: {
                status: PaymentStatus.UNDER_REVIEW,
            },
        }),

        prisma.payment.aggregate({
            where: { status: PaymentStatus.VERIFIED },
            _sum: { amount: true },
        }),

        prisma.campaign.count({
            where: { status: CampaignStatus.PENDING_APPROVAL },
        }),

        prisma.campaign.count({
            where: { status: CampaignStatus.LIVE },
        }),

        prisma.adminUser.count({
            where: { isActive: true },
        }),
    ]);

    return {
        properties: {
            total: totalProperties,
            pending: pendingProperties,
            verified: verifiedProperties,
            rejected: rejectedProperties,
        },

        owners: {
            total: totalOwners,
        },

        quotations: {
            total: totalQuotations,
            accepted: acceptedQuotations,
        },

        payments: {
            pendingVerification: pendingPayments,
            totalVerifiedAmount: Number(
                verifiedPayments._sum.amount ?? 0,
            ),
        },

        campaigns: {
            pendingApproval: pendingCampaigns,
            live: liveCampaigns,
        },

        admins: {
            active: totalAdmins,
        },
    };
}

export async function getRecentProperties() {
    return prisma.property.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
            owner: true,
            verification: true,
        },
    });
}

export async function getPendingPayments() {
    return prisma.payment.findMany({
        where: {
            status: PaymentStatus.UNDER_REVIEW,
        },
        include: {
            quotation: {
                include: {
                    property: {
                        include: { owner: true },
                    },
                },
            },
        },
        orderBy: { createdAt: "asc" },
    });
}

export async function getPendingCampaigns() {
    return prisma.campaign.findMany({
        where: {
            status: CampaignStatus.PENDING_APPROVAL,
        },
        include: {
            quotation: {
                include: {
                    property: {
                        include: { owner: true },
                    },
                },
            },
        },
        orderBy: { submittedAt: "asc" },
    });
}

export async function getRecentQuotations() {
    return prisma.quotation.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
            property: {
                include: { owner: true },
            },
        },
    });
}