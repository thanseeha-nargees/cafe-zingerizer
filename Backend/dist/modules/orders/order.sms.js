"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendFoodReadySmsOnce = exports.sendFoodReadySms = void 0;
const getFoodReadyMessage = (customerName) => `Hello ${customerName},

Your order is ready!

Please collect your food from the counter.

Thank you for visiting our cafe.`;
const normalizeIndianPhoneNumberForTwilio = (phoneNumber) => {
    const digits = phoneNumber.replace(/\D/g, "");
    if (!digits) {
        throw new Error("Customer phone number not found");
    }
    if (digits.length === 10) {
        return `+91${digits}`;
    }
    if (digits.length === 11 && digits.startsWith("0")) {
        return `+91${digits.slice(1)}`;
    }
    if (digits.length === 12 && digits.startsWith("91")) {
        return `+${digits}`;
    }
    throw new Error("Customer phone number must be a 10-digit Indian mobile number");
};
const parseTwilioResponse = (responseBody) => {
    try {
        return JSON.parse(responseBody);
    }
    catch {
        return null;
    }
};
const formatTwilioFailureMessage = (providerResponse, responseBody) => {
    const providerMessage = providerResponse?.message || providerResponse?.error_message || responseBody;
    if (!providerMessage)
        return "";
    const code = providerResponse?.code ? `Twilio code ${providerResponse.code}: ` : "";
    return `${code}${providerMessage}`.slice(0, 300);
};
const getTwilioRequiredEnv = () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const fromNumber = process.env.TWILIO_FROM_NUMBER?.trim();
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
    if (!accountSid || accountSid === "...") {
        throw new Error("TWILIO_ACCOUNT_SID is not configured");
    }
    if (!authToken || authToken === "...") {
        throw new Error("TWILIO_AUTH_TOKEN is not configured");
    }
    if (messagingServiceSid && messagingServiceSid !== "...") {
        return {
            accountSid,
            authToken,
            sender: {
                type: "messagingService",
                value: messagingServiceSid,
            },
        };
    }
    if (!fromNumber || fromNumber === "...") {
        throw new Error("TWILIO_FROM_NUMBER is not configured. Use your SMS-capable Twilio sender number, or set TWILIO_MESSAGING_SERVICE_SID.");
    }
    if (fromNumber.startsWith("+91")) {
        throw new Error("TWILIO_FROM_NUMBER looks like an Indian customer/verified phone number. It must be an SMS-capable Twilio sender, not your personal +91 number.");
    }
    return {
        accountSid,
        authToken,
        sender: {
            type: "from",
            value: fromNumber,
        },
    };
};
const sendFoodReadySms = async (phoneNumber, customerName) => {
    const { accountSid, authToken, sender } = getTwilioRequiredEnv();
    const toNumber = normalizeIndianPhoneNumberForTwilio(phoneNumber);
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const formBody = new URLSearchParams({
        To: toNumber,
        Body: getFoodReadyMessage(customerName),
    });
    if (sender.type === "messagingService") {
        formBody.set("MessagingServiceSid", sender.value);
    }
    else {
        formBody.set("From", sender.value);
    }
    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
    });
    const responseBody = await response.text().catch(() => "");
    const providerResponse = parseTwilioResponse(responseBody);
    if (!response.ok) {
        const details = formatTwilioFailureMessage(providerResponse, responseBody);
        throw new Error(`Failed to send food ready SMS (${response.status} ${response.statusText})${details ? `: ${details}` : ""}`);
    }
    if (!providerResponse) {
        throw new Error(`Failed to send food ready SMS: unexpected Twilio response${responseBody ? `: ${responseBody.slice(0, 300)}` : ""}`);
    }
    console.log("food ready SMS accepted", JSON.stringify({
        provider: "Twilio",
        sid: providerResponse.sid || null,
        status: providerResponse.status || null,
    }));
};
exports.sendFoodReadySms = sendFoodReadySms;
const sendFoodReadySmsOnce = async (order) => {
    if (order.foodReadySmsSentAt) {
        return {
            status: "already_sent",
            sentAt: order.foodReadySmsSentAt,
        };
    }
    await (0, exports.sendFoodReadySms)(order.customerPhone, order.customerName);
    const sentAt = new Date();
    order.foodReadySmsSentAt = sentAt;
    await order.save();
    return {
        status: "sent",
        sentAt,
    };
};
exports.sendFoodReadySmsOnce = sendFoodReadySmsOnce;
//# sourceMappingURL=order.sms.js.map