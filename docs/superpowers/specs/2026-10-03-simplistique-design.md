# Simplistique — conception de la v1

Date : 2026-10-03
Statut : validé en brainstorming, prêt pour le plan d'implémentation

## 1. Intention

Publier un corpus lisible et navigable d'analyses de termes scientifiques et
techniques, support de la discipline décrite dans le manifeste de la
simplistique.

La réussite de la v1 : le manifeste et les premières fiches sont en ligne,
propres et faciles à parcourir. L'écriture reste réservée à l'auteur ; la
lecture est publique.

Les comptes, les suggestions en ligne et les votes ne font **pas** partie de la
v1. L'architecture leur réserve une place (§11) sans en payer le coût
maintenant.

## 2. Hors périmètre v1

Décisions prises explicitement, avec leur raison :

| Écarté | Raison |
|---|---|
| Comptes, votes, suggestions en ligne | Le coût (authentification, anti-spam, modération) précéderait la communauté. Les suggestions passent par GitHub (§9). |
| Base de données | Aucune écriture à chaud en v1. Le contenu vit dans des fichiers versionnés. |
| Pages « concept » ([[clarté]], [[intuitivité]]…) | Un seul type d'objet en v1 : la fiche d'analyse. Le manifeste reste un texte. |
| Multilingue | Contenu et interface en français, sans champ de langue ni préfixe d'URL. |
| Vue en graphe, mur de termes | Vues globales souhaitées plus tard. Un graphe n'a d'intérêt qu'avec un corpus fourni : les fiches ne se citent pas entre elles, il faudrait fabriquer les arêtes. |
| CMS web d'édition | L'éditeur de texte de l'auteur suffit. |
| Pages par discipline | Ce serait un doublon du catalogue filtré. |

## 3. Modèle de données

### 3.1 Forme générale

Une fiche = un fichier `content/fiches/<slug>.md`. Le `slug` est le nom du
fichier et sert d'URL. Le front-matter porte le noyau structuré, le corps du
fichier porte le développement libre.

Seuls les fichiers présents dans `content/fiches/` sont publiés. Il n'y a pas
d'état « brouillon » : un brouillon se garde hors de ce dossier.

### 3.2 Front-matter

```yaml
terme: groupe                      # requis — le mot ou groupe de mots visé
discipline: mathematiques          # requis — slug présent dans la taxonomie
confusion: faux-ami-courant        # requis — slug présent dans la taxonomie
statut: pointe                     # requis — pointe | propose | rejete
resume: >                          # requis — 1 phrase, 240 caractères max
  Mot courant dont le sens technique n'a aucun rapport
  avec l'idée de collection d'objets.
suggestions: []                     # 0, 1 ou plusieurs alternatives (chaînes)
cree: 2026-10-03                   # requis
modifie: 2026-10-03                # requis
```

`suggestions` est un tableau, jamais une chaîne. Cela autorise le terme pointé
sans alternative (tableau vide) et le cas à plusieurs candidats — et plus tard,
un vote porte naturellement sur une suggestion plutôt que sur la fiche entière.

### 3.3 Convention du corps

Quatre titres de niveau 2, reprenant les règles de suggestion du manifeste :

```markdown
## Pourquoi c'est confus
## Suggestion
## Risques
## D'où ça vient
```

C'est une convention, pas une contrainte technique : le corps est du markdown
libre. L'absence de `## Risques` déclenche un avertissement (§7.2), jamais une
erreur.

`[[mot]]` dans un corps ou dans le manifeste est rendu comme du texte simple
(crochets retirés, mise en forme discrète), sans lien : les pages « concept »
n'existent pas en v1. La syntaxe reste donc dans les sources sans polluer
l'affichage.

### 3.4 Taxonomies

Trois fichiers YAML dans `content/taxonomies/`, chacun une liste d'entrées
`{ slug, nom, description }`.

**`statuts.yml`** — fermé, trois valeurs :

- `pointe` — problème identifié, aucune alternative proposée.
- `propose` — une ou plusieurs alternatives suggérées.
- `rejete` — réflexion menée, conclusion : ne rien changer, le coût du
  changement dépasse le gain.

