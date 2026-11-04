import { Router } from "express";

import {
    getDashboardOverview,
    getRecentProperties,
    getPendingPayments,
    getPendingCampaigns,
    getRecentQuotations,
} from "./dashboard.controller";

import {
    authenticate,
    authorize,
} from "../../middlewares/auth.middleware";

import { AdminRole } from "../../generated/prisma/client";

const router = Router();

router.use(authenticate);

router.use(
    authorize(
        AdminRole.SUPER_ADMIN,
        AdminRole.OPERATIONS,
    ),
);

router.get("/overview", getDashboardOverview);
router.get("/recent-properties", getRecentProperties);
router.get("/pending-payments", getPendingPayments);
router.get("/pending-campaigns", getPendingCampaigns);
router.get("/recent-quotations", getRecentQuotations);

export default router;