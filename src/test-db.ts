import "dotenv/config";
import { prisma } from "./config/database";

async function testDatabase() {
    try {
        await prisma.$connect();

        const result = await prisma.$queryRaw`
            SELECT NOW() AS current_time
        `;

        console.log("Supabase connected successfully!");
        console.log(result);
    } catch (error) {
        console.error("Database connection failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

testDatabase();