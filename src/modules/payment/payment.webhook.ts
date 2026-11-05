
import { Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import { verifyRazorpayWebhookSignature } from "./razorpay.service";

interface RazorpayWebhookRequest extends Request {
    rawBody?: Buffer;
}

interface RazorpayWebhookPayload {
    id: string;
    event: string;
    payload?: {
        payment_link?: {
            entity?: {
                id?: string;
                status?: string;
                amount?: number;
                amount_paid?: number;
            };
        };
        payment?: {
            entity?: {
                id?: string;
                status?: string;
            };
        };
    };
}

export const handleRazorpayWebhook = async (
    req: RazorpayWebhookRequest,
    res: Response
) => {
    try {
        console.log("\n========== RAZORPAY WEBHOOK RECEIVED ==========");

        // 1. Verify webhook signature
        const signature = req.headers["x-razorpay-signature"];

        if (typeof signature !== "string" || !req.rawBody) {
            console.error("Missing signature or raw request body");

            return res.status(400).json({
                success: false,
                message: "Invalid webhook request",
            });
        }

        const isValid = verifyRazorpayWebhookSignature(
            req.rawBody,
            signature
        );

        if (!isValid) {
            console.error("Webhook signature verification failed");

            return res.status(400).json({
                success: false,
                message: "Invalid webhook signature",
            });
        }

        // 2. Read webhook payload
        const event = req.body as RazorpayWebhookPayload;

        if (!event.id || !event.event) {
            console.error("Invalid webhook payload");

            return res.status(400).json({
                success: false,
                message: "Invalid webhook payload",
            });
        }

        console.log("Event ID:", event.id);
        console.log("Event Type:", event.event);

        // 3. Ignore unsupported events
        const supportedEvents = [
            "payment_link.paid",
            "payment_link.expired",
            "payment_link.cancelled",
        ];

        if (!supportedEvents.includes(event.event)) {
            console.log("Unsupported event ignored:", event.event);

            return res.status(200).json({
                success: true,
                message: "Event ignored",
            });
        }

        const paymentLink = event.payload?.payment_link?.entity;
        const paymentEntity = event.payload?.payment?.entity;

        if (!paymentLink?.id) {
            console.error("Payment link ID missing in webhook payload");

            return res.status(400).json({
                success: false,
                message: "Payment link details missing",
            });
        }

        console.log("Payment Link ID:", paymentLink.id);
        console.log("Payment Link Status:", paymentLink.status);
        console.log("Payment Amount:", paymentLink.amount);
        console.log("Amount Paid:", paymentLink.amount_paid);
        console.log("Razorpay Payment ID:", paymentEntity?.id);
        console.log("Razorpay Payment Status:", paymentEntity?.status);

        // 4. Process webhook inside transaction
        const result = await prisma.$transaction(async (tx) => {

            // Check duplicate webhook event
            const existingEvent =
                await tx.paymentWebhookEvent.findUnique({
                    where: {
                        eventId: event.id,
                    },
                });

            if (existingEvent) {
                console.log("Duplicate webhook event:", event.id);

                return {
                    duplicate: true,
                    paymentId: null,
                };
            }

            // Find payment using Razorpay payment link ID
            console.log("Searching payment:", paymentLink.id);

            const payment = await tx.payment.findUnique({
                where: {
                    razorpayPaymentLinkId: paymentLink.id,
                },
            });

            if (!payment) {
                throw new Error(
                    `Payment record not found for Razorpay link: ${paymentLink.id}`
                );
            }

            console.log("Matched payment ID:", payment.id);
            console.log("Current payment status:", payment.status);

            // 5. Handle successful payment
            if (event.event === "payment_link.paid") {

                const amount = paymentLink.amount;
                const amountPaid = paymentLink.amount_paid;
                const paymentId = paymentEntity?.id;

                if (
                    typeof amount !== "number" ||
                    typeof amountPaid !== "number"
                ) {
                    throw new Error(
                        "Payment amount details missing in webhook"
                    );
                }

                if (amountPaid < amount) {
                    throw new Error(
                        `Payment not fully paid. Amount: ${amount}, Paid: ${amountPaid}`
                    );
                }

                if (!paymentId) {
                    throw new Error(
                        "Razorpay payment ID missing in webhook"
                    );
                }

                // Save successful webhook event
                await tx.paymentWebhookEvent.create({
                    data: {
                        eventId: event.id,
                        eventType: event.event,
                    },
                });

                const updatedPayment = await tx.payment.update({
                    where: {
                        id: payment.id,
                    },
                    data: {
                        status: "PAID",
                        razorpayPaymentId: paymentId,
                        razorpayPaymentStatus:
                            paymentEntity?.status ?? "captured",
                        paidAt: new Date(),
                    },
                });

                console.log("Payment successfully updated!");
                console.log("Payment ID:", updatedPayment.id);
                console.log("New status:", updatedPayment.status);

                return {
                    duplicate: false,
                    paymentId: updatedPayment.id,
                };
            }

            // 6. Handle expired payment link
            if (event.event === "payment_link.expired") {

                await tx.paymentWebhookEvent.create({
                    data: {
                        eventId: event.id,
                        eventType: event.event,
                    },
                });

                const updatedPayment = await tx.payment.update({
                    where: {
                        id: payment.id,
                    },
                    data: {
                        status: "EXPIRED",
                        razorpayPaymentStatus: "expired",
                    },
                });

                console.log("Payment link expired:", updatedPayment.id);

                return {
                    duplicate: false,
                    paymentId: updatedPayment.id,
                };
            }

            // 7. Handle cancelled payment link
            if (event.event === "payment_link.cancelled") {

                await tx.paymentWebhookEvent.create({
                    data: {
                        eventId: event.id,
                        eventType: event.event,
                    },
                });

                const updatedPayment = await tx.payment.update({
                    where: {
                        id: payment.id,
                    },
                    data: {
                        status: "CANCELLED",
                        razorpayPaymentStatus: "cancelled",
                    },
                });

                console.log("Payment link cancelled:", updatedPayment.id);

                return {
                    duplicate: false,
                    paymentId: updatedPayment.id,
                };
            }

            throw new Error(`Unhandled event: ${event.event}`);
        });

        console.log("Transaction result:", result);
        console.log("========== WEBHOOK COMPLETED ==========\n");

        return res.status(200).json({
            success: true,
            message: result.duplicate
                ? "Webhook already processed"
                : "Webhook processed successfully",
        });

    } catch (error) {

        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            console.log("Duplicate webhook event detected");

            return res.status(200).json({
                success: true,
                message: "Webhook already processed",
            });
        }

        console.error("\n========== WEBHOOK PROCESSING ERROR ==========");
        console.error(error);
        console.error("===============================================\n");

        return res.status(500).json({
            success: false,
            message: "Webhook processing failed",
        });
    }
};
