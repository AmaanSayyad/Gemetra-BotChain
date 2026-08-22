import emailjs from "@emailjs/browser";
import { explorerTxUrl } from "../config/botchain";

const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "YOUR_PUBLIC_KEY";
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || "YOUR_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "YOUR_TEMPLATE_ID";
const PAYMENT_NOTIFICATION_EMAIL =
  import.meta.env.VITE_PAYMENT_NOTIFICATION_EMAIL || "0xamaan.dev@gmail.com";

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

export interface PaymentEmailData {
  employeeName: string;
  employeeEmail: string;
  amount: number;
  token: string;
  transactionHash?: string;
  companyName: string;
  paymentDate: string;
}

export const sendPaymentEmail = async (emailData: PaymentEmailData): Promise<boolean> => {
  try {
    const recipientEmail = PAYMENT_NOTIFICATION_EMAIL;
    if (!recipientEmail.includes("@")) {
      console.error(`Invalid payment notification email: ${recipientEmail}`);
      return false;
    }

    // Prepare template parameters for EmailJS
    // IMPORTANT: Your EmailJS template must use {{to_email}} as the recipient field
    const templateParams = {
      to_name: "Gemetra Admin",
      to_email: recipientEmail,
      reply_to: recipientEmail,
      from_name: emailData.companyName,
      subject: `Payment completed: ${emailData.amount.toLocaleString()} ${emailData.token} to ${emailData.employeeName}`,
      message: `Payment completed on Gemetra.

Recipient: ${emailData.employeeName}${emailData.employeeEmail ? ` (${emailData.employeeEmail})` : ""}

Payment Details:
- Amount: ${emailData.amount.toLocaleString()} ${emailData.token}
- Date: ${emailData.paymentDate}
- Company: ${emailData.companyName}
${emailData.transactionHash ? `- Transaction Hash: ${emailData.transactionHash}` : ""}
${emailData.transactionHash ? `- View on BOTScan: ${explorerTxUrl(emailData.transactionHash)}` : ""}

This is an automated payment confirmation from Gemetra.`,
      amount: emailData.amount.toLocaleString(),
      token: emailData.token,
      transaction_hash: emailData.transactionHash || "N/A",
      payment_date: emailData.paymentDate,
      company_name: emailData.companyName,
      employee_name: emailData.employeeName,
      employee_email: emailData.employeeEmail || "N/A",
      explorer_link: emailData.transactionHash
        ? explorerTxUrl(emailData.transactionHash)
        : "N/A",
    };

    console.log(
      `📧 Sending payment notification to ${recipientEmail} for ${emailData.employeeName}`
    );

    // Send email using EmailJS
    // NOTE: Your EmailJS template MUST have "to_email" configured as the recipient field
    // In your EmailJS template settings, set "To Email" field to: {{to_email}}
    // Do NOT hardcode the recipient email in the template
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    console.log(`✅ Payment notification sent to ${recipientEmail}:`, response);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

export const sendBulkPaymentEmails = async (
  emailDataList: PaymentEmailData[]
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;

  // Send emails with a small delay to avoid rate limiting
  for (const emailData of emailDataList) {
    try {
      const result = await sendPaymentEmail(emailData);
      if (result) {
        success++;
      } else {
        failed++;
      }
      
      // Small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to send email to ${emailData.employeeEmail}:`, error);
      failed++;
    }
  }

  return { success, failed };
};