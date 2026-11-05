
import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
    PropertyCategory,
    VerificationStatus,
} from "../../generated/prisma/client";
import * as propertyService from "./property.service";

const uuidSchema = z.string().uuid();

// CREATE PROPERTY VALIDATION
const createPropertySchema = z.object({
    owner: z.object({
        name: z.string().trim().min(2),
        email: z.string().email().optional(),
        phone: z.string().trim().min(10).max(15),
    }),

    property: z.object({
        title: z.string().trim().min(3),
        description: z.string().optional(),
        category: z.nativeEnum(PropertyCategory),
        address: z.string().min(5),
        city: z.string().min(2),
        district: z.string().min(2),
        pincode: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        price: z.number().positive(),
        area: z.number().positive(),
        areaUnit: z.string().optional(),
    }),
});

// UPDATE OWNER + PROPERTY VALIDATION
const updatePropertySchema = z.object({
    owner: z.object({
        name: z.string().trim().min(2).optional(),
        email: z.union([
            z.string().email(),
            z.literal(""),
            z.null(),
        ]).optional(),
        phone: z.string().trim().min(10).max(15).optional(),
    }).optional(),

    property: z.object({
        title: z.string().trim().min(3).optional(),
        description: z.string().nullable().optional(),
        category: z.nativeEnum(PropertyCategory).optional(),
        address: z.string().min(5).optional(),
        city: z.string().min(2).optional(),
        district: z.string().min(2).optional(),
        pincode: z.string().nullable().optional(),
        latitude: z.number().nullable().optional(),
        longitude: z.number().nullable().optional(),
        price: z.number().positive().optional(),
        area: z.number().positive().optional(),
        areaUnit: z.string().optional(),
    }).optional(),
}).refine(
    (data) =>
        (data.owner && Object.keys(data.owner).length > 0) ||
        (data.property && Object.keys(data.property).length > 0),
    {
        message: "At least one owner or property field is required",
    }
);

// VERIFICATION VALIDATION
const verifyPropertySchema = z.object({
    status: z.nativeEnum(VerificationStatus),
    remarks: z.string().optional(),
    identityVerified: z.boolean().optional(),
    ownershipVerified: z.boolean().optional(),
    locationVerified: z.boolean().optional(),
    photosVerified: z.boolean().optional(),
    siteVisitCompleted: z.boolean().optional(),
});

// HELPERS
function getValidatedPropertyId(req: Request): string | null {
    const result = uuidSchema.safeParse(req.params.id);
    return result.success ? result.data : null;
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error
        ? error.message
        : "Something went wrong";
}

function isUniqueConstraintError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
    );
}

// CREATE PROPERTY
export async function createProperty(req: Request, res: Response) {
    try {
        const data = createPropertySchema.parse(req.body);

        const property = await propertyService.createProperty(data);

        return res.status(201).json({
            success: true,
            message: "Property submitted successfully",
            data: property,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Invalid input",
                errors: error.issues,
            });
        }

        console.error("CREATE PROPERTY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

// GET ALL PROPERTIES
export async function getAllProperties(req: Request, res: Response) {
    try {
        const properties = await propertyService.getAllProperties();

        return res.status(200).json({
            success: true,
            message: "Properties fetched successfully",
            data: properties,
        });
    } catch (error) {
        console.error("GET PROPERTIES ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

// GET PROPERTY BY ID
export async function getPropertyByIdController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const propertyId = getValidatedPropertyId(req);

        if (!propertyId) {
            return res.status(400).json({
                success: false,
                message: "Invalid or missing property ID",
            });
        }

        const property =
            await propertyService.getPropertyById(propertyId);

        return res.status(200).json({
            success: true,
            message: "Property fetched successfully",
            data: property,
        });
    } catch (error) {
        const message = getErrorMessage(error);

        if (message === "PROPERTY_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Property not found",
            });
        }

        if (message === "INVALID_PROPERTY_ID") {
            return res.status(400).json({
                success: false,
                message: "Invalid property ID",
            });
        }

        return next(error);
    }
}

// UPDATE OWNER + PROPERTY DETAILS
export async function updatePropertyController(
    req: Request,
    res: Response
) {
    try {
        const propertyId = getValidatedPropertyId(req);

        if (!propertyId) {
            return res.status(400).json({
                success: false,
                message: "Invalid property ID",
            });
        }

        const data = updatePropertySchema.parse(req.body);

        const property = await propertyService.updateProperty(
            propertyId,
            data
        );

        return res.status(200).json({
            success: true,
            message: "Owner and property details updated successfully",
            data: property,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: error.issues,
            });
        }

        const message = getErrorMessage(error);

        if (message === "PROPERTY_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message,
            });
        }

        if (isUniqueConstraintError(error)) {
            return res.status(409).json({
                success: false,
                message: "This phone number is already registered to another owner.",
            });
        }

        console.error("UPDATE PROPERTY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update property",
        });
    }
}

// SOFT DELETE PROPERTY
export async function deletePropertyController(
    req: Request,
    res: Response
) {
    try {
        const propertyId = getValidatedPropertyId(req);

        if (!propertyId) {
            return res.status(400).json({
                success: false,
                message: "Invalid property ID",
            });
        }

        const result =
            await propertyService.softDeleteProperty(propertyId);

        return res.status(200).json({
            success: true,
            message: "Property moved to deleted records",
            data: result,
        });
    } catch (error) {
        const message = getErrorMessage(error);

        if (message === "PROPERTY_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message,
            });
        }

        console.error("DELETE PROPERTY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to delete property",
        });
    }
}

// RESTORE PROPERTY
export async function restorePropertyController(
    req: Request,
    res: Response
) {
    try {
        const propertyId = getValidatedPropertyId(req);

        if (!propertyId) {
            return res.status(400).json({
                success: false,
                message: "Invalid property ID",
            });
        }

        const result =
            await propertyService.restoreProperty(propertyId);

        return res.status(200).json({
            success: true,
            message: "Property restored successfully",
            data: result,
        });
    } catch (error) {
        const message = getErrorMessage(error);

        if (message === "DELETED_PROPERTY_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message,
            });
        }

        console.error("RESTORE PROPERTY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to restore property",
        });
    }
}

// VERIFY PROPERTY
export async function verifyProperty(req: Request, res: Response) {
    try {
        const propertyId = getValidatedPropertyId(req);

        if (!propertyId) {
            return res.status(400).json({
                success: false,
                message: "Invalid or missing property ID",
            });
        }

        const data = verifyPropertySchema.parse(req.body);

        const result = await propertyService.verifyProperty({
            ...data,
            propertyId,
            adminId: req.user!.id,
        });

        return res.status(200).json({
            success: true,
            message: "Property verification updated successfully",
            data: result,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: error.issues,
            });
        }

        const message = getErrorMessage(error);

        const statusCode =
            message === "PROPERTY_NOT_FOUND" ||
                message === "VERIFICATION_NOT_FOUND"
                ? 404
                : message === "PROPERTY_ALREADY_VERIFIED"
                    ? 409
                    : message === "INVALID_PROPERTY_ID" ||
                        message === "VERIFICATION_CHECKS_INCOMPLETE" ||
                        message === "REJECTION_REASON_REQUIRED"
                        ? 400
                        : 500;

        if (statusCode === 500) {
            console.error("VERIFY PROPERTY ERROR:", error);
        }

        return res.status(statusCode).json({
            success: false,
            message,
        });
    }
}
