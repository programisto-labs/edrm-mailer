import { registerNotification } from 'endurance-core/lib/notification';
import nodemailer from 'nodemailer';
import MailMessage from '../models/mailMessage.model';
import MailTemplate from '../models/mailTemplate.model';

const emailNotificationHandler = async (options) => {
    if (!options.template) throw new Error("Template is required");
    if (!options.to) throw new Error("To is required");
    if (!options.subject) throw new Error("Subject is required");
    if (!options.data) throw new Error("Data is required");

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
        }
    });

    try {
        const template = await MailTemplate.findByName(options.template);
        if (!template) {
            throw new Error(`Template '${options.template}' not found`);
        }
        const newMailMessage = new MailMessage({
            template: template._id,
            to: options.to,
            from: process.env.EMAIL_USER,
            subject: options.subject,
            body: Object.keys(options.data).reduce((body, key) => {
                const regex = new RegExp(`{${key}}`, 'g');
                return body.replace(regex, options.data[key]);
            }, template.body),
        });

        await newMailMessage.save();

        const mailOptions = {
            from: newMailMessage.from,
            to: newMailMessage.to,
            subject: newMailMessage.subject,
            html: newMailMessage.body,
        };

        transporter.sendMail(mailOptions, async (error, info) => {
            if (error) {
                console.error(`Failed to send email: ${error.message}`, { error });
                return;
            }

            try {
                newMailMessage.sentAt = new Date();
                await newMailMessage.save();
            } catch (saveError) {
                console.error(`Failed to update mailMessage after sending email: ${saveError.message}`, { saveError });
            }
        });
    } catch (err) {
        console.error(`Error processing email send request: ${err.message}`, { err });
        throw new Error(err);
    }
}

registerNotification("EMAIL", emailNotificationHandler);
