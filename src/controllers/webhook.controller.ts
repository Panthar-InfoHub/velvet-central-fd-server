// Exact copy of Velvet's webhook.controller.ts switch/case logic.
// Returns { status, update_data } — DB writes and Zoho side-effects happen in Velvet via /receive.

interface WebhookResult {
    status: string | undefined;
    update_data: Record<string, any>;
}

class WebhookControllerClass {

    process_event = (body: any): WebhookResult => {
        const { event, jid, data } = body;

        if (!jid) {
            const err: any = new Error("Invalid payload: missing jid");
            err.statusCode = 400;
            err.code = "MISSING_JID";
            throw err;
        }

        let status_to_update: string | undefined = undefined;
        const update_data: Record<string, any> = {};

        switch (event) {
            case "SSO":
            case "ONBOARDING":
                status_to_update = "ONBOARDING_COMPLETED";
                update_data.onboarded_at = new Date();
                if (body.type === "BANK") {
                    update_data.is_vkyc_required = true;
                }
                break;

            case "PAYMENT":
                if (data.isPaymentCompleted === true) {
                    status_to_update = "PAYMENT_SUCCESS";
                    update_data.payment_completed_at = new Date();
                    update_data.is_vkyc_initiated = false;
                } else if (data.isPaymentInitiated === true) {
                    status_to_update = "PAYMENT_PENDING";
                    update_data.is_vkyc_initiated = false;
                }

                update_data.amount = parseFloat(data.amount);
                update_data.roi_at_booking = parseFloat(data.roi);
                update_data.tenure_at_booking = data.tenure;
                update_data.payment_tx_id = data.paymentTxId;

                if (data.isVkycRequired === false) {
                    update_data.is_vkyc_required = false;
                    update_data.is_vkyc_pending = false;
                }
                break;

            case "PAYMENT_FAILED":
                status_to_update = "PAYMENT_FAILED";
                update_data.failure_reason = data.reason;
                update_data.payment_tx_id = data.paymentTxId;
                break;

            case "VKYC":
                if (data.isVkycCompleted === true) {
                    status_to_update = "VKYC_COMPLETED";
                    update_data.vkyc_completed_at = new Date();
                    update_data.is_vkyc_pending = false;
                } else if (data.isVkycPending === true) {
                    status_to_update = "VKYC_PENDING";
                    update_data.is_vkyc_pending = true;
                    update_data.is_vkyc_initiated = false;
                } else if (data.isVkycInitiated === true) {
                    update_data.is_vkyc_initiated = true;
                    update_data.is_vkyc_pending = false;
                }
                break;

            case "VKYC_FAILED":
                status_to_update = "VKYC_FAILED";
                update_data.vkyc_failure_reason = data.VkycFailureReason;
                update_data.vkyc_failed_by = data.VkycFailedBy;
                update_data.failure_reason = `VKYC Failed by ${data.VkycFailedBy}: ${data.VkycFailureReason}`;
                break;

            case "REFUND":
                status_to_update = "REFUNDED";
                update_data.refund_date = new Date(data.refundDate);
                update_data.failure_reason = "VKYC timeout (72 hours)";
                break;

            case "FD_CREATED":
                status_to_update = "FD_CREATED";
                update_data.fd_issued_at = new Date(body.createdAt);
                update_data.fd_account_number =
                    data.accountNumber ||
                    data.id ||
                    data.applicationId ||
                    jid;
                update_data.maturity_amount = parseFloat(data.maturityAmount);
                update_data.maturity_date = new Date(data.maturityDate);
                update_data.is_vkyc_pending = false;
                update_data.maturity_instruction = data.maturityInstructions || data.maturity_instruction;
                break;

            case "MATURITY_INSTRUCTION_UPDATED":
                update_data.maturity_instruction = data.updatedInstruction;
                break;

            case "PREMATURE_WITHDRAW":
                status_to_update = "PREMATURE_WITHDRAWN";
                update_data.maturity_amount = parseFloat(data.withdrawalAmount);
                break;

            case "MATURITY":
                status_to_update = "MATURED";
                break;

            case "REINVEST":
                status_to_update = "MATURED";
                break;

            default:
                console.log(`Event ${event} not handled in success flow yet.`);
        }

        return { status: status_to_update, update_data };
    }
}

export const webhook_controller = new WebhookControllerClass();
