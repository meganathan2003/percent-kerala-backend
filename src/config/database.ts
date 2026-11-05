
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
    prismaPool?: Pool;
    prisma?: PrismaClient;
};

const pool =
    globalForPrisma.prismaPool ??
    new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 5,
        connectionTimeoutMillis: 15000,
        idleTimeoutMillis: 30000,
        keepAlive: true,
    });

pool.on("connect", () => {
    console.log("Database connection established");
});

pool.on("error", (error) => {
    console.error("Database pool error:", error.message);
});

const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: ["error", "warn"],
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaPool = pool;
    globalForPrisma.prisma = prisma;
}
