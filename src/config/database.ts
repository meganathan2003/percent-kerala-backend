import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    min: 1,
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

export const prisma = new PrismaClient({
    adapter,
});