import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../config/database";
import { AdminRole } from "../generated/prisma/client";

async function createSuperAdmin() {
    try {

        await prisma.$connect();
        console.log("Database connected successfully");
        const name = process.env.SUPER_ADMIN_NAME;
        const email = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
        const password = process.env.SUPER_ADMIN_PASSWORD;

        if (!name || !email || !password) {
            throw new Error("Super Admin environment variables are missing");
        }

        if (password.length < 12) {
            throw new Error("Super Admin password must contain at least 12 characters");
        }

        const existingAdmin = await prisma.adminUser.findUnique({
            where: { email },
        });

        if (existingAdmin) {
            console.log("Admin account already exists.");
            return;
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const admin = await prisma.adminUser.create({
            data: {
                name,
                email,
                passwordHash,
                role: AdminRole.SUPER_ADMIN,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            },
        });

        console.log("Super Admin created successfully!");
        console.log(admin);
    } catch (error) {
        console.error("Super Admin creation failed:", error);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

createSuperAdmin();