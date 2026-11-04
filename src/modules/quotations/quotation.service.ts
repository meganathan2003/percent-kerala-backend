import { prisma } from "../../config/database";
import { QuotationStatus } from "../../generated/prisma/client";

interface CreateQuotationInput {
    propertyId: string;
    packageName: string;
    serviceFee: number;
    advertisementBudget: number;
    additionalCharges?: number;
    validUntil: Date;
    notes?: string;
    createdById: string;
}

export async function createQuotation(data: CreateQuotationInput) {
    const property = await prisma.property.findUnique({
        where: { id: data.propertyId },
    });

    if (!property) throw new Error("PROPERTY_NOT_FOUND");

    if (property.status !== "VERIFIED") {
        throw new Error("PROPERTY_NOT_VERIFIED");
    }

    const additionalCharges = data.additionalCharges ?? 0;

    const totalAmount =
        data.serviceFee +
        data.advertisementBudget +
        additionalCharges;

    if (
        data.serviceFee < 0 ||
        data.advertisementBudget < 0 ||
        additionalCharges < 0 ||
        totalAmount <= 0
    ) {
        throw new Error("INVALID_QUOTATION_AMOUNT");
    }

    if (data.validUntil <= new Date()) {
        throw new Error("INVALID_VALIDITY_DATE");
    }

    return prisma.quotation.create({
        data: {
            propertyId: data.propertyId,
            quotationNumber: `PC-${Date.now()}`,
            packageName: data.packageName,
            serviceFee: data.serviceFee,
            advertisementBudget: data.advertisementBudget,
            additionalCharges,
            totalAmount,
            validUntil: data.validUntil,
            notes: data.notes,
            createdById: data.createdById,
        },
    });
}

export async function getAllQuotations() {
    return prisma.quotation.findMany({
        include: {
            property: {
                include: { owner: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });
}

export async function getQuotationById(id: string) {
    const quotation = await prisma.quotation.findUnique({
        where: { id },
        include: {
            property: {
                include: { owner: true },
            },
        },
    });

    if (!quotation) throw new Error("QUOTATION_NOT_FOUND");

    return quotation;
}

export async function updateQuotationStatus(
    id: string,
    status: QuotationStatus
) {
    const quotation = await prisma.quotation.findUnique({
        where: { id },
    });

    if (!quotation) throw new Error("QUOTATION_NOT_FOUND");

    if (quotation.status !== "DRAFT" && quotation.status !== "SENT") {
        throw new Error("QUOTATION_CANNOT_BE_UPDATED");
    }

    if (!["SENT", "ACCEPTED", "REJECTED"].includes(status)) {
        throw new Error("INVALID_QUOTATION_STATUS");
    }

    if (quotation.validUntil <= new Date() && status !== "REJECTED") {
        throw new Error("QUOTATION_EXPIRED");
    }

    return prisma.quotation.update({
        where: { id },
        data: { status },
    });
}