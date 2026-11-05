import { Router } from "express";

import { createPaymentController } from "./payment.controller";
import {
    createPaymentController as createRazorpayLinkController,
} from "../payment/payment.controller";

import {
    handleRazorpayWebhook,
} from "../payment/payment.webhook";

import {
    authenticate,
    authorize,
} from "../../middlewares/auth.middleware";
import { AdminRole } from "../../generated/prisma/enums";

const router = Router();

// Public webhook — NO JWT authentication
router.post("/webhook", handleRazorpayWebhook);

// Protected manual payment route
router.post(
    "/",
    authenticate,
    authorize("SUPER_ADMIN"),
    createPaymentController
);

router.post(
    "/razorpay-link",
    authorize(AdminRole.SUPER_ADMIN),
    createRazorpayLinkController
);


export default router;