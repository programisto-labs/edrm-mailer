import MailMessage from '../models/mailMessage.model.js';
import { EnduranceRouter, SecurityOptions } from '@programisto/endurance';
import { sendMailFromTemplate, resendMail as resendMailService, SendMailOptions } from '../services/mailer.service.js';

class MailMessageRouter extends EnduranceRouter {
  protected setupRoutes(): void {
    const mailMessageSecurityOptions: SecurityOptions = {
      requireAuth: true,
      permissions: []
    };

    const mailMessagePermission = process.env.EDRM_MAILER_MAIL_MESSAGE_PERMISSION || '';
    if (mailMessagePermission) {
      mailMessageSecurityOptions.permissions?.push(mailMessagePermission);
    }

    // Route pour envoyer un email à partir d'un template (comme le listener)
    this.post('/send', mailMessageSecurityOptions, this.sendMail.bind(this));

    // Route pour renvoyer un email existant
    this.post('/:id/resend', mailMessageSecurityOptions, this.resendMail.bind(this));

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

  /**
   * Route POST /send
   * Envoie un email à partir d'un template (fonctionne comme le listener)
   * Body attendu: { template: string, to: string, subject?: string, data: Record<string, any>, emailUser?: string, emailPassword?: string }
   */
  private async sendMail(req: any, res: any) {
    try {
      const options: SendMailOptions = {
        template: req.body.template,
        to: req.body.to,
        subject: req.body.subject,
        data: req.body.data,
        emailUser: req.body.emailUser,
        emailPassword: req.body.emailPassword
      };

      const result = await sendMailFromTemplate(options);

      if (!result.success) {
        return res.status(400).json({
          message: 'Failed to send email',
          error: result.error
        });
      }

      return res.json({
        message: 'Email sent successfully',
        mailMessageId: result.mailMessageId,
        info: result.info
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

  /**
   * Route POST /:id/resend
   * Renvoie un email existant
   */
  private async resendMail(req: any, res: any) {
    try {
      const result = await resendMailService(
        req.params.id,
        req.body.emailUser,
        req.body.emailPassword
      );

      if (!result.success) {
        if (result.error === 'MailMessage not found') {
          return res.status(404).json({ message: result.error });
        }
        return res.status(500).json({
          message: 'Failed to resend email',
          error: result.error
        });
      }

      return res.json({
        message: 'Email resent successfully',
        mailMessageId: result.mailMessageId,
        info: result.info
      });
    } catch (err) {
      if (err instanceof Error) {
        console.error(`Error processing email resend request: ${err.message}`, { err });
        res.status(500).json({ message: 'Internal server error', error: err.message });
      } else {
        console.error('Unknown error occurred', { err });
        res.status(500).json({ message: 'Internal server error', error: 'Unknown error occurred' });
      }
    }
  }
}

export default new MailMessageRouter();
