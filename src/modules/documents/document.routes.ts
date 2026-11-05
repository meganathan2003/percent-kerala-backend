
import { Router, Request, Response, NextFunction } from "express";

import {
    uploadPropertyDocument,
    getPropertyDocuments,
    reviewPropertyDocument,
    deletePropertyDocument,
    getDocumentAccess,
} from "./document.controller";

import { uploadDocumentMiddleware } from "../../middlewares/upload.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import { AdminRole } from "../../generated/prisma/client";

const router = Router();

router.use(
    authenticate,
    authorize(
        AdminRole.SUPER_ADMIN,
        AdminRole.OPERATIONS
    )
);

function handleDocumentUpload(
    req: Request,
    res: Response,
    next: NextFunction
) {
    uploadDocumentMiddleware(req, res, (error) => {
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message || "Invalid document upload",
            });
        }

        next();
    });
}

router.post(
    "/properties/:id/documents",
    handleDocumentUpload,
    uploadPropertyDocument
);

router.get(
    "/properties/:id/documents",
    getPropertyDocuments
);
router.patch(
    "/documents/:id/verification",
    reviewPropertyDocument
);

router.delete(
    "/documents/:id",
    deletePropertyDocument
);

router.get(
    "/documents/:id/access",
    getDocumentAccess
);

export default router;
