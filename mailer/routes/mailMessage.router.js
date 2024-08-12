const nodemailer = require('nodemailer');
const MailMessage = require('../models/mailMessage.model');
const RouterBase = require('./router');
const router = RouterBase();

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
}});


router.post('/:id/send', async (req, res) => {
  try {
    const mailMessage = await MailMessage.findById(req.params.id).populate('template');

    if (!mailMessage) {
      return res.status(404).json({ message: 'MailMessage not found' });
    }

    const mailOptions = {
      from: mailMessage.from,
      to: mailMessage.to,
      subject: mailMessage.subject,
      html: mailMessage.body || (mailMessage.template ? mailMessage.template.body : ''),
    };


    transporter.sendMail(mailOptions, async (error, info) => {
      if (error) {
        console.error(`Failed to send email: ${error.message}`, { error });
        return res.status(500).json({ message: 'Failed to send email', error: error.message });
      }

      try {
        mailMessage.sentAt = new Date();
        await mailMessage.save();
        res.json({ message: 'Email sent successfully', info });
      } catch (saveError) {
        console.error(`Failed to update mailMessage after sending email: ${saveError.message}`, { saveError });
        res.status(500).json({ message: 'Email sent, but failed to update message status', error: saveError.message });
      }
    });
  } catch (err) {
    console.error(`Error processing email send request: ${err.message}`, { err });
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

module.exports = router;
