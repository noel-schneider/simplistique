# Votes — conception

Date : 2026-10-03
Statut : validé en brainstorming, prêt pour le plan d'implémentation
Complète : `docs/superpowers/specs/2026-10-03-simplistique-design.md` (la v1)

Cette spec **remplace le §2 de la v1** sur un point : la v1 excluait explicitement les
votes, au motif que « le coût (authentification, anti-spam, modération) précéderait la
communauté ». Le périmètre retenu ici évite ce coût — pas de comptes, pas de texte
soumis par des visiteurs, donc rien à modérer.

Elle réalise en revanche ce que le §11 de la v1 avait préparé : « une base s'ajoutera à
côté des fichiers sans réécrire l'affichage ».

## 1. Intention

Afficher, sur la page d'une fiche, combien de lecteurs partagent le problème qu'elle
décrit, et laquelle de ses alternatives ils préfèrent.

Le vote est **purement indicatif**. Il ne reclasse rien, ne change aucun statut, ne
promeut aucune alternative, et ne modifie aucun fichier du corpus. Il informe l'auteur
quand il décidera d'amender une fiche. C'est une conséquence directe du manifeste : « la
simplistique suggère des usages, elle n'impose pas de changements. »

La réussite n'est pas un volume de votes. C'est que l'auteur puisse regarder une fiche
dans six mois et savoir ce que ses lecteurs en pensaient.

## 2. Ce que mesure un vote

Deux questions distinctes, posées explicitement à l'écran. C'est le cœur de la
conception : un compteur sans question énoncée produit des chiffres que personne ne sait
interpréter plus tard.

**Sur la fiche — « Ce terme vous a-t-il gêné ? »**
Mesure la **réalité de la confusion**, pas la qualité de l'analyse. Cette question vaut
pour les trois statuts, et c'est voulu : une fiche `rejete`, dont la conclusion est de ne
rien changer, peut récolter beaucoup de « oui, ça m'a trompé ». L'information est
précieuse — elle dit que le problème est réel même quand le remède coûte trop cher.

**Sur chaque alternative — « laquelle préférez-vous ? »**
Mesure l'**adhésion à un remède** précis.

La symétrie est le résultat recherché : le vote de fiche mesure le mal, le vote
d'alternative mesure l'adhésion au remède.

## 3. Hors périmètre

| Écarté | Raison |
|---|---|
| Comptes, authentification | Le vote est anonyme. Demander un compte pour un signal qui n'arbitre rien est disproportionné. |
| Proposer une alternative depuis le site | Du texte libre écrit par des inconnus demanderait modération et anti-spam. Les propositions continuent de passer par une issue ou une *pull request* GitHub. |
| Voter sur un terme sans fiche | C'est une file de demandes, un autre sous-système (soumission de texte libre, donc modération). Le manifeste l'évoque ; ce n'est pas cette spec. |
| Classer le catalogue par votes | Classer, c'est arbitrer — précisément ce que le caractère indicatif du vote exclut. Le catalogue garde son tri alphabétique et ses filtres. |
| Afficher les compteurs dans le catalogue | Il faudrait charger les compteurs de tout le corpus pour une page qui n'en a pas besoin, et créer une dépendance réseau là où il n'y en a aucune. |
| Changer le statut d'une fiche au-delà d'un seuil | Le statut est une conclusion d'analyse, pas un résultat d'élection. |

## 4. Modèle de données

Une seule table.

```sql
CREATE TABLE votes (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fiche       text        NOT NULL,
  alternative text,                              -- NULL = vote sur la fiche
  votant      text        NOT NULL,
  cree_le     timestamptz NOT NULL DEFAULT now(),

  -- NULLS NOT DISTINCT est indispensable : sans lui, les votes de fiche
  -- (alternative NULL) ne se bloqueraient pas entre eux, puisqu'en SQL
  -- NULL n'est jamais égal à NULL. On pourrait voter mille fois sur une
  -- fiche sans que la contrainte proteste.
  CONSTRAINT vote_unique UNIQUE NULLS NOT DISTINCT (fiche, alternative, votant)
);

CREATE INDEX votes_par_fiche ON votes (fiche);
CREATE INDEX votes_par_votant_date ON votes (votant, cree_le);
```

