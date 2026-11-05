
import express, { Request } from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.routes";
import adminRoutes from "./modules/admins/admin.routes";
import propertyRoutes from "./modules/properties/property.routes";
import quotationRoutes from "./modules/quotations/quotation.routes";
import paymentRoutes from "./modules/payments/payment.routes";
import paymentConfigurationRoutes from "./modules/payment-configurations/payment-configuration.routes";
import campaignRoutes from "./modules/campaigns/campaign.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import documentRoutes from "./modules/documents/document.routes";
import cookieParser from "cookie-parser";

const app = express();


app.use(
    cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
    })
);
// Global middlewares
app.use(cors({
    origin: [process.env.FRONTEND_URL as string, "http://localhost:3000"],
    credentials: true,
}));
app.use(cookieParser());

app.use(
    express.json({
        verify: (req, res, buffer) => {
            (req as Request & { rawBody?: Buffer }).rawBody =
                Buffer.from(buffer);
        },
    })
);

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admins", adminRoutes);
app.use("/api/v1/properties", propertyRoutes);
app.use("/api/v1/quotations", quotationRoutes);

// Payment routes - mount only once
app.use("/api/v1/payments", paymentRoutes);

app.use(
    "/api/v1/payment-configurations",
    paymentConfigurationRoutes
);

app.use("/api/v1/campaigns", campaignRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1", documentRoutes);

export default app;
