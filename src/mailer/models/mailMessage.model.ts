import { EnduranceSchema, prop } from "endurance-core";

class MailMessage extends EnduranceSchema {
  @prop({ required: true })
  public to!: string;

  @prop({ required: true })
  public from!: string;

  @prop({ required: true })
  public subject!: string;

  @prop({ required: true })
  public body!: string;

  @prop({ ref: "MailTemplate" })
  public template?: string;

  @prop({ default: null })
  public sentAt?: Date;
}

// Export du modèle directement utilisable
export default MailMessage.getModel();