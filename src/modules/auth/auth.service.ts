import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

import { prisma } from "../../config/database";
import { AdminRole } from "../../generated/prisma/client";

const JWT_SECRET = process.env.JWT_ACCESS_SECRET!;

const TOKEN_EXPIRY = "7d";

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
        JWT_SECRET,
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
    };
}