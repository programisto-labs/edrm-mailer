import { Types } from 'mongoose';
import { EnduranceSchema, EnduranceModelType } from '@programisto/endurance';
import { ReturnModelType } from '@typegoose/typegoose';

class MailTemplate extends EnduranceSchema {
  @EnduranceModelType.prop({ required: true })
  public name!: string;

  @EnduranceModelType.prop({ required: true })
  public subject!: string;

  @EnduranceModelType.prop({ required: true })
  public body!: string;

  @EnduranceModelType.prop({ required: false, default: 'global' })
  public category!: string;

  /** Identifiant de l'entité (portail multi-entités). Optionnel pour rétrocompatibilité. */
  @EnduranceModelType.prop({ required: false })
  public entityId?: Types.ObjectId;

  // Méthode statique pour trouver un template par son nom
  static async findByName(this: ReturnModelType<typeof MailTemplate>, name: string) {
    return this.findOne({ name });
  }
}

// Génération du modèle et export
const MailTemplateModel = MailTemplate.getModel();
// Index composé unique : unicité du nom par entité (multi-entités)
MailTemplateModel.schema.index({ entityId: 1, name: 1 }, { unique: true });
export default MailTemplateModel;
