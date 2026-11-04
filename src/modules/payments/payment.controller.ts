import { Request, Response } from "express";
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

export async function createPayment(req: Request, res: Response) {
    try {
        const data = createPaymentSchema.parse(req.body);
        const payment = await service.createPayment(data);

        res.status(201).json({
            success: true,
            message: "Payment record created",
            data: payment,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Payment creation failed",
        });
    }
}

export async function sharePaymentLink(req: Request, res: Response) {
    try {
        const payment = await service.sharePaymentLink(
            String(req.params.id),
            req.user!.id,
        );

        res.status(200).json({
            success: true,
            message: "Payment link generated and shared",
            data: payment,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Unable to share payment link",
        });
    }
}

export async function submitPaymentProof(req: Request, res: Response) {
    try {
        const data = proofSchema.parse(req.body);
        const payment = await service.submitPaymentProof(
            String(req.params.id),
            data,
        );

        res.status(200).json({
            success: true,
            message: "Payment proof submitted for verification",
            data: payment,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Unable to submit payment proof",
        });
    }
}

export async function reviewPayment(req: Request, res: Response) {
    try {
        const data = reviewSchema.parse(req.body);

        const payment = await service.reviewPayment(
            String(req.params.id),
            data.status as PaymentStatus,
            req.user!.id,
            data.rejectionReason,
        );

        res.status(200).json({
            success: true,
            message: `Payment ${data.status.toLowerCase()}`,
            data: payment,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Unable to review payment",
        });
    }
}

export async function getAllPayments(req: Request, res: Response) {
    try {
        const payments = await service.getAllPayments();

        res.status(200).json({
            success: true,
            count: payments.length,
            data: payments,
        });
    } catch {
        res.status(500).json({
            success: false,
            message: "Unable to fetch payments",
        });
    }
}

export async function getPaymentById(req: Request, res: Response) {
    try {
        const payment = await service.getPaymentById(String(req.params.id));

        res.status(200).json({
            success: true,
            data: payment,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error instanceof Error ? error.message : "Payment not found",
        });
    }
}