import MailTemplate from '../models/mailTemplate.model.js';
import { EnduranceRouter, SecurityOptions, Request, Response, NextFunction, EnduranceAuthMiddleware } from 'endurance-core';

class MailTemplateRouter extends EnduranceRouter {
  constructor() {
    super();
  }

  protected setupRoutes(): void {
    const securityOptions: SecurityOptions = {
      permissions: ['canManageMailTemplates']
    };

    this.autoWireSecure(MailTemplate, 'MailTemplate', securityOptions);
  }
}

export default new MailTemplateRouter();
