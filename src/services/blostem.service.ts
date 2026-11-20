import axios from "axios";
import crypto from "crypto";
import logger from "../middleware/logger.js";

class BlostemServiceClass {

    private create_encryption_text = (plain_text: string): string => {
        const iterations = 1000;
        const key_size = 256 / 8;
        const iv_size = 128 / 8;

        const derived = crypto.pbkdf2Sync(
            process.env.BLOSTEM_ENCRYPTION_KEY!,
            Buffer.from(process.env.BLOSTEM_ENCRYPTION_SALT!),
            iterations,
            key_size + iv_size,
            "sha256"
        );
        const key = derived.slice(0, key_size);
        const IV = derived.slice(key_size);

        const cipher = crypto.createCipheriv("aes-256-gcm", key, IV);
        const encrypted = Buffer.concat([cipher.update(Buffer.from(plain_text, "utf-8")), cipher.final()]);
        const tag = cipher.getAuthTag();
        return "ENCRYPTED:" + Buffer.concat([encrypted, tag]).toString("base64");
    }

    build_purchase_url = ({ product_id, jid, amount, payout_frequency, investment_period, user_phone }: {
        product_id: string;
        jid: string;
        amount: number;
        payout_frequency: string;
        investment_period: string;
        user_phone: string;
    }) => {

        const encrypted_phone = this.create_encryption_text(user_phone);
        const url = `${process.env.BLOSTEM_URL}/purchase/${product_id}?sso=${encrypted_phone}&jid=${jid}&investmentAmount=${amount}&payoutFrequency=${payout_frequency}&investmentPeriod=${investment_period}`;
        return { purchase_url: url };
    }

    get_redirect_token = async (): Promise<string> => {
        try {
            const authBaseUrl = process.env.BLOSTEM_AUTH_URL || "https://binvestt-api.blostem.com";
            const res = await axios.post(
                `${authBaseUrl}/partner/login`,
                {
                    email: process.env.BLOSTEM_USERNAME,
                    password: process.env.BLOSTEM_DASH_PASSWORD,
                }
            );

            logger.debug(`Redirect token response --> `, res.data);
            return res.data.data.access.token;
        } catch (error: any) {
            logger.error("Error while generating redirect token: ", error.response?.data || error.message);
            throw error;
        }
    }

    create_redirect_url = async ({ jid, event, user_phone }: {
        jid: string;
        event: string;
        user_phone: string;
    }) => {
        try {
            const token = await this.get_redirect_token();
            const encrypted_phone = this.create_encryption_text(user_phone);

            const response = await axios.post(
                `${process.env.BLOSTEM_MASTER_URL}/core/v1/asset/web/redirect`,
                { tk: encrypted_phone, jid, event, token },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Cookie: `token=${token}`,
                    },
                    timeout: 10000,
                }
            );

            logger.debug(`Redirect url response by blostem --> `, response.data);
            return response.data;
        } catch (error: any) {
            logger.error("Error while generating redirect url: ", error.response?.data || error.message);
            throw error;
        }
    }
}

export const blostem_service = new BlostemServiceClass();
