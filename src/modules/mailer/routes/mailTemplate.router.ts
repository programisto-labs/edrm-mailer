import MailTemplate from '../models/mailTemplate.model.js';
import { EnduranceRouter, SecurityOptions } from '@programisto/endurance-core';

class MailTemplateRouter extends EnduranceRouter {
  constructor() {
    super();
  }

  protected setupRoutes(): void {
    const securityOptions: SecurityOptions = {
      permissions: ['canManageMailTemplates']
    };

  }
}

export default new MailTemplateRouter();
