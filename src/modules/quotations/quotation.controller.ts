import { Request, Response } from "express";
import { z } from "zod";
import { QuotationStatus } from "../../generated/prisma/client";
import * as quotationService from "./quotation.service";

const createSchema = z.object({
    propertyId: z.string().uuid(),
    packageName: z.string().min(2),
    serviceFee: z.number().nonnegative(),
    advertisementBudget: z.number().nonnegative(),
    additionalCharges: z.number().nonnegative().optional(),
    validUntil: z.coerce.date(),
    notes: z.string().optional(),
});

const statusSchema = z.object({
    status: z.nativeEnum(QuotationStatus),
});

function handleError(res: Response, error: unknown) {
    const message =
        error instanceof Error ? error.message : "INTERNAL_SERVER_ERROR";

    const statusCode =
        message === "PROPERTY_NOT_FOUND" ||
            message === "QUOTATION_NOT_FOUND"
            ? 404
            : [
                "PROPERTY_NOT_VERIFIED",
                "INVALID_QUOTATION_AMOUNT",
                "INVALID_VALIDITY_DATE",
                "INVALID_QUOTATION_STATUS",
                "QUOTATION_CANNOT_BE_UPDATED",
                "QUOTATION_EXPIRED",
            ].includes(message)
                ? 400
                : 500;

    return res.status(statusCode).json({
        success: false,
        message,
    });
}

export async function createQuotation(req: Request, res: Response) {
    try {
        const data = createSchema.parse(req.body);

        const quotation = await quotationService.createQuotation({
            ...data,
            createdById: req.user!.id,
        });

        return res.status(201).json({
            success: true,
            message: "Quotation created successfully",
            data: quotation,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: error.issues,
            });
        }

        return handleError(res, error);
    }
}

export async function getAllQuotations(req: Request, res: Response) {
    try {
        const quotations = await quotationService.getAllQuotations();

        return res.status(200).json({
            success: true,
            data: quotations,
        });
    } catch (error) {
        return handleError(res, error);
    }
}

export async function getQuotationById(req: Request, res: Response) {
    try {
        const quotation = await quotationService.getQuotationById(
            String(req.params.id)
        );

        return res.status(200).json({
            success: true,
            data: quotation,
        });
    } catch (error) {
        return handleError(res, error);
    }
}

export async function updateQuotationStatus(req: Request, res: Response) {
    try {
        const { status } = statusSchema.parse(req.body);

        const quotation = await quotationService.updateQuotationStatus(
            String(req.params.id),
            status
        );

        return res.status(200).json({
            success: true,
            message: "Quotation status updated successfully",
            data: quotation,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: error.issues,
            });
        }

        return handleError(res, error);
    }
}