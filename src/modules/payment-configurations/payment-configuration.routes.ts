import { Router } from "express";
import {
    createConfiguration,
    getActiveConfiguration,
    updateConfiguration,
} from "./payment-configuration.controller";
import {
    authenticate,
    authorize,
} from "../../middlewares/auth.middleware";
import { AdminRole } from "../../generated/prisma/client";

const router = Router();

router.use(authenticate);

// Super Admin + Operations can view the active UPI details
router.get(
    "/active",
    authorize(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS),
    getActiveConfiguration,
);

// Only Super Admin can configure UPI details
router.post(
    "/",
    authorize(AdminRole.SUPER_ADMIN),
    createConfiguration,
);

router.patch(
    "/:id",
    authorize(AdminRole.SUPER_ADMIN),
    updateConfiguration,
);

export default router;