import { Router } from "express";
import { createProperty, getAllProperties, verifyProperty } from "./property.controller";
import { AdminRole } from "../../generated/prisma/client";
import { authorize } from "../../middlewares/role.middleware";

const router = Router();

router.post("/", createProperty); import { authenticate } from "../../middlewares/auth.middleware";
router.get(
    "/",
    authenticate,
    authorize(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS),
    getAllProperties
);

router.patch(
    "/:id/verification",
    authenticate,
    authorize(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS),
    verifyProperty
);
export default router;