import { Router, Request, Response } from "express";
import { blostem_service } from "../services/blostem.service.js";
import axios from "axios";

export const velvetRouter = Router();

velvetRouter.post("/purchase-url", async (req: Request, res: Response) => {
    try {
        const result = blostem_service.build_purchase_url(req.body);
        res.json(result);
    } catch (err: any) {
        console.error("purchase-url error", err.message || err);
        res.status(502).json({ error: "forward_failed" });
    }
});

velvetRouter.post("/redirect-url", async (req: Request, res: Response) => {
    try {
        const result = await blostem_service.create_redirect_url(req.body);
        res.json(result);
    } catch (err: any) {
        console.error("redirect-url error", err.message || err);
        res.status(502).json({ error: "forward_failed" });
    }
});


velvetRouter.get("/customer-details", async (req: Request, res: Response) => {
    try {
        const mobile = String(req.query.mobile ?? "").trim();
        if (!mobile) {
            return res.status(400).json({ error: "mobile query param is required" });
        }

        const raw_urls = process.env.CUSTOMER_DATA_URL!;
        if (!raw_urls) {
            return res.status(500).json({ error: "CUSTOMER_DATA_URL is not configured" });
        }

        const validate_urls = raw_urls.split(",").map(u => u.trim()).filter(Boolean);
        const velvet_api_key = process.env.VELVET_API_KEY;

        const headers: Record<string, string> = { "content-type": "application/json" };
        if (velvet_api_key) headers["x-api-key"] = velvet_api_key;

        // Construct target URLs by replacing /webhook/validate with /customer-details
        const target_urls = validate_urls.map(url => {
            return `${url}?mobile=${encodeURIComponent(mobile)}`;
        });

        // Query all backends in parallel, take the first success response
        const result = await Promise.any(
            target_urls.map(async (url) => {
                const response = await axios.get(url, { headers, timeout: 5000 });
                if (response.status !== 200 || !response.data || response.data.status !== "Ok" || !response.data.user) {
                    throw new Error("Invalid customer details response");
                }
                return response.data;
            })
        );

        res.json(result);
    } catch (err: any) {
        console.error("customer-details error", err.message || err);
        res.status(404).json({ status: "Error", message: "User not found or query failed" });
    }
});