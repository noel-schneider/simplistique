# Chantiers — conception

Date : 2026-10-04
Statut : validé en brainstorming, prêt pour le plan d'implémentation
Complète : `docs/superpowers/specs/2026-10-03-simplistique-design.md` (la v1)

Cette spec ajoute un troisième type de contenu au corpus. Elle ne remplace rien : les
fiches, les taxonomies, la carte et les votes restent tels qu'ils sont.

## 1. Intention

Certains mots ne se renomment pas seuls. « Actif » et « passif » n'opposent rien de
clair, et renommer l'un sans l'autre déplacerait la confusion au lieu de la lever :
c'est la paire qui tient debout, ou rien. En algèbre, « groupe » appartient à une famille
entière — anneau, corps, idéal — dont les noms se répondent.

Aujourd'hui le site présente ces mots comme des cas indépendants. Un lecteur arrive sur
`actif`, lit l'analyse, choisit « avoirs » ou « ressources », et repart sans jamais
savoir qu'une moitié de la question lui a échappé.

**Un chantier est le document qui porte la réforme d'ensemble**, et qu'une fiche de mot
désigne pour dire : ce terme est un cas particulier d'un problème plus large, va lire
l'argument complet avant de te faire un avis.

La réussite tient en une phrase : un lecteur qui ouvre `actif` doit comprendre, avant
d'avoir lu les suggestions, que ce mot ne se renomme pas seul.

## 2. Ce qu'est un chantier, et ce qu'il n'est pas

Un chantier **est** un texte qui expose un problème de vocabulaire à l'échelle d'un
corpus de mots : ce que l'ensemble a de bancal, ce qu'une réforme cohérente demanderait,
et ce qu'elle coûterait. Il se lit comme une fiche, en plus large.

Un chantier **n'est pas** :

- une catégorie de plus. Les disciplines et les types de confusion classent ; un chantier
  argumente. Deux fiches partagent un type de confusion sans que leurs réformes aient le
  moindre rapport ;
- un conteneur obligatoire. Une fiche sans chantier reste une fiche normale, et c'est le
  cas de la plupart ;
- un objet votable. Le vote reste au niveau du mot (voir §7).

## 3. Hors périmètre

Décidé en brainstorming, et à ne pas réintroduire sans une nouvelle discussion :

- **Pas de statut sur un chantier.** Les fiches portent `pointe` / `propose` / `rejete` ;
  un chantier n'en porte aucun. Voir §4.3.
- **Rien sur la carte.** La vue en graphe ne change pas : ni nœud de chantier, ni
  enveloppe autour des fiches. On verra à l'usage si elle en a besoin.
- **Pas de page d'index `/chantiers`.** Voir §5.4.
- **Pas de jeux d'alternatives cohérents.** Le chantier ne déclare pas que « avoirs »
  appelle « dettes ». C'était une option étudiée puis écartée : elle demanderait de
  déclarer des appariements, de les valider, et rendrait visiblement bancal le vote mot
  par mot, qui est pourtant ce que la spec des votes a retenu.
- **Pas de hiérarchie entre chantiers.** Pas de chantier parent, pas de sous-chantier.

## 4. Modèle de contenu

### 4.1 Le fichier d'un chantier

Un fichier markdown par chantier, dans `content/chantiers/`, bâti sur le même moule
qu'une fiche :

```markdown
---
nom: Le vocabulaire du bilan
discipline: comptabilite
resume: >
  Les deux colonnes du bilan portent des adjectifs substantivés qui n'opposent
  rien de clair, et aucune ne se renomme sans l'autre.
cree: 2026-10-04
modifie: 2026-10-04
---

## Pourquoi c'est confus

…

## Ce qu'une réforme demanderait

…

## Risques

…
```

| Champ | Règle |
|---|---|
| slug | **Le nom du fichier**, jamais un champ. Même règle que les fiches. |
| `nom` | Non vide. Le titre affiché. |
| `discipline` | Un slug de `content/taxonomies/disciplines.yml`. |
| `resume` | Non vide, 240 caractères au plus — c'est la méta-description de la page. |
| `cree`, `modifie` | Dates, `modifie` jamais antérieure à `cree`. |

Le corps est du markdown, rendu par la chaîne existante de `lib/content/markdown.ts`,
avec le même assainissement et les mêmes identifiants de titres que les fiches.

### 4.2 Le champ `chantier` d'une fiche

Les fiches gagnent un champ **optionnel** :

