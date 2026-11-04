import { Router } from "express";
import { createAdmin } from "./admin.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import { AdminRole } from "../../generated/prisma/client";
import * as adminController from "./admin.controller";

const router = Router();

// Only Super Admin can create admin accounts
router.post(
    "/",
    authenticate,
    authorize(AdminRole.SUPER_ADMIN),
    createAdmin
);

router.get(
    "/",
    authenticate,
    authorize(AdminRole.SUPER_ADMIN),
    adminController.getAllAdmins
);


router.patch(
    "/:id",
    authenticate,
    authorize(AdminRole.SUPER_ADMIN),
    adminController.updateAdmin
);

router.patch(
    "/:id/status",
    authenticate,
    authorize(AdminRole.SUPER_ADMIN),
    adminController.updateAdminStatus
);


router.get(
    "/:id",
    authenticate,
    authorize(AdminRole.SUPER_ADMIN),
    adminController.getAdminById
);

router.patch(
    "/:id/password",
    authenticate,
    authorize(AdminRole.SUPER_ADMIN),
    adminController.resetAdminPassword
);

export default router;