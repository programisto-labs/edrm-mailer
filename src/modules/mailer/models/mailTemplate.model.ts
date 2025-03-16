import { EnduranceSchema, prop } from "endurance-core";
import { ReturnModelType } from "@typegoose/typegoose";

class MailTemplate extends EnduranceSchema {
  @prop({ required: true, unique: true })
  public name!: string;

  @prop({ required: true })
  public subject!: string;

  @prop({ required: true })
  public body!: string;

  // Méthode statique pour trouver un template par son nom
  static async findByName(this: ReturnModelType<typeof MailTemplate>, name: string) {
    return this.findOne({ name });
  }
}

// Génération du modèle et export
const MailTemplateModel = MailTemplate.getModel();
export default MailTemplateModel;