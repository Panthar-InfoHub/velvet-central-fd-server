import axios from "axios";

const PROJECT_MAP: Record<string, string> = process.env.PROJECT_MAP
    ? JSON.parse(process.env.PROJECT_MAP)
    : { FD: "http://localhost:5000" };

class ForwardServiceClass {

    forwardToProject = async (payload: any, endpoint_key: string) => {
        const tx: string = payload.transactionId || payload.transaction_id || "";
        let target: string | undefined;

        if (tx) {
            const prefix = tx.split("_")[0];
            target = PROJECT_MAP[prefix];
        }
        if (!target) {
            target = Object.values(PROJECT_MAP)[0];
        }

        const url = `${target}/integration/${endpoint_key}`;
        const headers: Record<string, string> = { "content-type": "application/json" };
        if (process.env.SECRET_API_KEY) headers["x-api-key"] = process.env.SECRET_API_KEY;

        const resp = await axios.post(url, payload, { headers, timeout: 10000 });
        return resp.data;
    }
}

export const forward_service = new ForwardServiceClass();
