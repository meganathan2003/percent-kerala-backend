import { prisma } from "../../config/database";
import {
    VerificationStatus,
    PropertyStatus,
    PropertyCategory,
} from "../../generated/prisma/client";


interface CreatePropertyInput {
    owner: {
        name: string;
        email?: string;
        phone: string;
    };
    property: {
        title: string;
        description?: string;
        category: PropertyCategory;
        address: string;
        city: string;
        district: string;
        pincode?: string;
        latitude?: number;
        longitude?: number;
        price: number;
        area: number;
        areaUnit?: string;
    };
}

export async function createProperty(data: CreatePropertyInput) {
    return prisma.$transaction(
        async (tx) => {
            let owner = await tx.owner.findUnique({
                where: {
                    phone: data.owner.phone,
                },
            });

            if (!owner) {
                owner = await tx.owner.create({
                    data: {
                        name: data.owner.name,
                        email: data.owner.email,
                        phone: data.owner.phone,
                    },
                });
            }

            const property = await tx.property.create({
                data: {
                    ownerId: owner.id,
                    ...data.property,
                    verification: {
                        create: {
                            status: "PENDING",
                        },
                    },
                },
                include: {
                    owner: true,
                    verification: true,
                },
            });

            return property;
        },
        {
            maxWait: 15000,
            timeout: 30000,
        }
    );
}

export async function getAllProperties() {
    return prisma.property.findMany({
        include: {
            owner: true,
            verification: true,
            documents: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}

interface VerifyPropertyInput {
    propertyId: string;
    adminId: string;
    status: VerificationStatus;
    remarks?: string;
    identityVerified?: boolean;
    ownershipVerified?: boolean;
    locationVerified?: boolean;
    photosVerified?: boolean;
    siteVisitCompleted?: boolean;
}

export async function verifyProperty(data: VerifyPropertyInput) {
    const property = await prisma.property.findUnique({
        where: { id: data.propertyId },
        include: { verification: true },
    });

    if (!property) {
        throw new Error("PROPERTY_NOT_FOUND");
    }

    if (!property.verification) {
        throw new Error("VERIFICATION_NOT_FOUND");
    }

    if (data.status === "VERIFIED") {
        const checksPassed =
            data.identityVerified ??
            property.verification.identityVerified;

        const ownershipPassed =
            data.ownershipVerified ??
            property.verification.ownershipVerified;

        const locationPassed =
            data.locationVerified ??
            property.verification.locationVerified;

        const photosPassed =
            data.photosVerified ??
            property.verification.photosVerified;

        if (
            !checksPassed ||
            !ownershipPassed ||
            !locationPassed ||
            !photosPassed
        ) {
            throw new Error("VERIFICATION_CHECKS_INCOMPLETE");
        }
    }

    if (data.status === "REJECTED" && !data.remarks?.trim()) {
        throw new Error("REJECTION_REASON_REQUIRED");
    }

    return prisma.$transaction(async (tx) => {
        const oldStatus = property.verification!.status;

        const verification = await tx.propertyVerification.update({
            where: { propertyId: data.propertyId },
            data: {
                status: data.status,
                identityVerified: data.identityVerified,
                ownershipVerified: data.ownershipVerified,
                locationVerified: data.locationVerified,
                photosVerified: data.photosVerified,
                siteVisitCompleted: data.siteVisitCompleted,
                rejectionReason:
                    data.status === "REJECTED" ? data.remarks : null,
                verifiedById:
                    data.status === "VERIFIED" ? data.adminId : null,
                verifiedAt:
                    data.status === "VERIFIED" ? new Date() : null,
            },
        });

        await tx.verificationHistory.create({
            data: {
                verificationId: verification.id,
                changedById: data.adminId,
                oldStatus,
                newStatus: data.status,
                remarks: data.remarks,
            },
        });

        await tx.property.update({
            where: { id: data.propertyId },
            data: {
                status:
                    data.status === "VERIFIED"
                        ? PropertyStatus.VERIFIED
                        : data.status === "REJECTED"
                            ? PropertyStatus.REJECTED
                            : PropertyStatus.VERIFICATION,
            },
        });

        return verification;
    });
}