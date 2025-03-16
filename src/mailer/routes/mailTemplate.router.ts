import MailTemplate from '../models/mailTemplate.model';
import { EnduranceRouter } from 'endurance-core';

class MailTemplateRouter extends EnduranceRouter {
  constructor() {
    super();
    this.autoWire(MailTemplate, 'MailTemplate', /*{
      checkUserPermissions: accessControl.checkUserPermissions(['canManageMailTemplates'])
    }*/);
  }
}

export default new MailTemplateRouter();
