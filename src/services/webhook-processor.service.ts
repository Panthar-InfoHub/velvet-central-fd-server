import axios from "axios";
import { webhook_controller } from "../controllers/webhook.controller.js";

class WebhookProcessorServiceClass {

    process = async (body: any): Promise<{ validated: boolean }> => {
        const { event, jid } = body;

        const validate_url = process.env.VELVET_WEBHOOK_VALIDATE_URL!;
        const velvet_api_key = process.env.VELVET_API_KEY;

        const headers: Record<string, string> = { "content-type": "application/json" };
        if (velvet_api_key) headers["x-api-key"] = velvet_api_key;

        // Step 1: Validate jid with Velvet — returns return_url on success
        const validate_res = await axios.post(validate_url, { jid, event }, {
            headers,
            timeout: 5000,
        });

        if (!validate_res.data?.success) {
            console.warn(`Webhook validation failed for jid=${jid}, event=${event}`);
            return { validated: false };
        }

        const return_url: string = validate_res.data.return_url;

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
