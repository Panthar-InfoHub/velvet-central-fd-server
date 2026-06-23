import { Request, Response, NextFunction } from "express";
import AppError from "./error.middleware.js";
import logger from "./logger.js";

export const verifyApiKey = (req: Request, _res: Response, next: NextFunction): void => {
    const provided = req.headers["x-api-key"] || req.headers["x-api_key"];
    const raw = process.env.SECRET_API_KEY || process.env.CENTRAL_API_KEY;
    if (!raw) {
        throw new AppError("Server misconfigured: SECRET_API_KEY or CENTRAL_API_KEY is not set in environment variables.", 500, "SERVER_MISCONFIGURED");
    }

    const validKeys = raw.split(",").map(k => k.trim()).filter(Boolean);
    if (!provided || !validKeys.includes(provided as string)) {
        throw new AppError("Unauthorized: Invalid API key.", 401, "UNAUTHORIZED");
    }

    logger.debug(`API key verified for request to ${req.originalUrl}`);
    next();
};
