
import { prisma } from "../../config/database";
import {
    VerificationStatus,
    PropertyStatus,
    PropertyCategory,
} from "../../generated/prisma/client";


interface UpdatePropertyInput {
    owner?: {
        name?: string;
        email?: string | null;
        phone?: string;
    };

    property?: {
        title?: string;
        description?: string | null;
        category?: PropertyCategory;
        address?: string;
        city?: string;
        district?: string;
        pincode?: string | null;
        latitude?: number | null;
        longitude?: number | null;
        price?: number;
        area?: number;
        areaUnit?: string;
    };
}
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

/**
 * Validate property ID before sending it to Prisma.
 * This prevents invalid values such as "undefined" from reaching PostgreSQL.
 */
function validatePropertyId(propertyId: string) {
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!propertyId || !uuidRegex.test(propertyId)) {
        throw new Error("INVALID_PROPERTY_ID");
    }
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
        where: {
            isDeleted: false,
        },
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


export async function getPropertyById(propertyId: string) {
    validatePropertyId(propertyId);

    const property = await prisma.property.findFirst({
        where: {
            id: propertyId,
            isDeleted: false,
        },
        include: {
            owner: true,
            documents: true,
            verification: {
                include: {
                    history: true,
                },
            },
            quotations: true,
        },
    });

    if (!property) {
        throw new Error("PROPERTY_NOT_FOUND");
    }

    return property;
}
export async function verifyProperty(data: VerifyPropertyInput) {
    validatePropertyId(data.propertyId);

    const property = await prisma.property.findUnique({
        where: {
            id: data.propertyId,
        },
        include: {
            verification: true,
        },
    });

    if (!property) {
        throw new Error("PROPERTY_NOT_FOUND");
    }

    if (!property.verification) {
        throw new Error("VERIFICATION_NOT_FOUND");
    }

    if (property.verification.status === "VERIFIED") {
        throw new Error("PROPERTY_ALREADY_VERIFIED");
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
            where: {
                propertyId: data.propertyId,
            },
            data: {
                status: data.status,
                identityVerified: data.identityVerified,
                ownershipVerified: data.ownershipVerified,
                locationVerified: data.locationVerified,
                photosVerified: data.photosVerified,
                siteVisitCompleted: data.siteVisitCompleted,
                rejectionReason:
                    data.status === "REJECTED"
                        ? data.remarks
                        : null,
                verifiedById:
                    data.status === "VERIFIED"
                        ? data.adminId
                        : null,
                verifiedAt:
                    data.status === "VERIFIED"
                        ? new Date()
                        : null,
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
            where: {
                id: data.propertyId,
            },
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


export async function updateProperty(
    propertyId: string,
    data: UpdatePropertyInput
) {
    validatePropertyId(propertyId);

    return prisma.$transaction(async (tx) => {
        const existingProperty = await tx.property.findFirst({
            where: {
                id: propertyId,
                isDeleted: false,
            },
        });

        if (!existingProperty) {
            throw new Error("PROPERTY_NOT_FOUND");
        }

        // Update owner details
        if (data.owner) {
            await tx.owner.update({
                where: {
                    id: existingProperty.ownerId,
                },
                data: data.owner,
            });
        }

        // Update property details
        if (data.property) {
            await tx.property.update({
                where: {
                    id: propertyId,
                },
                data: data.property,
            });
        }

        return tx.property.findUnique({
            where: {
                id: propertyId,
            },
            include: {
                owner: true,
                documents: true,
                verification: {
                    include: {
                        history: true,
                    },
                },
                quotations: true,
            },
        });
    });
}

export async function softDeleteProperty(propertyId: string) {
    validatePropertyId(propertyId);

    const result = await prisma.property.updateMany({
        where: {
            id: propertyId,
            isDeleted: false,
        },
        data: {
            isDeleted: true,
            deletedAt: new Date(),
        },
    });

    if (result.count === 0) {
        throw new Error("PROPERTY_NOT_FOUND");
    }

    return { id: propertyId, isDeleted: true };
}

export async function restoreProperty(propertyId: string) {
    validatePropertyId(propertyId);

    const result = await prisma.property.updateMany({
        where: {
            id: propertyId,
            isDeleted: true,
        },
        data: {
            isDeleted: false,
            deletedAt: null,
        },
    });

    if (result.count === 0) {
        throw new Error("DELETED_PROPERTY_NOT_FOUND");
    }

    return { id: propertyId, isDeleted: false };
}

