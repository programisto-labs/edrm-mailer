import nodemailer from 'nodemailer';
import MailMessage from '../models/mailMessage.model.js';
import MailTemplateModel from '../models/mailTemplate.model.js';

export interface SendMailOptions {
    template?: string;
    to?: string;
    subject?: string;
    data?: Record<string, any>;
    emailUser?: string;
    emailPassword?: string;
    attachmentFileIds?: string[];
}
export interface SendMailResult {
    success: boolean;
    mailMessageId?: string;
    error?: string;
    info?: any;
}

/**
 * Crée un transporteur nodemailer avec les credentials fournis ou depuis les variables d'environnement
 */
function createTransporter(emailUser?: string, emailPassword?: string): nodemailer.Transporter {
    const user = emailUser || process.env.EMAIL_USER || process.env.EDRM_MAILER_EMAIL_USER || '';
    const pass = emailPassword || process.env.EMAIL_PASSWORD || process.env.EDRM_MAILER_EMAIL_PASSWORD || '';

    return nodemailer.createTransport({
        host: 'smtp.office365.com',
        auth: {
            user,
            pass
        },
        port: 587,
        secure: false,
        tls: {
            ciphers: 'HIGH',
            rejectUnauthorized: false
        }
    });
}

/**
 * Envoie un email en créant un nouveau MailMessage à partir d'un template
 * Fonctionne comme le listener : récupère le template, remplace les variables, crée le message et l'envoie
 */
export async function sendMailFromTemplate(options: SendMailOptions): Promise<SendMailResult> {
    try {
        // Validation des paramètres requis
        if (!options || typeof options !== 'object') {
            return {
                success: false,
                error: 'Invalid options provided to sendMailFromTemplate function'
            };
        }

        if (!options.template) {
            return {
                success: false,
                error: 'Template is required but not provided'
            };
        }

        if (!options.to) {
            return {
                success: false,
                error: 'To address is required but not provided'
            };
        }

        if (!options.data || typeof options.data !== 'object') {
            return {
                success: false,
                error: 'Data is required but not provided or invalid'
            };
        }

        // Validation des credentials email
        const emailUser = options.emailUser || process.env.EMAIL_USER || process.env.EDRM_MAILER_EMAIL_USER;
        const emailPassword = options.emailPassword || process.env.EMAIL_PASSWORD || process.env.EDRM_MAILER_EMAIL_PASSWORD;

        if (!emailUser || !emailPassword) {
            return {
                success: false,
                error: 'Email credentials are missing'
            };
        }

        // Recherche du template
        let template;
        try {
            template = await MailTemplateModel.findOne({ name: options.template });
        } catch (templateError) {
            return {
                success: false,
                error: `Database error while searching for template '${options.template}': ${templateError instanceof Error ? templateError.message : String(templateError)}`
            };
        }

        if (!template) {
            return {
                success: false,
                error: `Template '${options.template}' not found in database`
            };
        }

        // Traitement du body avec remplacement des variables
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

        // Création du message
        const newMailMessage = new MailMessage({
            template: template._id,
            to: options.to,
            from: emailUser,
            subject: options.subject || template.subject,
            body: processedBody
        });

        await newMailMessage.save();

        // Préparer les pièces jointes si des fileIds sont fournis
        const attachments: Array<{
            filename: string;
            content: Buffer;
            contentType?: string;
        }> = [];
        if (options.attachmentFileIds && Array.isArray(options.attachmentFileIds) && options.attachmentFileIds.length > 0) {
            try {
                const apiBaseUrl = process.env.API_BASE_URL || process.env.EDRM_MAILER_API_BASE_URL || 'http://localhost:3000';

                for (const fileId of options.attachmentFileIds) {
                    try {
                        // Télécharger le fichier depuis edrm-storage
                        const downloadResponse = await fetch(`${apiBaseUrl}/edrm-storage/files/${fileId}/download`);

                        if (!downloadResponse.ok) {
                            console.warn(`Failed to download file ${fileId} for attachment: ${downloadResponse.statusText}`);
                            continue;
                        }

                        const downloadData = await downloadResponse.json();

                        if (downloadData.success && downloadData.data) {
                            // Si l'API retourne une URL, télécharger depuis cette URL
                            if (downloadData.data.url) {
                                const fileResponse = await fetch(downloadData.data.url);
                                if (fileResponse.ok) {
                                    const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());
                                    attachments.push({
                                        filename: downloadData.data.filename || downloadData.data.originalName || `attachment-${fileId}`,
                                        content: fileBuffer,
                                        contentType: downloadData.data.contentType || downloadData.data.mimeType || 'application/octet-stream'
                                    });
                                    console.log(`Attachment added successfully: ${downloadData.data.filename || downloadData.data.originalName || fileId}`);
                                } else {
                                    console.warn(`Failed to download file from URL for ${fileId}`);
                                }
                            } else {
                                console.warn(`No URL provided for file ${fileId}`);
                            }
                        } else {
                            console.warn(`Invalid response format for file ${fileId}`);
                        }
                    } catch (fileError) {
                        console.error(`Error processing attachment file ${fileId}:`, fileError);
                        // Continue avec les autres fichiers même si un échoue
                    }
                }
            } catch (attachmentError) {
                console.error('Error processing attachments:', attachmentError);
                // Continue l'envoi de l'email même si les pièces jointes échouent
            }
        }

        // Envoi de l'email
        const transporter = createTransporter(emailUser, emailPassword);
        const mailOptions: nodemailer.SendMailOptions = {
            from: newMailMessage.from,
            to: newMailMessage.to,
            subject: newMailMessage.subject,
            html: newMailMessage.body,
            attachments: attachments.length > 0 ? attachments : undefined
        };

        if (attachments.length > 0) {
            console.log(`Sending email with ${attachments.length} attachment(s)`);
        }

        return new Promise<SendMailResult>((resolve) => {
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
                    resolve({
                        success: false,
                        mailMessageId: newMailMessage._id.toString(),
                        error: error.message
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
                    resolve({
                        success: true,
                        mailMessageId: newMailMessage._id.toString(),
                        info
                    });
                } catch (saveError) {
                    console.error('Failed to update mailMessage after sending email', {
                        saveError: saveError instanceof Error ? saveError.message : saveError,
                        template: options.template,
                        to: options.to
                    });
                    resolve({
                        success: true,
                        mailMessageId: newMailMessage._id.toString(),
                        info,
                        error: 'Email sent, but failed to update message status'
                    });
                }
            });
        });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('Unexpected error in sendMailFromTemplate function', {
            error: errorMessage,
            stack: err instanceof Error ? err.stack : undefined,
            options
        });
        return {
            success: false,
            error: errorMessage
        };
    }
}

