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
   analyser le même mot. Minuscules, chiffres et tirets uniquement, sans
   accent : le build échoue sinon, avec le nom du fichier fautif.
2. Remplir le front-matter : `terme`, `discipline`, `confusion`, `statut`,
   `resume` (240 caractères max), `suggestions` (une liste, éventuellement
   vide), `cree`, `modifie`.
3. Développer dans le corps, sous les quatre titres d’usage :
   `## Pourquoi c’est confus`, `## Suggestion`, `## Risques`,
   `## D’où ça vient`.
4. Lancer `npm run lint:content`.

Les valeurs de `discipline` et `confusion` doivent exister dans
`content/taxonomies/`. Ajouter une discipline = ajouter une entrée YAML.

## Adresse du site

`lib/site.ts` expose `urlSite()`, la seule source de l'adresse de base du
site (métadonnées, plan de site, fichier robots). Elle vaut, dans l’ordre :
`NEXT_PUBLIC_URL_SITE` si elle est définie, sinon
`VERCEL_PROJECT_PRODUCTION_URL` (fournie automatiquement par Vercel,
préfixée de `https://`), sinon `http://localhost:3000`. En développement,
c’est donc `http://localhost:3000` par défaut ; elle se règle à
l’hébergement, pas dans le code.

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build statique ; échoue si une fiche est invalide |
| `npm run test:once` | Toute la suite de tests |
| `npm run lint` | ESLint, utilisé par l’intégration continue |
| `npm run lint:content` | Avertissements de cohérence des fiches |
| `npm run migrer` | Crée la table des votes et ses index ; sans effet si elle existe déjà |
| `npm run votes:orphelins` | Signale les votes dont la fiche ou l’alternative a disparu du corpus |

## Variables d’environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Posée par l’intégration Neon de Vercel. |
| `SEL_VOTES` | Une valeur aléatoire de 32 octets, jamais versionnée. |
| `DATABASE_URL_TEST` | Facultative, pour lancer les tests d’intégration en local. |

La mise en service des votes — créer la base, poser le sel, migrer, déployer — est
décrite pas à pas dans [docs/mise-en-service-des-votes.md](docs/mise-en-service-des-votes.md),
avec ce qui casse si une étape manque.

Les deux commandes qui touchent la base — `npm run migrer` et
`npm run votes:orphelins` — lisent `.env.local` s’il existe. Sans lui, passez la
variable sur la même ligne : `DATABASE_URL='...' npm run migrer`. Ne collez pas la
chaîne de connexion avec ses guillemets : elle ne serait pas analysable comme URL.

Sans `DATABASE_URL_TEST`, les tests de `depot-postgres` sont ignorés et la
suite passe quand même.
