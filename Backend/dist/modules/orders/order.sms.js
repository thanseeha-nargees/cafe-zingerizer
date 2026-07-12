"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendFoodReadySmsOnce = exports.sendFoodReadySms = void 0;
const getFoodReadyMessage = (customerName) => `Hello ${customerName},

Your order is ready!

Please collect your food from the counter.

Thank you for visiting our cafe.`;
const DEFAULT_FAST2SMS_API_URL = "https://www.fast2sms.com/dev/bulkV2";
const DEFAULT_FAST2SMS_ROUTE = "q";
const normalizeIndianPhoneNumber = (phoneNumber) => {
    const digits = phoneNumber.replace(/\D/g, "");
    if (!digits) {
        throw new Error("Customer phone number not found");
    }
    if (digits.length === 10) {
        return digits;
    }
    if (digits.length === 11 && digits.startsWith("0")) {
        return digits.slice(1);
    }
    if (digits.length === 12 && digits.startsWith("91")) {
        return digits.slice(2);
    }
    throw new Error("Customer phone number must be a 10-digit Indian mobile number");
};
const parseFast2SmsResponse = (responseBody) => {
    try {
        return JSON.parse(responseBody);
    }
    catch {
        return null;
    }
};
const formatFast2SmsMessage = (message) => {
    if (Array.isArray(message)) {
        return message.join(", ");
    }
    if (typeof message === "string") {
        return message;
    }
    return "";
};
const sendFoodReadySms = async (phoneNumber, customerName) => {
    const smsApiUrl = process.env.SMS_API_URL || DEFAULT_FAST2SMS_API_URL;
    const smsApiToken = process.env.SMS_API_TOKEN;
    if (!smsApiToken) {
        throw new Error("SMS_API_TOKEN is not configured");
    }
    const url = new URL(smsApiUrl);
    url.searchParams.set("route", process.env.SMS_ROUTE || DEFAULT_FAST2SMS_ROUTE);
    url.searchParams.set("message", getFoodReadyMessage(customerName));
    url.searchParams.set("numbers", normalizeIndianPhoneNumber(phoneNumber));
    const response = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: smsApiToken,
        },
    });
    const responseBody = await response.text().catch(() => "");
    const providerResponse = parseFast2SmsResponse(responseBody);
    const providerMessage = formatFast2SmsMessage(providerResponse?.message);
    if (!response.ok) {
        const details = responseBody ? `: ${responseBody.slice(0, 300)}` : "";
        throw new Error(`Failed to send food ready SMS (${response.status} ${response.statusText})${details}`);
    }
    if (!providerResponse) {
        throw new Error(`Failed to send food ready SMS: unexpected Fast2SMS response${responseBody ? `: ${responseBody.slice(0, 300)}` : ""}`);
    }
    if (providerResponse.return !== true) {
        throw new Error(`Fast2SMS rejected food ready SMS${providerMessage ? `: ${providerMessage}` : ""}`);
    }
    console.log("food ready SMS accepted", JSON.stringify({
        provider: "Fast2SMS",
        requestId: providerResponse.request_id || null,
        message: providerMessage || null,
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