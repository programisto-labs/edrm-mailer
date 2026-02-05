import { Types } from 'mongoose';
import { EnduranceSchema, EnduranceModelType } from '@programisto/endurance';

class MailMessage extends EnduranceSchema {
  @EnduranceModelType.prop({ required: true })
  public to!: string;

  @EnduranceModelType.prop({ required: true })
  public from!: string;

  @EnduranceModelType.prop({ required: true })
  public subject!: string;

  @EnduranceModelType.prop({ required: true })
  public body!: string;

  @EnduranceModelType.prop({ ref: 'MailTemplate' })
  public template?: string;

  @EnduranceModelType.prop({ default: null })
  public sentAt?: Date;

  /** Identifiant de l'entité (portail multi-entités). Optionnel pour rétrocompatibilité. */
  @EnduranceModelType.prop({ required: false })
  public entityId?: Types.ObjectId;
}

// Export du modèle directement utilisable
export default MailMessage.getModel();
