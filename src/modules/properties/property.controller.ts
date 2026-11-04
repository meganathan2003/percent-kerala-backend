import { Request, Response } from "express";
import { z } from "zod";
import { PropertyCategory, VerificationStatus, } from "../../generated/prisma/client";
import * as propertyService from "./property.service";

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

const verifyPropertySchema = z.object({
    status: z.nativeEnum(VerificationStatus),
    remarks: z.string().optional(),
    identityVerified: z.boolean().optional(),
    ownershipVerified: z.boolean().optional(),
    locationVerified: z.boolean().optional(),
    photosVerified: z.boolean().optional(),
    siteVisitCompleted: z.boolean().optional(),
});

export async function verifyProperty(req: Request, res: Response) {
    try {
        const data = verifyPropertySchema.parse(req.body);

        const result = await propertyService.verifyProperty({
            ...data,
            propertyId: String(req.params.id),
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

        const message =
            error instanceof Error ? error.message : "Something went wrong";

        const statusCode =
            message === "PROPERTY_NOT_FOUND" ||
                message === "VERIFICATION_NOT_FOUND"
                ? 404
                : message === "VERIFICATION_CHECKS_INCOMPLETE" ||
                    message === "REJECTION_REASON_REQUIRED"
                    ? 400
                    : 500;

        return res.status(statusCode).json({
            success: false,
            message,
        });
    }
}