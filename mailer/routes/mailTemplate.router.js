import Webhook from './models/mailTemplate';
import RouterBase from './router';

const router = Router();
RouterBase.autoWire(router, MailTemplate, 'MailTemplate');

export default router;
