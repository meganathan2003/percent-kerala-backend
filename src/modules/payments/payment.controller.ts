
import type {
    Request,
    Response,
    NextFunction,
} from "express";

import { z } from "zod";
import { PaymentStatus } from "../../generated/prisma/client";
import * as service from "./payment.service";

const createPaymentSchema = z.object({
    quotationId: z.string().uuid(),
    amount: z.coerce.number().positive(),
});

const proofSchema = z.object({
    transactionReference: z.string().min(3),
    paymentProofUrl: z.string().url().optional(),
    paymentProofId: z.string().optional(),
    paidAt: z.coerce.date().optional(),
});

const reviewSchema = z.object({
    status: z.enum(["VERIFIED", "REJECTED"]),
    rejectionReason: z.string().optional(),
});

// Create manual payment record
export async function createPayment(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const data = createPaymentSchema.parse(req.body);

        const payment = await service.createPayment(data);

        return res.status(201).json({
            success: true,
            message: "Payment record created",
            data: payment,
        });
    } catch (error) {
        next(error);
    }
}

// Share payment link
export async function sharePaymentLink(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const payment = await service.sharePaymentLink(
            String(req.params.id),
            req.user!.id,
        );

        return res.status(200).json({
            success: true,
            message: "Payment link generated and shared",
            data: payment,
        });
    } catch (error) {
        next(error);
    }
}

// Submit payment proof
export async function submitPaymentProof(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const data = proofSchema.parse(req.body);

        const payment = await service.submitPaymentProof(
            String(req.params.id),
            data,
        );

        return res.status(200).json({
            success: true,
            message: "Payment proof submitted for verification",
            data: payment,
        });
    } catch (error) {
        next(error);
    }
}

// Review payment
export async function reviewPayment(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const data = reviewSchema.parse(req.body);

        const payment = await service.reviewPayment(
            String(req.params.id),
            data.status as PaymentStatus,
            req.user!.id,
            data.rejectionReason,
        );

        return res.status(200).json({
            success: true,
            message: `Payment ${data.status.toLowerCase()}`,
            data: payment,
        });
    } catch (error) {
        next(error);
    }
}

// Get all payments
export async function getAllPayments(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const payments = await service.getAllPayments();

        return res.status(200).json({
            success: true,
            count: payments.length,
            data: payments,
        });
    } catch (error) {
        next(error);
    }
}

// Get payment by ID
export async function getPaymentById(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const payment = await service.getPaymentById(
            String(req.params.id)
        );

        return res.status(200).json({
            success: true,
            data: payment,
        });
    } catch (error) {
        next(error);
    }
}
