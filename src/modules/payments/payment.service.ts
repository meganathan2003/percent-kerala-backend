import { prisma } from "../../config/database";
import {
    PaymentStatus,
    QuotationStatus,
} from "../../generated/prisma/client";

interface CreatePaymentInput {
    quotationId: string;
    amount: number;
}

export async function createPayment(data: CreatePaymentInput) {
    const quotation = await prisma.quotation.findUnique({
        where: { id: data.quotationId },
    });

    if (!quotation) throw new Error("QUOTATION_NOT_FOUND");

    if (quotation.status !== QuotationStatus.ACCEPTED) {
        throw new Error("QUOTATION_NOT_ACCEPTED");
    }

    if (!Number.isFinite(data.amount) || data.amount <= 0) {
        throw new Error("INVALID_PAYMENT_AMOUNT");
    }

    const existingPayments = await prisma.payment.findMany({
        where: {
            quotationId: data.quotationId,
            status: {
                in: [
                    PaymentStatus.PENDING,
                    PaymentStatus.UNDER_REVIEW,
                    PaymentStatus.VERIFIED,
                ],
            },
        },
        select: { amount: true },
    });

    const alreadyAllocated = existingPayments.reduce(
        (total, payment) => total + Number(payment.amount),
        0,
    );

    const remainingAmount =
        Number(quotation.totalAmount) - alreadyAllocated;

    if (data.amount > remainingAmount) {
        throw new Error("PAYMENT_EXCEEDS_REMAINING_AMOUNT");
    }

    return prisma.payment.create({
        data: {
            quotationId: data.quotationId,
            paymentNumber: `PAY-${Date.now()}`,
            amount: data.amount,
            method: "UPI",
            status: PaymentStatus.PENDING,
        },
    });
}

export async function sharePaymentLink(
    paymentId: string,
    adminId: string,
) {
    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
    });

    if (!payment) throw new Error("PAYMENT_NOT_FOUND");

    if (payment.status !== PaymentStatus.PENDING) {
        throw new Error("PAYMENT_LINK_CANNOT_BE_SHARED");
    }

    const config = await prisma.paymentConfiguration.findFirst({
        where: { isActive: true },
    });

    if (!config) throw new Error("PAYMENT_CONFIGURATION_NOT_FOUND");

    const amount = Number(payment.amount).toFixed(2);

    const paymentLink =
        `upi://pay?pa=${encodeURIComponent(config.upiId)}` +
        `&pn=${encodeURIComponent(config.upiName)}` +
        `&am=${amount}` +
        `&cu=INR` +
        `&tn=${encodeURIComponent(payment.paymentNumber)}`;

    return prisma.payment.update({
        where: { id: paymentId },
        data: {
            paymentLink,
            paymentLinkSharedAt: new Date(),
            sharedById: adminId,
        },
    });
}

interface SubmitProofInput {
    transactionReference: string;
    paymentProofUrl?: string;
    paymentProofId?: string;
    paidAt?: Date;
}

export async function submitPaymentProof(
    paymentId: string,
    data: SubmitProofInput,
) {
    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
    });

    if (!payment) throw new Error("PAYMENT_NOT_FOUND");

    if (payment.status !== PaymentStatus.PENDING) {
        throw new Error("PAYMENT_PROOF_CANNOT_BE_SUBMITTED");
    }

    if (!payment.paymentLink) {
        throw new Error("PAYMENT_LINK_NOT_SHARED");
    }

    return prisma.payment.update({
        where: { id: paymentId },
        data: {
            transactionReference: data.transactionReference,
            paymentProofUrl: data.paymentProofUrl,
            paymentProofId: data.paymentProofId,
            paidAt: data.paidAt ?? new Date(),
            status: PaymentStatus.UNDER_REVIEW,
        },
    });
}

export async function reviewPayment(
    paymentId: string,
    status: PaymentStatus,
    adminId: string,
    rejectionReason?: string,
) {
    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
    });

    if (!payment) throw new Error("PAYMENT_NOT_FOUND");

    if (payment.status !== PaymentStatus.UNDER_REVIEW) {
        throw new Error("PAYMENT_NOT_READY_FOR_REVIEW");
    }

    if (
        status !== PaymentStatus.VERIFIED &&
        status !== PaymentStatus.REJECTED
    ) {
        throw new Error("INVALID_PAYMENT_REVIEW_STATUS");
    }

    if (status === PaymentStatus.REJECTED && !rejectionReason?.trim()) {
        throw new Error("REJECTION_REASON_REQUIRED");
    }

    return prisma.payment.update({
        where: { id: paymentId },
        data: {
            status,
            verifiedById: adminId,
            verifiedAt: new Date(),
            rejectionReason:
                status === PaymentStatus.REJECTED ? rejectionReason : null,
        },
    });
}

export async function getAllPayments() {
    return prisma.payment.findMany({
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

export async function getPaymentById(id: string) {
    const payment = await prisma.payment.findUnique({
        where: { id },
        include: {
            quotation: {
                include: {
                    property: {
                        include: { owner: true },
                    },
                },
            },
        },
    });

    if (!payment) throw new Error("PAYMENT_NOT_FOUND");

    return payment;
}