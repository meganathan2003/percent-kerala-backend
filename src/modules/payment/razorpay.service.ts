
import Razorpay from "razorpay";
import crypto from "crypto";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

if (!keyId || !keySecret) {
    throw new Error("Razorpay API credentials are missing");
}

const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
});

interface CreatePaymentLinkInput {
    amount: number;
    paymentNumber: string;
    description: string;
    customer: {
        name: string;
        email: string;
        contact: string;
    };
    expiresAt?: Date;
    notes?: Record<string, string>;
}

export const createRazorpayPaymentLink = async (
    input: CreatePaymentLinkInput
) => {
    const amountInPaise = Math.round(input.amount * 100);

    if (!Number.isSafeInteger(amountInPaise) || amountInPaise <= 0) {
        throw new Error("Invalid payment amount");
    }

    const expireBy = input.expiresAt
        ? Math.floor(input.expiresAt.getTime() / 1000)
        : Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

    if (expireBy <= Math.floor(Date.now() / 1000)) {
        throw new Error("Payment link expiry must be in the future");
    }

    try {
        const paymentLink = await razorpay.paymentLink.create({
            amount: amountInPaise,
            currency: "INR",
            accept_partial: false,
            reference_id: input.paymentNumber,
            description: input.description,
            customer: input.customer,
            notify: {
                sms: false,
                email: false,
            },
            reminder_enable: false,
            expire_by: expireBy,
            notes: input.notes,
        });

        console.log("RAZORPAY RESPONSE:", {
            id: paymentLink.id,
            short_url: paymentLink.short_url,
            status: paymentLink.status,
        });

        if (!paymentLink.id || !paymentLink.short_url) {
            throw new Error("Razorpay did not return a valid payment URL");
        }

        return paymentLink;
    } catch (error) {
        console.error("RAZORPAY API ERROR:", error);
        throw error;
    }
};

export const verifyRazorpayWebhookSignature = (
    rawBody: Buffer,
    signature: string
): boolean => {
    if (!webhookSecret) {
        throw new Error("Razorpay webhook secret is missing");
    }

    if (!signature) return false;

    const expected = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest();

    const received = Buffer.from(signature, "hex");

    if (received.length !== expected.length || received.length === 0) {
        return false;
    }

    return crypto.timingSafeEqual(received, expected);
};

export default razorpay;
