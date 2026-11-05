
import { z } from "zod";

export const createPaymentSchema = z.object({
    quotationId: z.string().uuid("Invalid quotation ID"),

    amount: z
        .number()
        .positive("Payment amount must be greater than zero")
        .max(100000000, "Payment amount is too large"),

    expiresAt: z
        .string()
        .datetime({ offset: true })
        .optional(),

    notes: z
        .record(z.string(), z.string())
        .optional(),
});

export const paymentIdParamSchema = z.object({
    id: z.string().uuid("Invalid payment ID"),
});

export const paymentListQuerySchema = z.object({
    status: z
        .enum([
            "PENDING",
            "LINK_CREATED",
            "PAID",
            "FAILED",
            "CANCELLED",
            "EXPIRED",
            "UNDER_REVIEW",
            "VERIFIED",
            "REJECTED",
            "REFUNDED",
        ])
        .optional(),

    page: z.coerce.number().int().positive().default(1),

    limit: z.coerce
        .number()
        .int()
        .positive()
        .max(100)
        .default(10),
});

export type CreatePaymentInput = z.infer<
    typeof createPaymentSchema
>;

export type PaymentIdParam = z.infer<
    typeof paymentIdParamSchema
>;

export type PaymentListQuery = z.infer<
    typeof paymentListQuerySchema
>;