`NULLS NOT DISTINCT` exige PostgreSQL 15 ou plus ; Neon sert 16 ou 17.

### 4.1 `alternative` est une empreinte de texte, jamais un index

La v1 envisageait d'attacher un vote à `(slug, index de la suggestion)`. **C'est
fragile** : cet index est une position dans un tableau édité à la main. Inverser deux
alternatives ou en insérer une au début ferait pointer tous les votes existants ailleurs,
sans que rien ne le signale — les compteurs resteraient plausibles, simplement faux.

`alternative` contient donc une empreinte du texte :

```ts
empreinteAlternative(texte) = sha256(normaliser(texte)).slice(0, 16)
```

`normaliser` est la fonction existante de `lib/filtrage.ts` : minuscules, accents
retirés, espaces réduits. Réutiliser la même normalisation que la recherche évite une
seconde définition de « le même texte ».

Conséquences, toutes deux voulues :
- **réordonner les alternatives d'une fiche préserve les votes** ;
- **corriger le texte d'une alternative remet son compteur à zéro**, parce qu'une
  alternative reformulée n'est plus tout à fait la même proposition.

La table ne conserve **pas** le texte lisible de l'alternative à côté de son empreinte :
ce serait une copie qui divergerait du corpus à la première correction. Le texte se
retrouve en recoupant l'empreinte avec le corpus, seule source de vérité.

### 4.2 Lignes orphelines

Supprimer une fiche ou une alternative laisse des lignes que plus rien ne lit. Elles sont
inoffensives et ne sont jamais affichées — les compteurs sont calculés à partir du corpus,
pas de la table. `npm run lint:content` signalera leur existence en avertissement, pour
que l'auteur sache qu'elles sont là.

## 5. Architecture

### 5.1 La base n'existe pas au build

Les **douze routes existantes** restent pré-générées exactement comme aujourd'hui,
`dynamicParams = false` compris. Aucune page ne lit la base, ni au build ni au rendu. Les
routes d'API ajoutées ci-dessous sont dynamiques par nature — ce sont les seules.

```
content/*.md ──► lib/content ──► pages statiques (inchangé)

base Postgres ──► lib/votes ──► /api/votes ──► composant client ──► page de fiche
```

`lib/votes` est le seul module qui connaît la base. `lib/content` continue de ne connaître
que le markdown. Les deux ne se parlent pas.

### 5.2 Les routes d’API

**`GET /api/votes?fiche=<slug>`**

```json
{
  "fiche": 12,
  "alternatives": { "a1b2c3d4e5f6a7b8": 7, "0f1e2d3c4b5a6978": 3 },
  "miens": { "fiche": true, "alternatives": ["a1b2c3d4e5f6a7b8"] }
}
```

`miens` dit ce que **ce visiteur** a déjà voté. Le serveur calcule son empreinte à la
lecture comme à l'écriture, donc il le sait sans que le navigateur ait à s'en souvenir.
Conséquence : **aucun identifiant n'est stocké dans le navigateur**, et l'affichage reste
juste même après un vidage de cache ou depuis un autre onglet.

Cette réponse est propre à chaque visiteur : elle ne doit jamais être mise en cache.

**`POST /api/votes`** — corps `{ "fiche": "<slug>", "alternative": "<empreinte>" | null }`

Réponses : `200` avec les compteurs à jour, `400` requête mal formée, `404` fiche ou
alternative inconnue du corpus, `409` déjà voté, `429` trop de votes, `503` base
indisponible.

**`DELETE /api/votes`** — même corps. Annule son propre vote.

