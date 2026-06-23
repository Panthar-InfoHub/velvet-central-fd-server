import axios from "axios";
import { webhook_controller } from "../controllers/webhook.controller.js";

class WebhookProcessorServiceClass {

    process = async (body: any): Promise<{ validated: boolean }> => {
        const { event, jid } = body;

        const raw_urls = process.env.VELVET_WEBHOOK_VALIDATE_URL!;
        const validate_urls = raw_urls.split(",").map(u => u.trim()).filter(Boolean);
        const velvet_api_key = process.env.VELVET_API_KEY;

        const headers: Record<string, string> = { "content-type": "application/json" };
        if (velvet_api_key) headers["x-api-key"] = velvet_api_key;

        // Step 1: Validate jid with Velvet — fire all URLs in parallel, take first success
        let return_url: string;
        try {
            return_url = await Promise.any(
                validate_urls.map(async (url) => {
                    const res = await axios.post(url, { jid, event }, { headers, timeout: 5000 });
                    if (!res.data?.success) throw new Error("not validated");
                    return res.data.return_url as string;
                })
            );
        } catch {
            console.warn(`Webhook validation failed for jid=${jid}, event=${event}`);
            return { validated: false };
        } 

        // Step 2: Transform Blostem payload into { status, update_data }
        const { status, update_data } = webhook_controller.process_event(body);

        // Step 3: POST transformed data to Velvet for DB persistence — no retry on failure
        try {
            await axios.post(return_url, { event, jid, status, update_data }, {
                headers,
                timeout: 10000,
            });
        } catch (err: any) {
            console.error(`Webhook callback to ${return_url} failed for jid=${jid}:`, err.message);
        }

        return { validated: true };
    }
}

export const webhook_processor_service = new WebhookProcessorServiceClass();
