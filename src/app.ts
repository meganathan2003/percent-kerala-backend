import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import adminRoutes from "./modules/admins/admin.routes";
import propertyRoutes from "./modules/properties/property.routes";
import quotationRoutes from "./modules/quotations/quotation.routes";
import paymentRoutes from "./modules/payments/payment.routes";
import paymentConfigurationRoutes from "./modules/payment-configurations/payment-configuration.routes";
import campaignRoutes from "./modules/campaigns/campaign.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admins", adminRoutes);
app.use("/api/v1/properties", propertyRoutes);
app.use("/api/v1/quotations", quotationRoutes);
app.use("/api/v1/payments", paymentRoutes); app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/payment-configurations", paymentConfigurationRoutes);
app.use("/api/v1/campaigns", campaignRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);

export default app;