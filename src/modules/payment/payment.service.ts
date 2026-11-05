
import {
    PaymentStatus,
    QuotationStatus,
    PropertyStatus,
} from "../../generated/prisma/client";

import { prisma } from "../../config/database";
import { createRazorpayPaymentLink } from "./razorpay.service";

interface CreatePaymentInput {
    quotationId: string;
    amount: number;
    expiresAt?: string;
    notes?: Record<string, string>;
}

export const createPayment = async (
    input: CreatePaymentInput,
    adminId: string
) => {
    // 1. Find quotation with property and owner
    const quotation = await prisma.quotation.findUnique({
        where: {
            id: input.quotationId,
        },
        include: {
            property: {
                include: {
                    owner: true,
                },
            },
        },
    });

    if (!quotation) {
        throw new Error("Quotation not found");
    }

    // 2. Validate quotation status
    if (quotation.status !== QuotationStatus.ACCEPTED) {
        throw new Error("Only accepted quotations can be paid");
    }

    // 3. Validate property status
    if (quotation.property.status !== PropertyStatus.VERIFIED) {
        throw new Error("Property must be verified before payment");
    }

    // 4. Always derive amount from database
    const amount = Number(quotation.totalAmount);

    if (amount !== input.amount) {
        throw new Error("Payment amount must match quotation total");
    }

    // 5. Get seller details
    const owner = quotation.property.owner;

    if (!owner.email) {
        throw new Error("Seller email is required");
    }

    if (!owner.phone) {
        throw new Error("Seller phone number is required");
    }

    // 6. Validate expiry date
    const expiresAt = input.expiresAt
        ? new Date(input.expiresAt)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (
        Number.isNaN(expiresAt.getTime()) ||
        expiresAt <= new Date()
    ) {
        throw new Error("Invalid payment link expiry date");
    }

    // 7. Check existing payment
    const existingPayment = await prisma.payment.findFirst({
        where: {
            quotationId: quotation.id,
            status: {
                in: [
                    PaymentStatus.PENDING,
                    PaymentStatus.LINK_CREATED,
                    PaymentStatus.PAID,
                ],
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    // 8. Already paid - stop
    if (existingPayment?.status === PaymentStatus.PAID) {
        throw new Error("This quotation is already paid");
    }

    // 9. Link already exists - return existing link
    if (
        existingPayment?.status === PaymentStatus.LINK_CREATED &&
        existingPayment.paymentLink
    ) {
        return existingPayment;
    }

    // 10. Reuse PENDING payment or create new payment
    const payment = existingPayment ??
        await prisma.payment.create({
            data: {
                quotationId: quotation.id,
                paymentNumber: `PAY-${Date.now()}`,
                amount,
                gateway: "RAZORPAY",
                status: PaymentStatus.PENDING,
                sharedById: adminId,
                notes: input.notes
                    ? JSON.stringify(input.notes)
                    : null,
            },
        });

    try {
        // 11. Create Razorpay payment link
        const razorpayLink = await createRazorpayPaymentLink({
            amount,
            paymentNumber: payment.paymentNumber,
            description: `Payment for ${quotation.quotationNumber}`,
            customer: {
                name: owner.name,
                email: owner.email,
                contact: owner.phone,
            },
            expiresAt,
            notes: {
                paymentId: payment.id,
                quotationId: quotation.id,
                paymentNumber: payment.paymentNumber,
                ...(input.notes ?? {}),
            },
        });

        // 12. Validate Razorpay response
        if (!razorpayLink.id || !razorpayLink.short_url) {
            throw new Error(
                "Razorpay did not return a valid payment URL"
            );
        }

        // 13. Save Razorpay details in database
        const updatedPayment = await prisma.payment.update({
            where: {
                id: payment.id,
            },
            data: {
                paymentLink: razorpayLink.short_url,
                razorpayPaymentLinkId: razorpayLink.id,
                razorpayPaymentStatus: razorpayLink.status,
                paymentLinkExpiresAt: expiresAt,
                paymentLinkSharedAt: new Date(),
                sharedById: adminId,
                status: PaymentStatus.LINK_CREATED,
            },
        });

        console.log("PAYMENT LINK SAVED SUCCESSFULLY:", {
            paymentId: updatedPayment.id,
            paymentNumber: updatedPayment.paymentNumber,
            paymentLink: updatedPayment.paymentLink,
        });

        return updatedPayment;

    } catch (error) {
        console.error("PAYMENT LINK CREATION FAILED:", error);

        // 14. Keep failed record for audit
        await prisma.payment.update({
            where: {
                id: payment.id,
            },
            data: {
                status: PaymentStatus.FAILED,
            },
        }).catch((dbError) => {
            console.error("Failed to update payment:", dbError);
        });

        throw error;
    }
};
