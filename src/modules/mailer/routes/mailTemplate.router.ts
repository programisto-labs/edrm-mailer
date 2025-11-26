import { EnduranceRouter, SecurityOptions } from '@programisto/endurance';
import MailTemplateModel from '../models/mailTemplate.model.js';

class MailTemplateRouter extends EnduranceRouter {
  protected setupRoutes(): void {
    const securityOptions: SecurityOptions = {
      requireAuth: true,
      permissions: []
    };

    this.get('/', securityOptions, async (req: any, res: any) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search as string || '';
        const category = req.query.category as string || 'all';
        const sortBy = req.query.sortBy as string || 'updatedAt';
        const sortOrder = req.query.sortOrder as string || 'desc';

        // Construction de la requête de recherche
        const query: any = {};

        // Filtres
        if (category !== 'all') {
          query.category = category;
        }

        // Recherche sur nom, sujet et catégorie
        if (search) {
          // Diviser la recherche en mots-clés
          const keywords = search.split(/\s+/).filter(Boolean);

          // Créer des expressions régulières pour chaque mot-clé
          const regexPatterns = keywords.map(keyword =>
            new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
          );

          query.$or = [
            { name: { $in: regexPatterns } },
            { subject: { $in: regexPatterns } },
            { category: { $in: regexPatterns } }
          ];
        }

        // Construction du tri
        const sortOptions: Record<string, 1 | -1> = {
          [sortBy]: sortOrder === 'asc' ? 1 : -1
        };

        const [templates, total] = await Promise.all([
          MailTemplateModel.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .exec(),
          MailTemplateModel.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.json({
          data: templates,
          pagination: {
            currentPage: page,
            totalPages,
            totalItems: total,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
          }
        });
      } catch (error) {
        console.error('Erreur lors de la récupération des templates de mail:', error);
        res.status(500).send('Erreur interne du serveur');
      }
    });

    // Récupérer le détail d'un template de mail
    this.get('/:id', securityOptions, async (req: any, res: any) => {
      try {
        const id = req.params.id;
        const template = await MailTemplateModel.findById(id);

        if (!template) {
          return res.status(404).json({ message: 'Template de mail non trouvé' });
        }

        return res.json(template);
      } catch (error) {
        console.error('Erreur lors de la récupération du détail du template de mail:', error);
        res.status(500).send('Erreur interne du serveur');
      }
    });

    // Créer un nouveau template de mail
    this.post('/', securityOptions, async (req: any, res: any) => {
      try {
        const { name, subject, body, category } = req.body;

        // Validation des champs requis
        if (!name || !subject || !body) {
          return res.status(400).json({
            message: 'Les champs name, subject et body sont requis'
          });
        }

        // Vérifier si un template avec le même nom existe déjà
        const existingTemplate = await MailTemplateModel.findOne({ name });
        if (existingTemplate) {
          return res.status(409).json({
            message: 'Un template avec ce nom existe déjà'
          });
        }

        const newTemplate = new MailTemplateModel({
          name,
          subject,
          body,
          category: category || 'global'
        });

        const savedTemplate = await newTemplate.save();
        return res.status(201).json(savedTemplate);
      } catch (error) {
        console.error('Erreur lors de la création du template de mail:', error);
        res.status(500).send('Erreur interne du serveur');
      }
    });

    // Mettre à jour un template de mail
    this.put('/:id', securityOptions, async (req: any, res: any) => {
      try {
        const id = req.params.id;
        const { name, subject, body, category } = req.body;

        // Validation des champs requis
        if (!name || !subject || !body) {
          return res.status(400).json({
            message: 'Les champs name, subject et body sont requis'
          });
        }

        // Vérifier si le template existe
        const existingTemplate = await MailTemplateModel.findById(id);
        if (!existingTemplate) {
          return res.status(404).json({
            message: 'Template de mail non trouvé'
          });
        }

        // Vérifier si un autre template avec le même nom existe déjà
        const duplicateTemplate = await MailTemplateModel.findOne({
          name,
          _id: { $ne: id }
        });
        if (duplicateTemplate) {
          return res.status(409).json({
            message: 'Un template avec ce nom existe déjà'
          });
        }

        // Mettre à jour le template
        const updatedTemplate = await MailTemplateModel.findByIdAndUpdate(
          id,
          {
            name,
            subject,
            body,
            category: category || 'global'
          },
          { new: true, runValidators: true }
        );

        return res.json(updatedTemplate);
      } catch (error) {
        console.error('Erreur lors de la mise à jour du template de mail:', error);
        res.status(500).send('Erreur interne du serveur');
      }
    });

    // Supprimer un template de mail
    this.delete('/:id', securityOptions, async (req: any, res: any) => {
      try {
        const id = req.params.id;

        // Vérifier si le template existe
        const existingTemplate = await MailTemplateModel.findById(id);
        if (!existingTemplate) {
          return res.status(404).json({
            message: 'Template de mail non trouvé'
          });
        }

        // Supprimer le template
        await MailTemplateModel.findByIdAndDelete(id);

        return res.status(204).send();
      } catch (error) {
        console.error('Erreur lors de la suppression du template de mail:', error);
        res.status(500).send('Erreur interne du serveur');
      }
    });
  }
}

export default new MailTemplateRouter();
