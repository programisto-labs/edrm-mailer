import { enduranceListener, enduranceEventTypes } from '@programisto/endurance';
import nodemailer from 'nodemailer';
import MailMessage from '../models/mailMessage.model.js';
import MailTemplateModel from '../models/mailTemplate.model.js';

interface SendMailOptions {
    template?: string;
    to?: string;
    subject?: string;
    data?: Record<string, any>;
    emailUser?: string;
    emailPassword?: string;
}

async function sendMail(options: SendMailOptions): Promise<void> {
    try {
        // Validation des paramètres requis avec gestion d'erreur
        if (!options || typeof options !== 'object') {
            console.error('Invalid options provided to sendMail function', { options });
            return;
        }

        if (!options.template) {
            console.error('Template is required but not provided', { options });
            return;
        }

        if (!options.to) {
            console.error('To address is required but not provided', { options });
            return;
        }

        if (!options.data || typeof options.data !== 'object') {
            console.error('Data is required but not provided or invalid', { options });
            return;
        }

        // Validation des credentials email
        const emailUser = options.emailUser || process.env.EMAIL_USER;
        const emailPassword = options.emailPassword || process.env.EMAIL_PASSWORD;

        if (!emailUser || !emailPassword) {
            console.error('Email credentials are missing', {
                hasEmailUser: !!emailUser,
                hasEmailPassword: !!emailPassword,
                hasEnvEmailUser: !!process.env.EMAIL_USER,
                hasEnvEmailPassword: !!process.env.EMAIL_PASSWORD
            });
            return;
        }

        const transporter = nodemailer.createTransport({
            host: 'smtp.office365.com',
            auth: {
                user: emailUser,
                pass: emailPassword
            },
            port: 587,
            secure: false,
            tls: {
                ciphers: 'HIGH',
                rejectUnauthorized: false
            }
        });

        // Recherche du template avec gestion d'erreur
        let template;
        try {
            template = await MailTemplateModel.findOne({ name: options.template });
        } catch (templateError) {
            console.error(`Database error while searching for template '${options.template}'`, {
                templateError,
                template: options.template
            });
            return;
        }

        if (!template) {
            console.error(`Template '${options.template}' not found in database`, {
                template: options.template,
                availableTemplates: await MailTemplateModel.find({}, 'name').lean().catch(() => [])
            });
            return;
        }

        // Création du message avec gestion d'erreur
        let newMailMessage;
        try {
            // Vérification de sécurité pour options.data
            if (!options.data) {
                console.error('Data is undefined after validation', { options });
                return;
            }

            const processedBody = Object.keys(options.data).reduce((body, key) => {
                try {
                    const regex = new RegExp(`{${key}}`, 'g');
                    return body.replace(regex, String(options.data![key]));
                } catch (replaceError) {
                    console.warn(`Error replacing template variable {${key}}`, {
                        replaceError,
                        key,
                        value: options.data![key]
                    });
                    return body;
                }
            }, template.body);

            newMailMessage = new MailMessage({
                template: template._id,
                to: options.to,
                from: emailUser,
                subject: options.subject || template.subject,
                body: processedBody
            });

            await newMailMessage.save();
        } catch (messageError) {
            console.error('Error creating or saving mail message', {
                messageError,
                template: options.template,
                to: options.to
            });
            return;
        }

        // Configuration des options d'envoi
        const mailOptions = {
            from: newMailMessage.from,
            to: newMailMessage.to,
            subject: newMailMessage.subject,
            html: newMailMessage.body
        };

        // Envoi de l'email avec gestion d'erreur
        transporter.sendMail(mailOptions, async (error, info) => {
            if (error) {
                console.error('Failed to send email', {
                    error: error.message,
                    mailOptions: {
                        from: mailOptions.from,
                        to: mailOptions.to,
                        subject: mailOptions.subject
                    },
                    template: options.template
                });
                return;
            }

            // Mise à jour du statut d'envoi
            try {
                newMailMessage.sentAt = new Date();
                await newMailMessage.save();
                console.log('Email sent successfully', {
                    info,
                    template: options.template,
                    to: options.to
                });
            } catch (saveError) {
                console.error('Failed to update mailMessage after sending email', {
                    saveError: saveError instanceof Error ? saveError.message : saveError,
                    template: options.template,
                    to: options.to
                });
            }
        });
    } catch (err) {
        console.error('Unexpected error in sendMail function', {
            error: err instanceof Error ? err.message : err,
            stack: err instanceof Error ? err.stack : undefined,
            options
        });
    }
}

enduranceListener.createListener(enduranceEventTypes.SEND_EMAIL, (args: unknown) => {
    try {
        if (!args || typeof args !== 'object') {
            console.error('Invalid arguments provided to SEND_EMAIL listener', { args });
            return;
        }
        sendMail(args as SendMailOptions);
    } catch (listenerError) {
        console.error('Error in SEND_EMAIL listener', {
            error: listenerError instanceof Error ? listenerError.message : listenerError,
            args
        });
    }
});

export default enduranceListener;