```yaml
chantier: vocabulaire-du-bilan
```

Absent, la fiche se comporte exactement comme aujourd'hui. Présent, il doit désigner un
chantier existant **de la même discipline que la fiche** (§6.1).

Une fiche appartient à **un chantier au plus**, et un chantier à **une discipline
exactement**. La hiérarchie est donc : discipline → chantier → fiches.

### 4.3 Pourquoi pas de statut sur un chantier

Un statut de chantier créerait un second vocabulaire à tenir cohérent avec le premier, et
la question « que veut dire une fiche `propose` dans un chantier `pointe` ? » n'a pas de
réponse évidente. Le statut d'une réforme d'ensemble se lit déjà dans celui de ses
fiches.

C'est aussi, en creux, la leçon de la décision 5 des décisions en attente : le champ
`description` des taxonomies est obligatoire et personne ne l'affiche. Un champ imposé
avant d'avoir une question à laquelle il répond finit rempli à la va-vite.

### 4.4 Pourquoi le rattachement s'écrit dans la fiche

L'autre sens était possible : le chantier listant ses fiches. Écrire `chantier:` dans la
fiche a été retenu parce que **c'est la convention déjà établie** — une fiche déclare
déjà sa discipline et son type de confusion, et personne n'a à se demander où regarder.

Conséquence assumée : créer un chantier demande de toucher à ses fiches. C'est le prix
d'une seule règle à retenir plutôt que deux.

## 5. Pages et navigation

### 5.1 `/chantiers/<slug>`

Page **générée au build**, avec `generateStaticParams` et `dynamicParams = false`, comme
les fiches. Elle contient, dans cet ordre :

1. le nom du chantier et sa discipline ;
2. le texte de la réforme ;
3. **la liste de ses fiches**, chacune avec son terme, son statut et son résumé.

La liste des fiches vient en dernier à dessein : on descend de l'argument d'ensemble vers
les cas particuliers, pas l'inverse.

Métadonnées : titre = `nom`, description = `resume`, comme les fiches.

### 5.2 Le bandeau sur la fiche

Une fiche rattachée affiche, **en haut, juste sous l'en-tête et avant le corps**, un
bandeau qui nomme son chantier et renvoie vers lui.

La position n'est pas un détail d'esthétique : l'intention du §1 est qu'un lecteur sache
que le mot ne se renomme pas seul **avant** de lire les suggestions. Un bandeau placé en
bas arriverait après que le lecteur s'est fait un avis sur « avoirs » ou « ressources »,
c'est-à-dire trop tard pour servir à quelque chose.

### 5.3 Le filtre du catalogue

`/fiches` gagne un filtre « chantier » à côté de `disciplines`, `confusions` et
`statuts`. Il suit exactement leurs règles : écrit dans l'URL, lisible au rechargement,
cumulable avec les autres.

Le filtre travaille sur `FicheIndex`, qui dérive de `FicheMeta` : ajouter `chantier` au
second le fait apparaître dans le premier sans autre intervention.

Le **contenu de secours statique** (`components/catalogue-statique.tsx`) ne porte **aucun**
filtre, et ce n'est pas un oubli : c'est un composant d'affichage pur, qui montre le
corpus entier dans un tableau et annonce que les filtres arrivent avec l'interface
interactive. Il ne gagne donc pas le filtre, mais **une colonne « Chantier »**, à côté de
Terme, Discipline, Statut et Suggestion. Sans elle, un visiteur sans JavaScript ne
verrait nulle part qu'un chantier existe — alors que c'est précisément le lecteur à qui
l'on ne peut rien expliquer autrement qu'en l'écrivant.

### 5.4 Pas de page d'index

Les chantiers se découvrent par les fiches et par le filtre du catalogue. Une page
`/chantiers` listant deux entrées donnerait l'impression d'une section abandonnée, et la
page d'accueil — que la v1 a explicitement laissée à plus tard — sera l'endroit naturel
quand elle sera pensée.

### 5.5 Plan de site

Les pages de chantier entrent dans `sitemap.xml`, avec leur date `modifie`, au même titre
que les fiches.

## 6. Validation et cohérence

Le projet distingue déjà deux niveaux, et les chantiers s'y rangent sans exception : ce
qui rend le site faux casse le build ; ce qui relève du jugement éditorial avertit.

### 6.1 Ce qui casse le build

