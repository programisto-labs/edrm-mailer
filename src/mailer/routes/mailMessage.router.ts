import nodemailer from 'nodemailer';
import MailMessage from '../models/mailMessage.model';
import { EnduranceRouter } from 'endurance-core';

class MailMessageRouter extends EnduranceRouter {
  constructor() {
    super();
    this.autoWire(MailMessage, 'MailMessage', /*{
      checkUserPermissions: accessControl.checkUserPermissions(['canManageMailMessages'])
    }*/);

    this.post('/:id/send', this.sendMail);
  }

  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
    }
  });

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
        html: mailMessage.body || (mailMessage.template && mailMessage.template.body ? mailMessage.template.body : ''),
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
