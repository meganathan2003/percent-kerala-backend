import "dotenv/config";
import app from "./app";
import { prisma } from "./config/database";

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
    try {
        await prisma.$connect();

        console.log("Database connected successfully");

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error);
        process.exit(1);
    }
}

startServer();