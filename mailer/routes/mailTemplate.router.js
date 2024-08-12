const Webhook = require('./models/mailTemplate'); 
const RouterBase = require('./router'); 

const router = Router();
RouterBase.autoWire(router, MailTemplate, 'MailTemplate');

module.exports = router;