Annuler est inclus parce qu'un clic malheureux sur « ce terme vous a gêné ? » ne doit pas
être définitif. La ligne est adressable par la contrainte d'unicité ; c'est une requête de
plus, pas un sous-système.

### 5.3 Le composant client

Sur la page d'une fiche, un composant client demande les compteurs après l'affichage et
gère les clics. Au clic, le compteur bouge **immédiatement** à l'écran et revient en
arrière si l'envoi échoue : on ne fait pas attendre quelqu'un pour un signal indicatif.

Un `409` n'est pas une erreur à afficher mais un désaccord d'état : le serveur sait que ce
visiteur a déjà voté, le navigateur l'ignorait. L'interface se réaligne silencieusement
sur la réponse du serveur.

### 5.4 Ce qui se passe quand la base est absente

Base en panne, lente, ou variable d'environnement oubliée : **la page de la fiche
s'affiche parfaitement** — analyse, suggestions, statut, tout. Seuls les compteurs
manquent, et le composant n'affiche aucune erreur bruyante : un signal indicatif qui
manque n'est pas un incident pour le lecteur.

C'est la propriété qui a fait écarter l'alternative « page de fiche dynamique » : elle
aurait fait dépendre le contenu de la disponibilité de la base.

Le forfait gratuit de Neon met la base en veille après inactivité, donc la première
requête après un creux prend environ une seconde. Avec des compteurs chargés après
l'affichage, c'est invisible.

## 6. Déduplication, anti-abus, vie privée

### 6.1 Aucune méthode anonyme ne lie un vote à une personne

Elles lient à un appareil, à un réseau ou à un navigateur, et chacune se contourne. C'est
assumé : le vote est indicatif, et le truquer n'apporte rien à personne.

### 6.2 Trois couches

**Rien n'est stocké dans le navigateur.** J'avais d'abord prévu un identifiant en
`localStorage` pour que l'interface se souvienne des votes émis ; la rédaction a montré
qu'il était inutile, puisque le serveur recalcule l'empreinte du visiteur à chaque lecture
et peut donc lui dire ce qu'il a voté. Une pièce en moins, et un affichage qui survit au
vidage de cache.

**L'empreinte du votant** fait la déduplication réelle :

```ts
empreinteVotant = sha256(`${SEL_VOTES}|${ip}|${navigateur}`)
```

où `ip` est la première entrée de l'en-tête `x-forwarded-for` et `navigateur` l'en-tête
`user-agent`.

Le sel est **indispensable** : l'espace IPv4 fait quatre milliards de valeurs, donc un
hachage non salé se casse par force brute en quelques minutes. Sans sel, ce ne serait pas
de l'anonymisation mais un déguisement.

Inclure le navigateur distingue un téléphone d'un ordinateur sur le même wifi, ce qui
réduit beaucoup le sur-blocage.

**La limite de débit** : 30 votes par heure et par empreinte, comptés par une requête sur
`votes_par_votant_date`. Un lecteur curieux qui parcourt tout le corpus en émet une
quinzaine au maximum.

Le vrai risque n'est pas qu'on truque les compteurs, c'est **qu'on remplisse le quota
gratuit** : un script tirant des identifiants au hasard insérerait des milliers de lignes
sans que personne ne regarde jamais les chiffres. La limite de débit protège cela.

### 6.3 Ce que le sur-blocage coûte, et c'est assumé

Deux personnes sur le même réseau avec le même navigateur ne votent qu'une fois. Une
classe qui découvre le site ensemble pèse une voix par type d'appareil.

### 6.4 Vie privée

Une adresse IP, même hachée, reste une donnée personnelle au sens du RGPD.

- **Aucune adresse IP n'est enregistrée**, à aucun moment : seul le haché salé l'est.
- Le sel n'est **jamais** versionné. Il vit en variable d'environnement.
- Changer le sel rend les empreintes existantes inexploitables et réinitialise la
  déduplication. Aucune rotation automatique en v1 ; c'est un geste manuel disponible.
