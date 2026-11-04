import { Router } from "express";

import {
    createQuotation,
    getAllQuotations,
    getQuotationById,
    updateQuotationStatus,
} from "./quotation.controller";

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

router.post("/", authorize(...staffAccess), createQuotation);

router.get("/", authorize(...staffAccess), getAllQuotations);

router.get("/:id", authorize(...staffAccess), getQuotationById);

router.patch(
    "/:id/status",
    authorize(...staffAccess),
    updateQuotationStatus
);

export default router;