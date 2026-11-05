
import { Router } from "express";
import {
    createProperty,
    getAllProperties,
    getPropertyByIdController,
    verifyProperty,
    updatePropertyController,
    deletePropertyController,
    restorePropertyController,
} from "./property.controller";

import { AdminRole } from "../../generated/prisma/client";

import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";

const router = Router();

// Public property submission
router.post("/", createProperty);

// Get all properties - Super Admin and Operations
router.get(
    "/",
    authenticate,
    authorize(
        AdminRole.SUPER_ADMIN,
        AdminRole.OPERATIONS
    ),
    getAllProperties
);

router.patch(
    "/:id/verification",
    authenticate,
    authorize(
        AdminRole.SUPER_ADMIN,
        AdminRole.OPERATIONS
    ),
    verifyProperty
);


// Get property details - Super Admin and Operations
router.get(
    "/:id",
    authenticate,
    authorize(
        AdminRole.SUPER_ADMIN,
        AdminRole.OPERATIONS
    ),
    getPropertyByIdController
);
// Update property - Super Admin and Operations
router.patch(
    "/:id",
    authenticate,
    authorize(
        AdminRole.SUPER_ADMIN,
        AdminRole.OPERATIONS
    ),
    updatePropertyController
);

// Soft delete property - Super Admin only
router.delete(
    "/:id",
    authenticate,
    authorize(AdminRole.SUPER_ADMIN),
    deletePropertyController
);

// Restore property - Super Admin only
router.patch(
    "/:id/restore",
    authenticate,
    authorize(AdminRole.SUPER_ADMIN),
    restorePropertyController
);

export default router;
