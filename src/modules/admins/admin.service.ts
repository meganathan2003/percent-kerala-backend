import bcrypt from "bcryptjs";
import { AdminRole } from "../../generated/prisma/client";
import { prisma } from "../../config/database";

interface CreateAdminInput {
    name: string;
    email: string;
    password: string;
    role: AdminRole;
}

export async function createAdmin(data: CreateAdminInput) {
    // Only SALES and OPERATIONS users can be created
    if (
        data.role !== AdminRole.SALES &&
        data.role !== AdminRole.OPERATIONS
    ) {
        throw new Error("INVALID_ROLE");
    }

    const email = data.email.toLowerCase();

    // Check duplicate email
    const existingAdmin = await prisma.adminUser.findUnique({
        where: { email },
    });

    if (existingAdmin) {
        throw new Error("EMAIL_ALREADY_EXISTS");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create admin
    return prisma.adminUser.create({
        data: {
            name: data.name,
            email,
            passwordHash,
            role: data.role,
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
        },
    });
}


export async function getAllAdmins() {
    return prisma.adminUser.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}

export async function updateAdmin(
    id: string,
    data: {
        name?: string;
        email?: string;
        role?: AdminRole;
    }
) {
    const admin = await prisma.adminUser.findUnique({
        where: { id },
    });

    if (!admin) {
        throw new Error("ADMIN_NOT_FOUND");
    }

    if (admin.role === AdminRole.SUPER_ADMIN) {
        throw new Error("CANNOT_MODIFY_SUPER_ADMIN");
    }

    if (
        data.role &&
        data.role !== AdminRole.SALES &&
        data.role !== AdminRole.OPERATIONS
    ) {
        throw new Error("INVALID_ROLE");
    }



    // Normalize email
    const email = data.email?.toLowerCase();

    // Check whether another admin already uses this email
    if (email) {
        const existingAdmin = await prisma.adminUser.findUnique({
            where: { email },
        });

        if (existingAdmin && existingAdmin.id !== id) {
            throw new Error("EMAIL_ALREADY_EXISTS");
        }
    }

    return prisma.adminUser.update({
        where: { id },
        data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(email !== undefined && { email }),
            ...(data.role !== undefined && { role: data.role }),
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            updatedAt: true,
        },
    });
}

export async function updateAdminStatus(
    id: string,
    isActive: boolean
) {
    const admin = await prisma.adminUser.findUnique({
        where: { id },
    });

    if (!admin) {
        throw new Error("ADMIN_NOT_FOUND");
    }

    if (admin.role === AdminRole.SUPER_ADMIN) {
        throw new Error("CANNOT_MODIFY_SUPER_ADMIN");
    }

    return prisma.adminUser.update({
        where: { id },
        data: { isActive },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            updatedAt: true,
        },
    });
}


export async function getAdminById(id: string) {
    const admin = await prisma.adminUser.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    if (!admin) {
        throw new Error("ADMIN_NOT_FOUND");
    }

    return admin;
}

export async function resetAdminPassword(
    id: string,
    newPassword: string
) {
    const admin = await prisma.adminUser.findUnique({
        where: { id },
    });

    if (!admin) {
        throw new Error("ADMIN_NOT_FOUND");
    }

    if (admin.role === AdminRole.SUPER_ADMIN) {
        throw new Error("CANNOT_RESET_SUPER_ADMIN");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    return prisma.adminUser.update({
        where: { id },
        data: {
            passwordHash,
            tokenVersion: {
                increment: 1,
            },
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            updatedAt: true,
        },
    });
}