- Le site porte **une phrase honnête** disant ce qui est enregistré, sur `/contribuer` ou
  une page dédiée. Pour un projet dont le sujet est la clarté, l'escamoter serait mal venu.

## 7. Validation des écritures

La route d'écriture **vérifie que ce qu'on lui envoie existe** :

- le slug est une fiche du corpus ;
- l'empreinte correspond à une alternative de **cette** fiche, ou est absente.

Sans cela, n'importe qui insère des lignes arbitraires : des votes pour des fiches
inventées, des alternatives qui n'existent pas. Le corpus étant connu au build, cette
vérification est une comparaison en mémoire, sans requête supplémentaire.

## 8. Tests

**Sans base, en fonctions pures** : l'empreinte d'une alternative (stabilité au
réordonnancement, changement au texte), l'empreinte du votant (sel pris en compte, deux
navigateurs différents donnent deux empreintes), la validation contre le corpus (slug
inconnu, empreinte d'une autre fiche, empreinte absente).

**Sans base, contre un dépôt en mémoire** : la logique des routes — déjà voté, limite de
débit atteinte, annulation, compteurs rendus.

**Avec un vrai PostgreSQL, en intégration** : la contrainte d'unicité. C'est exactement le
comportement qu'un faux dépôt reproduirait de travers — tester la déduplication contre un
dépôt qui dédupe correctement ne teste rien. GitHub Actions fournit un conteneur
PostgreSQL gratuitement sur les dépôts publics.

**Interface** : les compteurs apparaissent après l'affichage ; le clic incrémente
immédiatement ; un échec d'envoi revient en arrière ; le bouton annonce son état ; une
fiche sans alternative n'affiche que le compteur de fiche.

**Interface, accessibilité** : le contrôle est un vrai bouton dont le nom accessible
contient la question ; le changement de compteur est annoncé poliment.

## 9. Déploiement et configuration

Dans cet ordre :

1. **Déployer le projet sur Vercel.** Rien n'est en ligne aujourd'hui.
2. **Provisionner Neon** depuis le marché Vercel, forfait gratuit. La variable de
   connexion est posée automatiquement.
3. **Poser `SEL_VOTES`**, une valeur aléatoire de 32 octets, jamais versionnée.
4. **Lancer la migration** une fois : un fichier SQL et un script `npm run migrer`.

**Pilote** : le pilote serverless de Neon, qui parle en HTTP. Le pilote PostgreSQL
classique épuise les connexions sur des fonctions serverless — chaque invocation en ouvre
une, et elles ne se referment pas assez vite.

**Pas d'ORM.** Il y a trois requêtes dans tout ce système ; une couche d'abstraction
coûterait plus qu'elle ne rendrait.

## 10. Décisions actées

| Décision | Raison |
|---|---|
| Vote indicatif, aucun effet automatique | Le manifeste : suggérer, ne pas imposer. |
| Deux questions explicites à l'écran | Un compteur sans question énoncée est ininterprétable six mois plus tard. |
| Anonyme, sans compte | Un compte pour un signal qui n'arbitre rien est disproportionné. |
| Empreinte de texte, pas index | L'index casse silencieusement au réordonnancement. |
| `IP + navigateur`, haché et salé | Compromis entre sur-blocage et contournement, pour un signal sans enjeu. |
| Annulation possible | Un clic malheureux ne doit pas être définitif. |
| Rien dans le navigateur | Le serveur connaît déjà le visiteur ; un identifiant local serait une pièce de plus, fausse après un vidage de cache. |
| Compteurs chargés après l'affichage | La page ne dépend jamais de la base. |
| Dépôt en mémoire pour les tests, PostgreSQL réel pour la contrainte | Tester la déduplication contre un faux qui dédupe ne teste rien. |