| Erreur | Pourquoi elle est fatale |
|---|---|
| Une fiche désigne un chantier qui n'existe pas | Le bandeau renverrait vers une page absente. |
| Une fiche désigne un chantier d'une autre discipline | La hiérarchie du §4.2 ne tient plus, et le classement devient un mensonge. |
| Le fichier d'un chantier ne respecte pas son schéma | Même règle que les fiches. |

Supprimer ou renommer un chantier fait donc échouer la construction tant que ses fiches
n'ont pas été corrigées. C'est voulu : c'est le même filet que pour les disciplines et
les types de confusion, et il est **invisible à la relecture humaine** une fois le corpus
grand.

### 6.2 Ce qui avertit

`npm run lint:content`, qui n'arrête rien :

| Avertissement | Raison |
|---|---|
| Un chantier sans aucune fiche | Un document que rien ne désigne ; probablement un `chantier:` oublié. |
| Un chantier avec une seule fiche | Le mot suppose un corpus. Une seule fiche veut dire que le chantier n'existe pas encore vraiment. |
| Un chantier dont le texte n'a pas de section « risques » | Même exigence que les fiches, que le manifeste impose. Une réforme d'ensemble en a plus besoin qu'un mot isolé. |

## 7. Ce qui ne bouge pas

Énuméré explicitement, parce qu'un ajout de contenu est l'occasion classique d'élargir
sans le dire :

- **La carte.** Aucun nœud, aucune enveloppe, aucune couleur de plus.
- **Le vote.** On ne vote pas sur un chantier. Le vote reste attaché au mot, la route
  `/api/votes` ne change pas, la table ne change pas, la note de vie privée ne change
  pas.
- **Les fiches sans chantier.** Aucune page existante ne doit changer d'apparence pour
  une fiche non rattachée.
- **La génération au build.** `/chantiers/<slug>` est statique ; `/api/votes` reste la
  seule route rendue à la demande, ce que `npm run verifier:statique` continue de
  vérifier.

## 8. Tests

Ce que la suite doit prouver, au-delà du rendu :

- une fiche sans `chantier` s'affiche exactement comme avant, sans bandeau ;
- une fiche rattachée affiche le bandeau **avant** le corps — la position est une
  exigence, pas une préférence, donc elle est vérifiée ;
- un `chantier` inexistant et un chantier d'une autre discipline **font échouer** le
  chargement du corpus, chacun avec son propre message ;
- la page d'un chantier liste toutes ses fiches, et elles seules ;
- les trois avertissements de cohérence tombent sur les cas qu'ils décrivent, et pas sur
  un corpus sain ;
- le filtre « chantier » filtre réellement, et se relit depuis l'URL comme les autres ;
- le contenu de secours montre la colonne « Chantier », y compris pour une fiche qui n'en
  a pas, où la case reste vide plutôt que d'afficher un tiret ou un espace vide ambigu ;
- le plan de site contient les pages de chantier.

Chaque test doit pouvoir échouer : la méthode retenue dans ce projet est le sabotage —
neutraliser la ligne que le test prétend couvrir et vérifier qu'il tombe.

## 9. Décisions actées

| Décision | Raison |
|---|---|
| Un troisième type de contenu, pas une catégorie | Une catégorie classe, un chantier argumente. |
| Une fiche appartient à un chantier au plus | La hiérarchie discipline → chantier → fiches se montre et se vérifie sans ambiguïté. |
| Un chantier relève d'une seule discipline | Un chantier à cheval rendrait le filtrage et le classement arbitraires. |
| Le rattachement s'écrit dans la fiche | C'est déjà là que vivent `discipline` et `confusion` : une seule convention. |
| Pas de statut sur un chantier | Deux vocabulaires de statut à tenir cohérents, pour une question sans réponse évidente. |
| Bandeau en haut de la fiche | L'avertissement doit précéder les suggestions, sinon il ne sert à rien. |
| Rien sur la carte | Le gain cherché est la compréhension, pas le dessin. Réversible. |
| Pas de page d'index | Deux entrées donneraient l'air d'une section abandonnée. |
| Chantier inexistant ou mal apparié : erreur de build | Invisible à la relecture, fatal au sens. |
| Chantier vide ou à une seule fiche : avertissement | Relève du jugement éditorial, pas de la justesse. |
| Le vote ne change pas | Le mot reste l'unité sur laquelle un lecteur a un avis. |
| Une colonne, pas un filtre, dans le contenu de secours | Ce composant n'a jamais filtré : il montre tout. Lui ajouter un filtre inopérant serait pire que rien. |
