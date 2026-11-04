import { Router } from "express";
import {
    createCampaign,
    submitCampaign,
    approveCampaign,
    rejectCampaign,
    launchCampaign,
    getAllCampaigns,
    getCampaignById,
} from "./campaign.controller";

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

// View campaigns
router.get(
    "/",
    authorize(...staffAccess),
    getAllCampaigns,
);

router.get(
    "/:id",
    authorize(...staffAccess),
    getCampaignById,
);

// Operations creates and submits
router.post(
    "/",
    authorize(AdminRole.OPERATIONS),
    createCampaign,
);

router.post(
    "/:id/submit",
    authorize(AdminRole.OPERATIONS),
    submitCampaign,
);

// Only Super Admin approves or rejects
router.patch(
    "/:id/approve",
    authorize(AdminRole.SUPER_ADMIN),
    approveCampaign,
);

router.patch(
    "/:id/reject",
    authorize(AdminRole.SUPER_ADMIN),
    rejectCampaign,
);

// Only Operations launches an approved campaign
router.patch(
    "/:id/launch",
    authorize(AdminRole.OPERATIONS),
    launchCampaign,
);

export default router;