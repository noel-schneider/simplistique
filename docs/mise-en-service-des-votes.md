# Mettre les votes en service

Tout le code est écrit, testé et relu. Rien n’est provisionné : aucune base n’existe,
aucune variable n’est posée, et les sept tests d’intégration PostgreSQL de la suite sont
ignorés faute de base locale. Cette page est la huitième tâche du plan, celle que je n’ai
pas exécutée parce qu’elle touche à tes comptes.

Elle est écrite dans l’ordre où les choses vont se passer, et chaque étape dit ce qui
casse si on l’oublie.

## Avant toute chose : la panne la plus probable est silencieuse

Si `DATABASE_URL` ou `SEL_VOTES` manque, le site ne montre **aucune** erreur. La route
répond 503, le composant se masque, et le seul symptôme est l’absence du bloc de vote en
bas d’une fiche. C’est voulu — un sondage indicatif qui manque n’est pas un incident pour
un lecteur — mais cela veut dire que tu ne seras averti de rien.

Deux choses aident à diagnostiquer :

```bash
curl -s 'https://<ton-site>/api/votes?fiche=actif-comptabilite' | jq
```

Le corps du 503 porte un champ `cause` : `"configuration"` si une variable manque,
`"base"` si la base ne répond pas. C’est la seule information de diagnostic du système,
et elle ne contient aucune donnée de visiteur.

Et les journaux de la fonction, côté Vercel, portent une ligne par erreur de la forme
`votes: NeonDbError 42P01` — nom de la classe et code SQL, jamais de message. `42P01`
signifie « la table n’existe pas », donc migration oubliée.

## 1. Créer la base

L’intégration Neon de Vercel, depuis le panneau du projet. L’offre gratuite suffit
largement : un vote est une ligne de moins de cent octets.

**Vérifie le nom exact de la variable qu’elle pose.** Le code ne lit que `DATABASE_URL`.
Selon la version, l’intégration pose aussi `POSTGRES_URL`, `DATABASE_URL_UNPOOLED`,
`PGHOST` et d’autres. Si `DATABASE_URL` n’y est pas sous ce nom exact, ajoute-la à la
main : c’est la panne silencieuse décrite plus haut.

## 2. Poser le sel, avant le premier déploiement

```bash
openssl rand -hex 32
```

La valeur va dans `SEL_VOTES`, dans les variables d’environnement du projet Vercel. Elle
ne doit **jamais** être versionnée, ni collée dans une conversation, ni figurer dans un
fichier d’exemple.

Sans elle, rien n’est écrit : `empreinteVotant` refuse de calculer plutôt que de produire
une empreinte faible. Un haché d’adresse IPv4 non salé se casse par force brute en
quelques minutes, et le site enregistrerait alors une donnée personnelle en croyant ne
pas le faire.

Garde à l’esprit ce que cette clé te donne : avec elle **et** un accès à la base, tu peux
confirmer une adresse soupçonnée au prix d’un seul calcul. C’est la nuance que la
décision 6 de `decisions-en-attente.md` te propose d’ajouter à la note de vie privée.

## 3. Migrer

```bash
vercel env pull .env.local     # récupère DATABASE_URL
npm run migrer
```

La commande lit `.env.local` s’il existe, ou prend la variable sur la même ligne :
`DATABASE_URL='...' npm run migrer`.

**Ne colle pas la chaîne de connexion avec ses guillemets** : elle ne serait pas
analysable comme URL. La commande échouerait proprement, mais c’est une minute perdue.

Elle est sans danger à relancer : les trois instructions sont des `IF NOT EXISTS` dans
une transaction. Elle vérifie en plus que la contrainte `vote_unique` existe bien, parce
qu’une table antérieure sans cette contrainte laisserait voter mille fois sur une fiche.

## 4. Déployer

Dans cet ordre — base, sel, migration, déploiement. L’ordre inverse fonctionne aussi
puisque le site s’affiche parfaitement sans base, mais un déploiement avant la migration
donne des 503 invisibles jusqu’à ce que tu regardes une fiche.

## 5. Le premier jour, éprouve une chose que personne n’a pu vérifier

Le votant est calculé à partir de `x-real-ip`, que Vercel pose lui-même, avec repli sur
`x-forwarded-for` pour le développement local. **Si l’hébergeur ajoutait le vrai client à
un `x-forwarded-for` fourni par l’appelant au lieu de le remplacer**, la première entrée
serait choisie par l’attaquant : déduplication et limite de débit contournées.

Deux requêtes suffisent à le savoir :

```bash
curl -s -H 'x-forwarded-for: 1.2.3.4' 'https://<ton-site>/api/votes?fiche=actif-comptabilite'
curl -s -H 'x-forwarded-for: 5.6.7.8' 'https://<ton-site>/api/votes?fiche=actif-comptabilite'
```

Si le champ `miens` diffère entre les deux, l’en-tête est forgeable et il faut retirer le
repli. S’il est identique, la garantie tient. C’est la seule dépendance du projet à son
hébergeur, et elle est signalée en commentaire dans `app/api/votes/route.ts`.

## 6. Un contrôle de fumée qui ne coûte rien

```bash
DATABASE_URL='...' npm run votes:orphelins
```

Il répond « Aucun vote orphelin » si et seulement si la base répond et la table existe.
C’est le seul test de bout en bout disponible, et il ne touche à rien.

## Ce que tu ne pourras pas faire

Trois choses, détaillées dans la décision 7 de `decisions-en-attente.md` :

- **réparer une ligne orpheline.** Reformuler le texte d’une alternative change son
  empreinte : les anciens votes restent en base et ne s’affichent plus.
  `npm run votes:orphelins` te les signale, rien ne les corrige.
- **sortir proprement d’une rotation de sel.** Les anciennes lignes comptent toujours,
  mais leurs auteurs ne les reconnaissent plus et peuvent revoter.
- **savoir que c’est cassé.** Aucune alerte. Les journaux disent quoi, quand tu regardes.

Aucune des trois n’est urgente avec cinq fiches, et une requête depuis la console Neon
fait le travail. Mais ce ne sont pas des surprises : c’est écrit ici avant que ça arrive.
