/**
 * Migration : index mail templates multi-entités
 *
 * Supprime l'ancien index unique sur `name` (name_1) et crée l'index composé
 * unique (entityId, name) pour permettre des templates de même nom par entité.
 *
 * Usage : MONGODB_URI=mongodb://... npx ts-node src/scripts/migrate-mailtemplate-index.ts
 * Ou après build : MONGODB_URI=... node dist/scripts/migrate-mailtemplate-index.js
 */
import mongoose from 'mongoose';
import MailTemplateModel from '../modules/mailer/models/mailTemplate.model.js';

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function migrate() {
  if (!MONGODB_URI) {
    console.error('Définir MONGODB_URI ou MONGO_URI');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connexion MongoDB établie');

    await MailTemplateModel.syncIndexes();
    console.log('Index mailtemplates synchronisés (name_1 supprimé, entityId_1_name_1 créé)');
  } catch (err) {
    console.error('Erreur migration:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Déconnexion MongoDB');
  }
}

migrate();
