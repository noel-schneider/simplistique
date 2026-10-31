# Contribuer

Le corpus est ouvert, et il n’y a pas de comptes sur ce site. Un mot qui induit en
erreur se signale en deux minutes depuis [la page Proposer](/proposer) ; une fiche
complète passe par le dépôt, où la discussion reste publique et tracée. Le vote, lui,
se fait anonymement depuis chaque fiche (voir « Ce que ce site enregistre »,
plus bas).

## Proposer un terme en deux minutes

Tout se passe sur [la page Proposer](/proposer) : le terme, une phrase ou deux sur le
malentendu, et c’est tout. La suggestion de remplacement et la discipline
sont facultatives. Pas de compte, pas de GitHub. Une proposition n’est pas une
fiche : elle est lue, puis éventuellement instruite pour en devenir une.

## Proposer une analyse complète

Ouvrir une *issue* ou une *pull request* sur
[github.com/noel-schneider/simplistique](https://github.com/noel-schneider/simplistique).
Une pull request
obtient automatiquement une adresse de prévisualisation : la fiche se voit
rendue avant d’être intégrée.

## Ce qu’une proposition doit contenir

Les règles de suggestion du manifeste, appliquées :

1. **Le terme visé** — le mot, le concept ou le groupe de mots concerné, et la
   discipline.
2. **Pourquoi c’est confus** — en quoi le mot actuel induit en erreur. Dire
   « c’est compliqué » ne suffit pas : montrer le malentendu qu’il produit.
3. **La suggestion, s’il y en a une** — une ou plusieurs formulations. Pointer
   un terme sans proposer d’alternative est une contribution complète : il n’y
   a pas toujours de meilleur mot.
4. **Les risques** — ce que le changement coûterait, qui l’emploie déjà, ce
   qu’on casse. Une proposition sans risques identifiés est incomplète.
5. **D’où vient la réflexion** — une autre langue, une autre discipline, un
   témoignage d’enseignement.

## Ce que la vérification automatique attend

Une pull request qui ajoute ou modifie une fiche passe par une intégration
continue qui vérifie, sans discussion possible :

- Le nom de fichier : `content/fiches/<terme>-<discipline>.md`, en minuscules,
  sans accent.
- Les champs du front-matter. Requis : `terme`, `discipline`, `confusion`,
  `statut`, `preuve`, `resume`, `suggestions`, `cree`, `modifie`. Facultatifs :
  `chantier`, `motifs`, `sources`, `precedents` et `accroche`.
- `preuve` : le niveau d’appui de l’analyse, parmi trois valeurs.
  `intuition` : l’analyse vient de l’auteur de la fiche. `documentee` : un
  spécialiste de la discipline a écrit que ce nom pose problème. `mesuree` :
  une enquête ou une expérience chiffre la confusion.
- `sources` : une liste de références, chacune avec `auteur`, `annee` (entier,
  1500 ou plus), `titre` et/ou `objet` (au moins l’un des deux), `lecture` et,
  si possible, `url` (adresse http ou https, facultative). `titre` ne sert qu’au
  titre réel d’un ouvrage ; quand le titre exact n’est pas connu, la référence se
  décrit dans `objet` — un titre ne s’invente jamais. `lecture` vaut `originale` si la
  source elle-même a été lue, ou `seconde-main` si elle n’est connue que par un autre
  texte ; le site affiche
  cette mention au lecteur. Une fiche `documentee` ou `mesuree` sans aucune
  source provoque un avertissement.
- `precedents` : une liste de renommages déjà adoptés ailleurs, chacun avec
  `lieu`, `annee` (mêmes bornes que pour une source) et `description`. Le site
  les affiche dans un encadré « Déjà fait ailleurs » avant le texte. Seul
  ce que la fiche dit déjà y figure.
- `resume` : 240 caractères maximum.
- `accroche`, s’il est présent : 140 caractères maximum, une phrase factuelle tirée
  du texte de la fiche.
- `discipline` et `confusion` : doivent exister dans `content/taxonomies/`.
- `chantier`, s’il est présent : doit désigner un fichier existant de
  `content/chantiers/`, et ce chantier doit relever de la même discipline que
  la fiche. Les deux manquements font échouer la construction du site.
- `motifs`, s’il est présent : une liste de slugs, chacun désignant un fichier
  existant de `content/motifs/`, sans répétition. Un slug inconnu ou répété fait
  échouer la construction du site.
- Aucun champ inconnu : une clé mal orthographiée fait échouer la construction
  plutôt que d’être ignorée en silence.

La commande `npm run lint:content` reproduit cette vérification en local,
avant d’ouvrir la pull request.

## Proposer un chantier

Certains mots ne se renomment pas seuls. « Actif » et « passif » n’opposent rien de
clair, et corriger l’un sans l’autre déplacerait la confusion au lieu de la lever. Un
**chantier** est le document qui porte la réforme d’ensemble d’un corpus de mots, et
que chaque fiche concernée désigne par son champ `chantier`.

Une catégorie classe ; un chantier argumente. Deux fiches peuvent partager un type de
confusion sans que leurs réformes aient le moindre rapport — c’est quand elles doivent
bouger ensemble qu’un chantier a lieu d’être.

Un chantier est un fichier `content/chantiers/<slug>.md`, dont le nom de fichier fait le
slug. Son front-matter porte `nom`, `discipline`, `resume` (240 caractères maximum),
`cree` et `modifie`. Il n’a pas de statut : celui d’une réforme se lit dans ses fiches.
Son corps suit le même plan qu’une fiche, section « Risques » comprise.

`npm run lint:content` signale un chantier que plus aucune fiche ne désigne, un chantier
qui n’en a qu’une — le mot suppose un corpus — et un chantier dont le texte n’identifie
aucun risque.

## Proposer un motif

Certains pièges reviennent d’une discipline à l’autre : « positif » et « négatif » qui
comptent au lieu de juger, « normal » qui glisse de fréquent à souhaitable. Un
**motif** est le document qui nomme ce piège commun, et que chaque fiche concernée
désigne par son champ `motifs`.

La différence avec un chantier : un chantier réunit des fiches d’**une** discipline qui
doivent bouger ensemble ; un motif relie des fiches de disciplines **différentes** qui
partagent un piège, sans que leurs renommages dépendent les uns des autres.

Un motif est un fichier `content/motifs/<slug>.md`, dont le nom de fichier fait le slug.
Son front-matter porte `nom`, `resume` (240 caractères maximum), `cree` et `modifie`.
Son corps suit trois sections : « Le piège », « Où on le retrouve », « Ce qu’on peut en
tirer ». Il ne dit que ce que les fiches reliées disent déjà.

`npm run lint:content` signale un motif relié à moins de deux fiches, et un motif dont
toutes les fiches relèvent d’une seule discipline — c’est alors un chantier.

## Ce qui sera probablement refusé

- Une suggestion sans risques identifiés.
- Un néologisme là où un mot français existant ferait l’affaire.
- Un renommage qui ferme la porte à de futurs concepts — par exemple appeler
  deux sous-concepts « le premier » et « le dernier » alors qu’un troisième
  pourrait apparaître.
- Un changement dont le coût dépasse visiblement le gain de clarté. Garder un
  mot imparfait est souvent la bonne réponse, et une analyse qui conclut en ce
  sens a toute sa place : elle est classée « rejeté ».

## Rappel d’intention

La simplistique suggère des usages, elle n’impose pas de changements. Le but
est d’abaisser la barrière à l’entrée des disciplines et de bâtir des ponts
entre elles — pas de corriger la langue de ceux qui les pratiquent.

## Ce que ce site enregistre

Le vote sur une fiche et sur ses alternatives se fait sans compte. Pour qu’une même
personne ne vote pas deux fois, le serveur calcule une empreinte à partir de l’adresse
réseau et du navigateur.

**L’adresse réseau n’est jamais enregistrée par ce site.** Seule cette empreinte l’est.
Elle est calculée avec une clé secrète qui ne quitte pas le serveur : sans cette clé, elle
ne remonte pas à l’adresse. Elle ne permet ni de recontacter quelqu’un, ni de savoir ce
qu’il a lu — seulement ce qu’il a voté.

Rien n’est stocké dans le navigateur : aucun cookie, aucun traceur publicitaire. Les
visites sont comptées par un outil de mesure d’audience hébergé par l’auteur du site
(Umami), qui ne pose pas de cookie.

Un vote peut être annulé depuis la fiche où il a été émis, à condition d’y revenir
avec le même navigateur et la même connexion : l’empreinte change avec eux, et le site
n’a aucun autre moyen de reconnaître l’auteur du vote. Une mise à jour du
navigateur suffit à la changer aussi — c’est son numéro de version exact qui entre dans
le calcul, pas son nom.

Une proposition envoyée depuis [la page Proposer](/proposer) enregistre le texte
saisi, la date, et la même sorte d’empreinte non réversible, qui ne sert qu’à limiter
les envois à cinq par heure. L’adresse réseau n’est pas enregistrée. Aucune autre
donnée personnelle n’est demandée.
