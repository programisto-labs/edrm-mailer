import nodemailer from 'nodemailer';
import MailMessage from '../models/mailMessage.model.js';
import { EnduranceRouter, SecurityOptions } from '@programisto/endurance';

class MailMessageRouter extends EnduranceRouter {
  private transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    auth: {
      user: process.env.EDRM_MAILER_EMAIL_USER || '',
      pass: process.env.EDRM_MAILER_EMAIL_PASSWORD || ''
    },
    port: 587,
    secure: false,
    tls: {
      ciphers: 'HIGH',
      rejectUnauthorized: false
    }
  });

  protected setupRoutes(): void {
    const mailMessageSecurityOptions: SecurityOptions = {
      requireAuth: true,
      permissions: []
    };

    const mailMessagePermission = process.env.EDRM_MAILER_MAIL_MESSAGE_PERMISSION || '';
    if (mailMessagePermission) {
      mailMessageSecurityOptions.permissions?.push(mailMessagePermission);
    }

    this.post('/:id/send', mailMessageSecurityOptions, this.sendMail.bind(this));

    // Lister tous les messages de mail
    this.get('/', mailMessageSecurityOptions, async (req: any, res: any) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search as string || '';
        const template = req.query.template as string || 'all';
        const from = req.query.from as string || 'all';
        const to = req.query.to as string || 'all';
        const sortBy = req.query.sortBy as string || 'updatedAt';
        const sortOrder = req.query.sortOrder as string || 'desc';

        // Construction de la requête de recherche
        const query: any = {};

        // Filtres
        if (template !== 'all') {
          query.template = template;
        }
        if (from !== 'all') {
          query.from = from;
        }
        if (to !== 'all') {
          query.to = to;
        }

        // Recherche sur sujet, destinataire, expéditeur et contenu
        if (search) {
          // Diviser la recherche en mots-clés
          const keywords = search.split(/\s+/).filter(Boolean);

          // Créer des expressions régulières pour chaque mot-clé
          const regexPatterns = keywords.map(keyword =>
            new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
          );

          query.$or = [
            { subject: { $in: regexPatterns } },
            { to: { $in: regexPatterns } },
            { from: { $in: regexPatterns } },
            { body: { $in: regexPatterns } }
          ];
        }

        // Construction du tri
        const sortOptions: Record<string, 1 | -1> = {
          [sortBy]: sortOrder === 'asc' ? 1 : -1
        };

        const [messages, total] = await Promise.all([
          MailMessage.find(query)
            .populate('template', 'name subject category')
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .exec(),
          MailMessage.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.json({
          data: messages,
          pagination: {
            currentPage: page,
            totalPages,
            totalItems: total,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
          }
        });
      } catch (error) {
        console.error('Erreur lors de la récupération des messages de mail:', error);
        res.status(500).send('Erreur interne du serveur');
      }
    });
  }

  private async sendMail(req: any, res: any) {
    try {
      const mailMessage = await MailMessage.findById(req.params.id).populate('template');

      if (!mailMessage) {
        return res.status(404).json({ message: 'MailMessage not found' });
      }

      const mailOptions = {
        from: mailMessage.from,
        to: mailMessage.to,
        subject: mailMessage.subject,
        html: mailMessage.body || (mailMessage.template && mailMessage.template.body ? mailMessage.template.body : '')
      };

      this.transporter.sendMail(mailOptions, async (error, info) => {
        if (error) {
          console.error(`Failed to send email: ${error.message}`, { error });
          return res.status(500).json({ message: 'Failed to send email', error: error.message });
        }

        try {
          mailMessage.sentAt = new Date();
          await mailMessage.save();
          res.json({ message: 'Email sent successfully', info });
        } catch (saveError) {
          if (saveError instanceof Error) {
            console.error(`Failed to update mailMessage after sending email: ${saveError.message}`, { saveError });
            res.status(500).json({ message: 'Email sent, but failed to update message status', error: saveError.message });
          } else {
            console.error('Unknown error occurred while updating mailMessage', { saveError });
            res.status(500).json({ message: 'Email sent, but failed to update message status', error: 'Unknown error' });
          }
        }
      });
    } catch (err) {
      if (err instanceof Error) {
        console.error(`Error processing email send request: ${err.message}`, { err });
        res.status(500).json({ message: 'Internal server error', error: err.message });
      } else {
        console.error('Unknown error occurred', { err });
        res.status(500).json({ message: 'Internal server error', error: 'Unknown error occurred' });
      }
    }
  }
}

export default new MailMessageRouter();
