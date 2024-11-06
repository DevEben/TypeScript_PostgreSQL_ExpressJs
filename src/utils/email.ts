import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

async function sendMail(options: string | any) {
  try {
    const transporter = nodemailer.createTransport({
      service: process.env.MAIL_SERVICE,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    const mailOption = {
      from: process.env.MAIL_USER,
      to: options.email,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments, // Attachments array
    };

    await transporter.sendMail(mailOption);
    return {
      success: true,
      message: "Email sent successfully",
    };
  } catch (err: unknown) {
    // Type guard to check if the error is an instance of Error
    if (err instanceof Error) {
      console.error("Error sending mail:", err.message);

      return {
        success: false,
        message: "Error sending mail: " + err.message,
      };
    }
  }
}

export { sendMail };