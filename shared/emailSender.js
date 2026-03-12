import nodemailer from "nodemailer";

const emailTransporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "veereshnaik.swio@gmail.com",
    pass: "pynm dvcu trtj zjxk",
  },
});


class EmailSender {
  static async sendEmail(to, subject, body, attachments = []) {
    try {
      const emailOptions = {
        from: "veereshnaik.swio@gmail.com",
        to,
        subject,
        html: body,
        attachments,
      };

      const info = await emailTransporter.sendMail(emailOptions);
      console.log("Email sent successfully:", info.response);
      return;
    } catch (err) {
      console.error("Error sending email:", err);
    }
  }
}

export default EmailSender;
