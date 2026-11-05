import multer from "multer";

const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
];

const storage = multer.memoryStorage();

export const uploadDocumentMiddleware = multer({
    storage,

    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
        files: 1,
    },

    fileFilter: (_req, file, callback) => {
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return callback(
                new Error("Only PDF, JPG, PNG and WEBP files are allowed")
            );
        }

        callback(null, true);
    },
}).single("document");