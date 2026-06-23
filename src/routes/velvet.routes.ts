import { Router, Request, Response } from "express";
import { blostem_service } from "../services/blostem.service.js";

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