Le statut `rejete` est exigé par le manifeste (« on préférera garder un mot pas
très intuitif plutôt qu'un nouveau mot un peu moins intuitif »). Une discipline
qui publie ses non-recommandations est plus crédible qu'une qui ne propose que
des changements.

**`confusions.yml`** — extensible, liste de départ :

- `faux-ami-courant` — mot courant dont le sens technique est étranger au sens
  commun (*groupe* en mathématiques, *actif* en comptabilité).
- `polysemie-externe` — même mot pour des concepts sans rapport (*mesure*
  règlementaire contre *mesure* de mesurer).
- `paire-bancale` — opposition de termes qui n'oppose rien de clair
  (*statique* / *dynamique* en escalade).
- `nom-historique` — nom hérité d'une personne ou d'une époque, qui n'évoque
  pas la chose.
- `jargon-opaque` — la forme du mot n'aide en rien à deviner le sens.

**`disciplines.yml`** — extensible, liste de départ : `mathematiques`,
`comptabilite`, `theorie-musicale`, `escalade`.

Ajouter une entrée de taxonomie = ajouter une ligne de YAML. Aucun code ne
code en dur une valeur de taxonomie.

## 4. Routes

Cinq routes, toutes en rendu statique :

| Route | Contenu |
|---|---|
| `/` | Accueil minimale et **volontairement provisoire** : titre, deux phrases sur la simplistique, nombre de termes analysés, liens vers le manifeste et le catalogue. Sa conception sera reprise plus tard ; la v1 livre exactement cela. |
| `/manifeste` | Le manifeste, depuis `content/manifeste.md`. |
| `/fiches` | Les deux vues globales du corpus (§5). |
| `/fiches/<slug>` | Une fiche. |
| `/contribuer` | Depuis `content/contribuer.md` : comment proposer une analyse, lien vers le dépôt, modèle d'issue, et les règles de suggestion du manifeste rappelées là où quelqu'un va s'en servir. |

Un slug inconnu ne peut pas exister : seuls les fichiers présents engendrent
des pages, le reste tombe sur un 404 soigné.

## 5. Les vues globales

### 5.1 Un seul endroit, deux affichages

`/fiches` est la seule adresse où l'on cherche une fiche. Une bascule y change
l'affichage entre **carte** et **liste**, les filtres étant partagés par les
deux : filtrer sur « escalade » en carte puis basculer en liste conserve le
filtre. Les vues suivantes (graphe, mur de termes) s'ajouteront comme un
bouton de plus, sans nouvelle route ni nouvelle entrée de menu.

### 5.2 État dans l'URL

`?vue=carte|liste`, `?discipline=`, `?confusion=`, `?statut=`, `?q=`.
Les valeurs multiples sont séparées par des virgules. Une vue filtrée se
partage donc en lien.

`vue` n'est écrit dans l'URL que lorsque l'utilisateur bascule explicitement.
En son absence, l'affichage par défaut est la carte sur grand écran et la liste
sur petit écran. Une valeur de filtre inconnue est ignorée — jamais d'erreur.

### 5.3 Vue carte (« constellations »)

Une zone par discipline, un point par fiche, avec le nombre de fiches en
titre de zone. L'encodage visuel, entièrement dérivé des champs existants :

- **couleur** : la discipline ;
- **remplissage** : le statut — plein pour `propose`, contour seul pour
  `pointe`, estompé pour `rejete` ;
- **taille** : uniforme. Il n'existe aucun champ d'importance et la v1 n'en
  introduit pas.

Une légende rend cet encodage explicite. La carte dit où une discipline a déjà
été travaillée et où tout reste à faire ; les vides sont une invitation à
contribuer.

Chaque point est un lien réel vers la fiche (`<a>`, pas un `<div>` cliquable),
donc atteignable au clavier et indexable. La carte est en SVG, sans
bibliothèque de graphe.

### 5.4 Vue liste

Tableau : terme, discipline, suggestion(s), statut. Tri alphabétique par terme
par défaut, colonnes triables. C'est la seule vue où l'on compare dix fiches
d'un coup d'œil.

### 5.5 Recherche et filtrage

Le filtrage et la recherche sont intégralement côté navigateur, sur un index
produit au build (terme, slug, discipline, confusion, statut, resume,
suggestions). L'index est embarqué dans la page : pas de requête réseau.

La recherche compare la saisie normalisée (minuscules, accents retirés) aux
champs terme, resume et suggestions, par simple inclusion. Aucun moteur de
recherche flou en v1. À reconsidérer au-delà de quelques centaines de fiches.

## 6. Architecture

### 6.1 Structure

```
content/
  manifeste.md
  contribuer.md
  fiches/<slug>.md
  taxonomies/{disciplines,confusions,statuts}.yml
lib/content/
  schema.ts        # Zod : front-matter et taxonomies
  taxonomies.ts    # chargement et validation des trois listes
  fiches.ts        # getFiches, getFiche, getIndex
  markdown.ts      # markdown -> html, découpage en sections
lib/filtrage.ts    # filtrerFiches(index, criteres) — fonction pure
app/               # les cinq routes
components/
scripts/lint-content.ts
```

### 6.2 La frontière qui compte

`lib/content` est le seul module qui sait que le contenu est du markdown. Il
expose des objets déjà validés ; les composants d'affichage ignorent leur
origine. Le jour où les votes arrivent, une source de données s'ajoute à côté
sans toucher à l'affichage.

Même logique pour `lib/filtrage.ts` : le filtrage est une fonction pure,
testable sans navigateur, séparée du composant qui l'appelle.

### 6.3 Technique

Next.js (App Router, TypeScript), rendu statique, déployé sur Vercel. Tailwind
pour la mise en forme, avec un parti pris typographique sobre : c'est un site
de lecture, et le confort de lecture est le sujet même d'une discipline qui
parle de clarté. `gray-matter` pour le front-matter, `js-yaml` pour les
taxonomies, chaîne `remark`/`rehype` pour le markdown, `zod` pour la
validation. Les versions sont figées au moment du plan d'implémentation.

Aucun code ne s'exécute à chaud : rien à surveiller, rien à payer.

## 7. Validation et erreurs

### 7.1 Validation bloquante, au build

Le schéma Zod est la seule porte d'entrée du contenu. Discipline inconnue,
statut mal orthographié, champ requis absent, `resume` trop long → le build
échoue, donc le déploiement n'a pas lieu. Publier une fiche cassée est
impossible, même en se pressant.

### 7.2 Avertissements, non bloquants

`npm run lint:content` signale ce qui est douteux sans être invalide :

- section `## Risques` absente ;
- `resume` proche de la limite de longueur ;
- **incohérences internes** : statut `pointe` alors que `suggestions` est
  rempli ; statut `propose` avec `suggestions` vide.

Ces dernières sont des erreurs de raisonnement, pas de syntaxe. C'est
précisément ce qu'un outil de simplistique doit savoir attraper.

### 7.3 À l'exécution

Il n'y a presque rien à gérer : tout est statique. Slug inconnu → 404. Filtre
inconnu dans l'URL → ignoré, le corpus complet s'affiche.

## 8. Tests

Développement piloté par les tests, avec Vitest et Testing Library.

1. **Schéma** — fiche valide ; chaque champ requis manquant ; valeur de
   taxonomie inconnue ; `suggestions` vide ; statut `rejete` ; `resume`
   trop long.
2. **Couche contenu** — `getFiches` trie comme attendu ; `getFiche` sur un
   slug absent ; `getIndex` produit les champs voulus ; les taxonomies se
   chargent et refusent un slug dupliqué.
3. **Markdown** — découpage en sections ; `[[mot]]` rendu en texte simple.
4. **Filtrage** — `filtrerFiches` : filtre simple, filtres combinés, valeurs
   multiples, recherche insensible aux accents et à la casse, critère inconnu
   ignoré.
5. **Interface** — la bascule carte/liste conserve les filtres ; les filtres
   s'écrivent dans l'URL et se relisent depuis l'URL.

`next build` sert de test d'intégration : il valide tout le contenu réel.

## 9. Mobile, accessibilité, contribution

La carte n'est jamais le seul chemin vers une fiche — c'est une règle, pas une
préférence. Sur petit écran la bascule s'ouvre sur la liste. Les points de la
carte sont des liens.

En v1, une suggestion extérieure passe par le dépôt GitHub : issue ou *pull
request*, comme le manifeste le proposait déjà. Chaque PR obtient une URL de
prévisualisation Vercel, donc une suggestion se *voit* rendue avant d'être
fusionnée, et la discussion reste publique et tracée.

## 10. Déploiement et intégration continue

Dépôt GitHub, projet Vercel. GitHub Actions sur chaque PR : `lint:content`,
les tests, puis `next build`.

## 11. Ce que la v1 prépare pour les votes

Sans rien implémenter maintenant, la v1 laisse trois prises :

- `suggestions` est un tableau indexé : un vote s'attachera à
  `(slug, index de suggestion)`.
- `lib/content` masque l'origine des données : une base s'ajoutera à côté des
  fichiers sans réécrire l'affichage.
- Les fiches restent des fichiers versionnés même après l'arrivée d'une base :
  seules les données d'interaction (votes, suggestions en attente) auront
  besoin d'écriture à chaud.
