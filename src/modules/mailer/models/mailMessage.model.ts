import { EnduranceSchema, EnduranceModelType } from "endurance-core";

class MailMessage extends EnduranceSchema {
  @EnduranceModelType.prop({ required: true })
  public to!: string;

  @EnduranceModelType.prop({ required: true })
  public from!: string;

  @EnduranceModelType.prop({ required: true })
  public subject!: string;

  @EnduranceModelType.prop({ required: true })
  public body!: string;

  @EnduranceModelType.prop({ ref: "MailTemplate" })
  public template?: string;

  @EnduranceModelType.prop({ default: null })
  public sentAt?: Date;
}

// Export du modèle directement utilisable
export default MailMessage.getModel();