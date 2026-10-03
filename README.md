# Simplistique

Site de la simplistique : une discipline qui cherche à simplifier les autres
disciplines par le langage. Voir `/manifeste` pour l’intention, et
`docs/superpowers/specs/` pour la conception.

## Démarrer

```bash
npm install
npm run dev
```

## Ajouter une fiche

1. Créer `content/fiches/<terme>-<discipline>.md`. Le nom du fichier devient
   l’URL ; il n’est jamais dérivé du terme, pour que deux disciplines puissent
   analyser le même mot.
2. Remplir le front-matter : `terme`, `discipline`, `confusion`, `statut`,
   `resume` (240 caractères max), `suggestions` (une liste, éventuellement
   vide), `cree`, `modifie`.
3. Développer dans le corps, sous les quatre titres d’usage :
   `## Pourquoi c’est confus`, `## Suggestion`, `## Risques`,
   `## D’où ça vient`.
4. Lancer `npm run lint:content`.

Les valeurs de `discipline` et `confusion` doivent exister dans
`content/taxonomies/`. Ajouter une discipline = ajouter une entrée YAML.

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build statique ; échoue si une fiche est invalide |
| `npm run test:once` | Toute la suite de tests |
| `npm run lint:content` | Avertissements de cohérence des fiches |