/**
 * Renvoie un email existant (resend)
 */
export async function resendMail(mailMessageId: string, emailUser?: string, emailPassword?: string): Promise<SendMailResult> {
    try {
        const mailMessage = await MailMessage.findById(mailMessageId).populate('template');

        if (!mailMessage) {
            return {
                success: false,
                error: 'MailMessage not found'
            };
        }

        const user = emailUser || process.env.EMAIL_USER || process.env.EDRM_MAILER_EMAIL_USER || '';
        const pass = emailPassword || process.env.EMAIL_PASSWORD || process.env.EDRM_MAILER_EMAIL_PASSWORD || '';

        if (!user || !pass) {
            return {
                success: false,
                error: 'Email credentials are missing'
            };
        }

        const transporter = createTransporter(user, pass);
        const mailOptions: nodemailer.SendMailOptions = {
            from: mailMessage.from,
            to: mailMessage.to,
            subject: mailMessage.subject,
            html: mailMessage.body || (mailMessage.template && typeof mailMessage.template === 'object' && 'body' in mailMessage.template ? mailMessage.template.body : '')
        };

        return new Promise<SendMailResult>((resolve) => {
            transporter.sendMail(mailOptions, async (error, info) => {
                if (error) {
                    console.error(`Failed to send email: ${error.message}`, { error });
                    resolve({
                        success: false,
                        mailMessageId: mailMessage._id.toString(),
                        error: error.message
                    });
                    return;
                }

                try {
                    mailMessage.sentAt = new Date();
                    await mailMessage.save();
                    resolve({
                        success: true,
                        mailMessageId: mailMessage._id.toString(),
                        info
                    });
                } catch (saveError) {
                    const errorMessage = saveError instanceof Error ? saveError.message : String(saveError);
                    console.error(`Failed to update mailMessage after sending email: ${errorMessage}`, { saveError });
                    resolve({
                        success: true,
                        mailMessageId: mailMessage._id.toString(),
                        info,
                        error: 'Email sent, but failed to update message status'
                    });
                }
            });
        });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Error processing email resend request: ${errorMessage}`, { err });
        return {
            success: false,
            error: errorMessage
        };
    }
}
