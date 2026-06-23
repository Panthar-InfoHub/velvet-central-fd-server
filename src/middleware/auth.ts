import { Request, Response, NextFunction } from "express";
import AppError from "./error.middleware.js";

export const verifyApiKey = (req: Request, res: Response, next: NextFunction): void => {
    const provided = req.headers["x-api-key"] || req.headers["x-api_key"];
    const expected = process.env.SECRET_API_KEY || process.env.CENTRAL_API_KEY;
    if (!expected) {
        throw new AppError("Server misconfigured: SECRET_API_KEY or CENTRAL_API_KEY is not set in environment variables.", 500, "SERVER_MISCONFIGURED");
    }
    if (!provided || provided !== expected) {
        throw new AppError("Unauthorized: Invalid API key.", 401, "UNAUTHORIZED");
    }
    next();
};
