import MailTemplate from './models/mailTemplate';
import routerFactory from 'endurance-core/lib/router';
const router = routerFactory();

router.autoWire(MailTemplate, 'MailTemplate', {
    checkUserPermissions: auth.checkUserPermissions(['canManageMailTemplates'])
  });

export default router;
