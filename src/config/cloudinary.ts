import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
    publicId: string;
    secureUrl: string;
    format: string;
    resourceType: string;
    bytes: number;
}

export function uploadDocument(
    buffer: Buffer,
    originalName: string
): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "per-cent/property-documents",
                resource_type: "auto",
                type: "private",
                use_filename: false,
                unique_filename: true,
                filename_override: originalName,
            },
            (error, result) => {
                if (error || !result) {
                    return reject(error ?? new Error("Cloudinary upload failed"));
                }

                resolve({
                    publicId: result.public_id,
                    secureUrl: result.secure_url,
                    format: result.format,
                    resourceType: result.resource_type,
                    bytes: result.bytes,
                });
            }
        );

        Readable.from(buffer).pipe(stream);
    });
}

export async function deleteDocument(
    publicId: string,
    resourceType: string
) {
    return cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType as "image" | "raw" | "video",
        type: "private",
        invalidate: true,
    });


}


export function generatePrivateDocumentUrl(
    publicId: string,
    format: string,
    resourceType: string
): string {
    const allowedResourceTypes = ["image", "raw", "video"];

    if (!allowedResourceTypes.includes(resourceType)) {
        throw new Error("INVALID_CLOUDINARY_RESOURCE_TYPE");
    }

    if (!format) {
        throw new Error("DOCUMENT_FORMAT_NOT_FOUND");
    }

    return cloudinary.utils.private_download_url(
        publicId,
        format,
        {
            resource_type: resourceType as "image" | "raw" | "video",
            type: "private",
            expires_at: Math.floor(Date.now() / 1000) + 300,
            attachment: false,
        }
    );
}


export default cloudinary;