import emailjs from "@emailjs/browser";

const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "YOUR_PUBLIC_KEY";
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || "YOUR_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "YOUR_TEMPLATE_ID";

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
    // Validate employee email
    if (!emailData.employeeEmail || !emailData.employeeEmail.includes('@')) {
      console.error(`Invalid employee email: ${emailData.employeeEmail}`);
      return false;
    }

    // Prepare template parameters for EmailJS
    // IMPORTANT: Your EmailJS template must use {{to_email}} as the recipient field
    // Make sure your template has "to_email" set as the recipient, not a hardcoded email
    const templateParams = {
      to_name: emailData.employeeName,
      to_email: emailData.employeeEmail, // This should be used as recipient in EmailJS template
      reply_to: emailData.employeeEmail, // Also set reply-to to employee email
      from_name: emailData.companyName,
      subject: `Payment Notification: ${emailData.amount.toLocaleString()} ${emailData.token} from ${emailData.companyName}`,
      message: `Dear ${emailData.employeeName},

Your payment of ${emailData.amount.toLocaleString()} ${emailData.token} has been successfully processed.

Payment Details:
- Amount: ${emailData.amount.toLocaleString()} ${emailData.token}
- Date: ${emailData.paymentDate}
- Company: ${emailData.companyName}
${emailData.transactionHash ? `- Transaction Hash: ${emailData.transactionHash}` : ''}
${emailData.transactionHash ? `- View on BOTScan: https://scan.bohr.life/tx/${emailData.transactionHash}` : ''}

Thank you for your service.

Best regards,
${emailData.companyName} Team`,
      amount: emailData.amount.toLocaleString(),
      token: emailData.token,
      transaction_hash: emailData.transactionHash || 'N/A',
      payment_date: emailData.paymentDate,
      company_name: emailData.companyName,
      explorer_link: emailData.transactionHash 
        ? `https://scan.bohr.life/tx/${emailData.transactionHash}`
        : 'N/A'
    };

    console.log(`📧 Sending payment email to ${emailData.employeeEmail} for ${emailData.employeeName}`);
    console.log('Email template params:', templateParams);

    // Send email using EmailJS
    // NOTE: Your EmailJS template MUST have "to_email" configured as the recipient field
    // In your EmailJS template settings, set "To Email" field to: {{to_email}}
    // Do NOT hardcode the recipient email in the template
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    console.log(`✅ Email sent successfully to ${emailData.employeeEmail}:`, response);
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