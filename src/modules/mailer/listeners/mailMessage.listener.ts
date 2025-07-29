import { enduranceListener, enduranceEventTypes } from '@programisto/endurance-core';
import nodemailer from 'nodemailer';
import MailMessage from '../models/mailMessage.model.js';
import MailTemplateModel from '../models/mailTemplate.model.js';

interface SendMailOptions {
    template: string;
    to: string;
    subject?: string;
    data: Record<string, any>;
    emailUser?: string;
    emailPassword?: string;
}

async function sendMail(options: SendMailOptions): Promise<void> {
    if (!options.template) throw new Error("Template is required");
    if (!options.to) throw new Error("To is required");
    if (!options.data) throw new Error("Data is required");

    const transporter = nodemailer.createTransport({
        host: 'smtp.office365.com',
        auth: {
            user: options.emailUser || process.env.EMAIL_USER || '',
            pass: options.emailPassword || process.env.EMAIL_PASSWORD || '',
        },
        port: 587,
        secure: false,
        tls: {
            ciphers: 'HIGH',
            rejectUnauthorized: false
        }
    });

    console.log('SMTP Configuration:', {
        user: (options.emailUser || process.env.EMAIL_USER) ? 'defined' : 'undefined',
        pass: (options.emailPassword || process.env.EMAIL_PASS) ? 'defined' : 'undefined',
        host: 'smtp.office365.com',
        port: 587
    });

    try {
        const template = await MailTemplateModel.findOne({ name: options.template });
        if (!template) {
            throw new Error(`Template '${options.template}' not found`);
        }

        const newMailMessage = new MailMessage({
            template: template._id,
            to: options.to,
            from: options.emailUser || process.env.EMAIL_USER,
            subject: options.subject || template.subject,
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
                console.log('Email sent successfully', { info });
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
        } else {
            console.error('Unknown error occurred', { err });
        }
    }
}

enduranceListener.createListener(enduranceEventTypes.SEND_EMAIL, (args: unknown) => {
    sendMail(args as SendMailOptions);
});

export default enduranceListener;
