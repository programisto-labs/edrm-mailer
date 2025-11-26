import { EnduranceSchema, EnduranceModelType } from '@programisto/endurance';
import { ReturnModelType } from '@typegoose/typegoose';

class MailTemplate extends EnduranceSchema {
  @EnduranceModelType.prop({ required: true, unique: true })
  public name!: string;

  @EnduranceModelType.prop({ required: true })
  public subject!: string;

  @EnduranceModelType.prop({ required: true })
  public body!: string;

  @EnduranceModelType.prop({ required: false, default: "global" })
  public category!: string;

  // Méthode statique pour trouver un template par son nom
  static async findByName(this: ReturnModelType<typeof MailTemplate>, name: string) {
    return this.findOne({ name });
  }
}

// Génération du modèle et export
const MailTemplateModel = MailTemplate.getModel();
export default MailTemplateModel;
