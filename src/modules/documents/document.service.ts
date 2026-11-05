
import { prisma } from "../../config/database";
import {
    DocumentReviewStatus,
    DocumentType,
    VerificationStatus,
    PropertyStatus,
    Prisma,
} from "../../generated/prisma/client";

import {
    uploadDocument,
    deleteDocument as deleteCloudinaryDocument,
    generatePrivateDocumentUrl,
} from "../../config/cloudinary";

interface UploadPropertyDocumentInput {
    propertyId: string;
    file: Express.Multer.File;
    type: DocumentType;
    adminId: string;
}

interface ReviewDocumentInput {
    documentId: string;
    adminId: string;
    status: DocumentReviewStatus;
    remarks?: string;
}

/**
 * Recalculate the document-related verification checklist.
 *
 * Mapping:
 * OWNER_ID        -> identityVerified
 * OWNERSHIP_DEED  -> ownershipVerified
 * LOCATION_PROOF / TAX_RECEIPT -> locationVerified
 * PROPERTY_PHOTO  -> photosVerified
 *
 * A checklist item is verified when at least one matching document
 * exists and every matching document has been verified.
 *
 * siteVisitCompleted is not document-based, so it is left unchanged.
 */
async function syncPropertyVerification(
    tx: Prisma.TransactionClient,
    propertyId: string,
    adminId: string
) {
    const documents = await tx.propertyDocument.findMany({
        where: { propertyId },
        select: {
            type: true,
            reviewStatus: true,
        },
    });

    const isVerified = (types: DocumentType[]) => {
        const matchingDocuments = documents.filter((document) =>
            types.includes(document.type)
        );

        return (
            matchingDocuments.length > 0 &&
            matchingDocuments.every(
                (document) =>
                    document.reviewStatus === DocumentReviewStatus.VERIFIED
            )
        );
    };

    const identityVerified = isVerified([DocumentType.OWNER_ID]);

    const ownershipVerified = isVerified([
        DocumentType.OWNERSHIP_DEED,
    ]);

    const locationVerified = isVerified([
        DocumentType.LOCATION_PROOF,
        DocumentType.TAX_RECEIPT,
    ]);

    const photosVerified = isVerified([
        DocumentType.PROPERTY_PHOTO,
    ]);

    const allRequiredChecksPassed =
        identityVerified &&
        ownershipVerified &&
        locationVerified &&
        photosVerified;

    const currentVerification =
        await tx.propertyVerification.findUnique({
            where: { propertyId },
        });

    if (!currentVerification) {
        throw new Error("VERIFICATION_NOT_FOUND");
    }

    // Preserve the existing manual site visit value.
    const nextStatus = allRequiredChecksPassed
        ? VerificationStatus.VERIFIED
        : currentVerification.status === VerificationStatus.VERIFIED
            ? VerificationStatus.PENDING
            : currentVerification.status;

    const statusChanged =
        currentVerification.status !== nextStatus;

    const verification = await tx.propertyVerification.update({
        where: { propertyId },
        data: {
            identityVerified,
            ownershipVerified,
            locationVerified,
            photosVerified,
            status: nextStatus,
            verifiedById:
                nextStatus === VerificationStatus.VERIFIED
                    ? adminId
                    : null,
            verifiedAt:
                nextStatus === VerificationStatus.VERIFIED
                    ? currentVerification.verifiedAt ?? new Date()
                    : null,
            rejectionReason:
                nextStatus === VerificationStatus.VERIFIED
                    ? null
                    : currentVerification.rejectionReason,
        },
    });

    // Keep the property's overall status synchronized.
    await tx.property.update({
        where: { id: propertyId },
        data: {
            status: allRequiredChecksPassed
                ? PropertyStatus.VERIFIED
                : PropertyStatus.VERIFICATION,
        },
    });

    // Create history only when the overall verification status changes.
    if (statusChanged) {
        await tx.verificationHistory.create({
            data: {
                verificationId: verification.id,
                changedById: adminId,
                oldStatus: currentVerification.status,
                newStatus: nextStatus,
                remarks: allRequiredChecksPassed
                    ? "All required document verification checks completed."
                    : "Verification status recalculated after document update.",
            },
        });
    }

    return verification;
}


