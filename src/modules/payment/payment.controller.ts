import type { Request, Response, NextFunction } from "express";
import { createPayment } from "./payment.service";

export const createPaymentController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const payment = await createPayment(
            req.body,
            req.user!.id
        );

        return res.status(201).json({
            success: true,
            message: "Payment link created successfully",
            data: payment,
        });
    } catch (error) {
        next(error);
    }
};