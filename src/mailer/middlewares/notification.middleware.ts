import { enduranceNotificationManager } from 'endurance-core';
import nodemailer from 'nodemailer';
import MailMessage from '../models/mailMessage.model';
import MailTemplateModel from '../models/mailTemplate.model';

const emailNotificationHandler = async (options: { template: string, to: string, subject: string, data: Record<string, any> }) => {
    if (!options.template) throw new Error("Template is required");
    if (!options.to) throw new Error("To is required");
    if (!options.subject) throw new Error("Subject is required");
    if (!options.data) throw new Error("Data is required");

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
        }
    });

    try {
        const template = await MailTemplateModel.findOne({ name: options.template });
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
                if (saveError instanceof Error) {
                    console.error(`Failed to update mailMessage after sending email: ${saveError.message}`, { saveError });
                } else {
                    console.error('Unknown error occurred while updating mailMessage', { saveError });
                }
            }
        });
    } catch (err) {
        if (err instanceof Error) {
            console.error(`Error processing email send request: ${err.message}`, { err });
            throw err;
        } else {
            console.error('Unknown error occurred', { err });
            throw new Error('Unknown error occurred');
        }
    }
}

//enduranceNotificationManager.registerNotification("EMAIL", emailNotificationHandler);
