import { z } from "zod";
import {
    DocumentReviewStatus,
    DocumentType,
} from "../../generated/prisma/client";

export const uploadDocumentSchema = z.object({
    type: z.nativeEnum(DocumentType),
});

export const reviewDocumentSchema = z.object({
    status: z.nativeEnum(DocumentReviewStatus),
    remarks: z.string().trim().max(1000).optional(),
}).superRefine((data, ctx) => {
    if (data.status === DocumentReviewStatus.REJECTED && !data.remarks) {
        ctx.addIssue({
            code: "custom",
            path: ["remarks"],
            message: "Rejection reason is required",
        });
    }
});