import { Router } from "express";
import {
    createPayment,
    sharePaymentLink,
    submitPaymentProof,
    reviewPayment,
    getAllPayments,
    getPaymentById,
} from "./payment.controller";

import {
    authenticate,
    authorize,
} from "../../middlewares/auth.middleware";

import { AdminRole } from "../../generated/prisma/client";

const router = Router();

router.use(authenticate);

const staffAccess = [
    AdminRole.SUPER_ADMIN,
    AdminRole.OPERATIONS,
];

// Create payment record
router.post(
    "/",
    authorize(...staffAccess),
    createPayment,
);

// List and get payments
router.get(
    "/",
    authorize(...staffAccess),
    getAllPayments,
);

router.get(
    "/:id",
    authorize(...staffAccess),
    getPaymentById,
);

// Operations shares payment link
router.post(
    "/:id/share-link",
    authorize(AdminRole.OPERATIONS),
    sharePaymentLink,
);

// MVP: Operations records proof received from the owner
router.patch(
    "/:id/proof",
    authorize(AdminRole.OPERATIONS),
    submitPaymentProof,
);

// Operations verifies or rejects payment
router.patch(
    "/:id/review",
    authorize(AdminRole.OPERATIONS),
    reviewPayment,
);

export default router;