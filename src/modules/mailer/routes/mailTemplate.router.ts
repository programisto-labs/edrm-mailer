import { EnduranceRouter, SecurityOptions } from '@programisto/endurance';
import MailTemplateModel from '../models/mailTemplate.model.js';

class MailTemplateRouter extends EnduranceRouter {
  protected setupRoutes(): void {
    const mailTemplateSecurityOptions: SecurityOptions = {
      requireAuth: true,
      permissions: []
    };

    const mailTemplatePermission = process.env.EDRM_MAILER_MAIL_TEMPLATE_PERMISSION || '';
    if (mailTemplatePermission) {
      mailTemplateSecurityOptions.permissions?.push(mailTemplatePermission);
    }

    /**
     * @swagger
     * /mailTemplate:
     *   get:
     *     summary: Lister les templates d'email
     *     description: Récupère la liste paginée des templates avec filtres, recherche et tri. Authentification requise.
     *     tags: [MailTemplate]
     *     parameters:
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           default: 1
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           default: 10
     *       - in: query
     *         name: search
     *         schema:
     *           type: string
     *         description: Recherche sur nom, sujet et catégorie
     *       - in: query
     *         name: category
     *         schema:
     *           type: string
     *           default: all
     *       - in: query
     *         name: sortBy
     *         schema:
     *           type: string
     *           default: updatedAt
     *       - in: query
     *         name: sortOrder
     *         schema:
     *           type: string
     *           enum: [asc, desc]
     *           default: desc
     *     responses:
     *       200:
     *         description: Liste paginée des templates
     *       500:
     *         description: Erreur serveur
     */
    this.get('/', mailTemplateSecurityOptions, async (req: any, res: any) => {
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

    /**
     * @swagger
     * /mailTemplate/{id}:
     *   get:
     *     summary: Récupérer un template
     *     description: Renvoie le détail d'un template par son identifiant. Authentification requise.
     *     tags: [MailTemplate]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Identifiant du template
     *     responses:
     *       200:
     *         description: Détail du template
     *       404:
     *         description: Template non trouvé
     *       500:
     *         description: Erreur serveur
     */
    // Récupérer le détail d'un template de mail
    this.get('/:id', mailTemplateSecurityOptions, async (req: any, res: any) => {
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

    /**
     * @swagger
     * /mailTemplate:
     *   post:
     *     summary: Créer un template d'email
     *     description: Crée un nouveau template après validation des champs requis. Authentification requise.
     *     tags: [MailTemplate]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [name, subject, body]
     *             properties:
     *               name:
     *                 type: string
     *               subject:
     *                 type: string
     *               body:
     *                 type: string
     *               category:
     *                 type: string
     *                 default: global
     *     responses:
     *       201:
     *         description: Template créé
     *       400:
     *         description: Champs requis manquants
     *       409:
     *         description: Doublon sur le nom
     *       500:
     *         description: Erreur serveur
     */
    // Créer un nouveau template de mail
    this.post('/', mailTemplateSecurityOptions, async (req: any, res: any) => {
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

    /**
     * @swagger
     * /mailTemplate/{id}:
     *   put:
     *     summary: Mettre à jour un template d'email
     *     description: Met à jour un template existant après validation des données. Authentification requise.
     *     tags: [MailTemplate]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Identifiant du template à mettre à jour
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [name, subject, body]
     *             properties:
     *               name:
     *                 type: string
     *               subject:
     *                 type: string
     *               body:
     *                 type: string
     *               category:
     *                 type: string
     *                 default: global
     *     responses:
     *       200:
     *         description: Template mis à jour
     *       400:
     *         description: Champs requis manquants
     *       404:
     *         description: Template non trouvé
     *       409:
     *         description: Conflit sur le nom
     *       500:
     *         description: Erreur serveur
     */
    // Mettre à jour un template de mail
    this.put('/:id', mailTemplateSecurityOptions, async (req: any, res: any) => {
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

    /**
     * @swagger
     * /mailTemplate/{id}:
     *   delete:
     *     summary: Supprimer un template d'email
     *     description: Supprime un template après vérification de son existence. Authentification requise.
     *     tags: [MailTemplate]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Identifiant du template à supprimer
     *     responses:
     *       204:
     *         description: Template supprimé
     *       404:
     *         description: Template non trouvé
     *       500:
     *         description: Erreur serveur
     */
    // Supprimer un template de mail
    this.delete('/:id', mailTemplateSecurityOptions, async (req: any, res: any) => {
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