export async function getDocumentAccess(documentId: string) {
    const document = await prisma.propertyDocument.findUnique({
        where: { id: documentId },
        select: {
            id: true,
            publicId: true,
            format: true,
            resourceType: true,
        },
    });

    if (!document) {
        throw new Error("DOCUMENT_NOT_FOUND");
    }

    if (!document.publicId || !document.format || !document.resourceType) {
        throw new Error("DOCUMENT_CLOUDINARY_DATA_NOT_FOUND");
    }

    const url = generatePrivateDocumentUrl(
        document.publicId,
        document.format,
        document.resourceType
    );

    return {
        url,
        expiresIn: 300,
    };
}



// Upload document
export async function uploadPropertyDocument(
    data: UploadPropertyDocumentInput
) {
    const property = await prisma.property.findUnique({
        where: { id: data.propertyId },
        select: { id: true },
    });

    if (!property) {
        throw new Error("PROPERTY_NOT_FOUND");
    }

    const uploadedFile = await uploadDocument(
        data.file.buffer,
        data.file.originalname
    );

    try {
        return await prisma.$transaction(async (tx) => {
            const document = await tx.propertyDocument.create({
                data: {
                    propertyId: data.propertyId,
                    type: data.type,
                    fileUrl: uploadedFile.secureUrl,
                    publicId: uploadedFile.publicId,
                    fileName: data.file.originalname,
                    resourceType: uploadedFile.resourceType,
                    fileSize: uploadedFile.bytes,
                    format: uploadedFile.format,
                    reviewStatus: DocumentReviewStatus.PENDING,
                },
            });

            // A newly uploaded pending document may affect its checklist item.
            await syncPropertyVerification(
                tx,
                data.propertyId,
                // Upload does not have an adminId in the current input.
                // The upload operation does not create a verification history entry.
                ""
            );

            return document;
        });
    } catch (error) {
        await deleteCloudinaryDocument(
            uploadedFile.publicId,
            uploadedFile.resourceType
        ).catch((cleanupError) => {
            console.error("CLOUDINARY CLEANUP ERROR:", cleanupError);
        });

        throw error;
    }
}

// Get documents belonging to a property
export async function getPropertyDocuments(propertyId: string) {
    const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { id: true },
    });

    if (!property) {
        throw new Error("PROPERTY_NOT_FOUND");
    }

    return prisma.propertyDocument.findMany({
        where: { propertyId },
        orderBy: { createdAt: "desc" },
    });
}

// Verify or reject individual document
export async function reviewPropertyDocument(
    data: ReviewDocumentInput
) {
    const document = await prisma.propertyDocument.findUnique({
        where: { id: data.documentId },
    });

    if (!document) {
        throw new Error("DOCUMENT_NOT_FOUND");
    }

    if (
        data.status === DocumentReviewStatus.REJECTED &&
        !data.remarks?.trim()
    ) {
        throw new Error("REJECTION_REASON_REQUIRED");
    }

    if (document.reviewStatus === DocumentReviewStatus.VERIFIED) {
        throw new Error("DOCUMENT_ALREADY_VERIFIED");
    }

    return prisma.$transaction(async (tx) => {
        const updatedDocument = await tx.propertyDocument.update({
            where: { id: data.documentId },
            data: {
                reviewStatus: data.status,
                reviewedById: data.adminId,
                reviewedAt: new Date(),
                reviewRemarks:
                    data.status === DocumentReviewStatus.REJECTED
                        ? data.remarks!.trim()
                        : null,
            },
        });

        // Update the checklist and overall property status in this transaction.
        await syncPropertyVerification(
            tx,
            document.propertyId,
            data.adminId
        );

        return updatedDocument;
    });
}

// Delete a document
export async function removePropertyDocument(
    documentId: string,
    adminId: string
) {
    const document = await prisma.propertyDocument.findUnique({
        where: { id: documentId },
    });

    if (!document) {
        throw new Error("DOCUMENT_NOT_FOUND");
    }

    const result = await deleteCloudinaryDocument(
        document.publicId,
        document.resourceType
    );

    if (result.result !== "ok" && result.result !== "not found") {
        throw new Error("CLOUDINARY_DELETE_FAILED");
    }

    await prisma.$transaction(async (tx) => {
        await tx.propertyDocument.delete({
            where: { id: documentId },
        });

        await syncPropertyVerification(
            tx,
            document.propertyId,
            adminId
        );
    });

    return { id: documentId };
}
