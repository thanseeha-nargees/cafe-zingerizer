"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendFoodReadySmsOnce = exports.sendFoodReadySms = void 0;
const getFoodReadyMessage = (customerName) => `Hello ${customerName},

Your order is ready!

Please collect your food from the counter.

Thank you for visiting our cafe.`;
const sendFoodReadySms = async (phoneNumber, customerName) => {
    if (!phoneNumber) {
        throw new Error("Customer phone number not found");
    }
    const smsApiUrl = process.env.SMS_API_URL;
    if (!smsApiUrl) {
        throw new Error("SMS_API_URL is not configured");
    }
    const response = await fetch(smsApiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(process.env.SMS_API_TOKEN
                ? { Authorization: `Bearer ${process.env.SMS_API_TOKEN}` }
                : {}),
        },
        body: JSON.stringify({
            to: phoneNumber,
            message: getFoodReadyMessage(customerName),
            senderId: process.env.SMS_SENDER_ID,
        }),
    });
    if (!response.ok) {
        const responseBody = await response.text().catch(() => "");
        const details = responseBody ? `: ${responseBody.slice(0, 300)}` : "";
        throw new Error(`Failed to send food ready SMS (${response.status} ${response.statusText})${details}`);
    }
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