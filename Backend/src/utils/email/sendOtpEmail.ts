import { BrevoClient } from "@getbrevo/brevo";

const brevoApiKey = process.env.BREVO_API_KEY;
const senderEmail = process.env.BREVO_SENDER_EMAIL;
const senderName = process.env.BREVO_SENDER_NAME|| "Zingereizer";

if (!brevoApiKey) {
    throw new Error("BREVO_API_KEY is not configured");
}

if (!senderEmail) {
    throw new Error("BREVO_SENDER_EMAIL is not configured");
}

const brevo = new BrevoClient({
    apiKey: brevoApiKey
});

const sender = {
    name: senderName,
    email: senderEmail
};

export const sendOtpEmail = async (email: string, otp: string) => {
    await brevo.transactionalEmails.sendTransacEmail({
        sender,
        to: [{ email }],
        subject: "Your Zingereizer login OTP",
        htmlContent: `
            <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
                <h2>Login verification</h2>
                <p>Your OTP code is:</p>
                <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${otp}</p>
                <p>This code expires in 10 minutes.</p>
            </div>
        `,
        textContent: `Your Zingereizer login OTP is ${otp}. This code expires in 10 minutes.`
    });
};

