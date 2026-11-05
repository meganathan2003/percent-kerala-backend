
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

import { prisma } from "../../config/database";
import { AdminRole } from "../../generated/prisma/client";

const TOKEN_EXPIRY = "15m";
const COOKIE_MAX_AGE = 15 * 60 * 1000;

function getJwtSecret(): string {
    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
        throw new Error("JWT_ACCESS_SECRET is not configured");
    }

    return secret;
}

export const getCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production"
        ? "none" as const
        : "lax" as const,
    maxAge: COOKIE_MAX_AGE,
    path: "/",
});

function generateToken(user: {
    id: string;
    role: AdminRole;
    tokenVersion: number;
}) {
    return jwt.sign(
        {
            sub: user.id,
            role: user.role,
            type: "access",
            tokenVersion: user.tokenVersion,
        },
        getJwtSecret(),
        {
            expiresIn: TOKEN_EXPIRY,
            jwtid: randomUUID(),
        }
    );
}

export async function login(email: string, password: string) {
    const user = await prisma.adminUser.findUnique({
        where: {
            email: email.toLowerCase(),
        },
    });

    if (!user || !user.isActive) {
        throw new Error("INVALID_CREDENTIALS");
    }

    const passwordValid = await bcrypt.compare(
        password,
        user.passwordHash
    );

    if (!passwordValid) {
        throw new Error("INVALID_CREDENTIALS");
    }

    const token = generateToken(user);

    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        },
        token,
        expiresIn: TOKEN_EXPIRY,
        cookieOptions: getCookieOptions(),
    };
}

export async function getCurrentAdmin(userId: string) {
    const user = await prisma.adminUser.findUnique({
        where: {
            id: userId,
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
        },
    });

    if (!user || !user.isActive) {
        throw new Error("ADMIN_NOT_FOUND");
    }

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
    };
}
