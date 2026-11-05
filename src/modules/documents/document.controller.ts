
import { Request, Response } from "express";
import { z } from "zod";

import * as documentService from "./document.service";

import {
    uploadDocumentSchema,
    reviewDocumentSchema,
} from "./document.validation";

// Upload property document
export async function uploadPropertyDocument(
    req: Request,
    res: Response
) {
    try {
        const { type } = uploadDocumentSchema.parse(req.body);

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select a document to upload",
            });
        }

        const document = await documentService.uploadPropertyDocument({
            propertyId: String(req.params.id),
            adminId: req.user!.id,
            file: req.file,
            type,
        });

        return res.status(201).json({
            success: true,
            message: "Document uploaded successfully",
            data: document,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: error.issues,
            });
        }

        const message =
            error instanceof Error ? error.message : "Something went wrong";

        if (message === "PROPERTY_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Property not found",
            });
        }

        console.error("UPLOAD PROPERTY DOCUMENT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to upload document",
        });
    }
}


export async function getDocumentAccess(
    req: Request,
    res: Response
) {
    try {
        const result = await documentService.getDocumentAccess(
            String(req.params.id)
        );

        return res.status(200).json({
            success: true,
            message: "Document access generated successfully",
            data: result,
        });
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Something went wrong";

        if (message === "DOCUMENT_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            });
        }

        console.error("GET DOCUMENT ACCESS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to generate document access",
        });
    }
}


// Get property documents
export async function getPropertyDocuments(
    req: Request,
    res: Response
) {
    try {
        const documents = await documentService.getPropertyDocuments(
            String(req.params.id)
        );

        return res.status(200).json({
            success: true,
            message: "Documents fetched successfully",
            data: documents,
        });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Something went wrong";

        if (message === "PROPERTY_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Property not found",
            });
        }

        console.error("GET PROPERTY DOCUMENTS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch documents",
        });
    }
}

// Verify or reject document
export async function reviewPropertyDocument(
    req: Request,
    res: Response
) {
    try {
        const data = reviewDocumentSchema.parse(req.body);

        const document = await documentService.reviewPropertyDocument({
            documentId: String(req.params.id),
            adminId: req.user!.id,
            status: data.status,
            remarks: data.remarks,
        });

        return res.status(200).json({
            success: true,
            message: "Document review updated successfully",
            data: document,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: error.issues,
            });
        }

        const message =
            error instanceof Error ? error.message : "Something went wrong";

        if (message === "DOCUMENT_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            });
        }

        if (
            message === "REJECTION_REASON_REQUIRED" ||
            message === "DOCUMENT_ALREADY_VERIFIED"
        ) {
            return res.status(400).json({
                success: false,
                message,
            });
        }

        console.error("REVIEW PROPERTY DOCUMENT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to review document",
        });
    }
}

// Delete document
export async function deletePropertyDocument(
    req: Request,
    res: Response
) {
    try {
        await documentService.removePropertyDocument(
            String(req.params.id),
            req.user!.id
        );

        return res.status(200).json({
            success: true,
            message: "Document deleted successfully",
        });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Something went wrong";

        if (message === "DOCUMENT_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            });
        }

        if (message === "CLOUDINARY_DELETE_FAILED") {
            return res.status(502).json({
                success: false,
                message: "Unable to delete document from storage",
            });
        }

        console.error("DELETE PROPERTY DOCUMENT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to delete document",
        });
    }
}
