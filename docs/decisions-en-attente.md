# Sept décisions en attente

Cinq questions se sont posées pendant la construction de la v1, et deux de plus pendant
celle du système de vote. Elles ne sont pas
des défauts : ce sont des choix de conception qui t'appartiennent, et je les ai
laissées ouvertes plutôt que de les trancher à ta place.

Pour chacune : ce qui se passe aujourd'hui, les options, leur coût réel, et ce que
je recommande — avec l'argument contraire, pour que tu puisses me contredire sur
des bases complètes.

---

## 1. Faut-il renommer `getFiches` et ses voisins en français ?

### Ce qui se passe aujourd'hui

La contrainte globale du projet dit : « le code (noms de fonctions, de variables,
de fichiers) est en français ». Elle est respectée presque partout —
`chargerTaxonomies`, `rendreMarkdown`, `listerTitres`, `verifierCoherence`,
`filtrerFiches`, `analyserCriteres`, `ecrireCriteres`, `trierFiches`,
`normaliser`, `retirerCrochets`, `vueParDefaut`, `styleStatut`.

Quatre fonctions y échappent, toutes dans `lib/content/fiches.ts` :
`getFiches`, `getFiche`, `getIndex`, `getDocument`.

**Et c'est ma faute, pas celle de l'implémentation.** La spec §6.1 les prescrit
littéralement, nom par nom, tout en portant la contrainte « en français » trois
paragraphes plus haut. Le code a obéi à la spec. Le quatrième, `getDocument`, n'est
même pas dans la spec : il a été inventé par mimétisme des trois autres — c'est
exactement ainsi qu'une incohérence se propage.

### Les options

**A. Renommer les quatre en français.** `listerFiches`, `lireFiche`,
`construireIndex`, `lireDocument`. Attention, `lireFiche` existe déjà comme
fonction privée dans le même fichier : il faudrait la renommer aussi, par exemple
en `lireFichier`.
*Coût : une passe mécanique sur une douzaine de fichiers, intégralement couverte
par les 151 tests. Une demi-heure, sans risque réel.*

**B. Les garder et corriger la spec**, en y écrivant que `get` est un préfixe
technique admis au même titre que les conventions de Next.
*Coût : deux lignes de spec.*

**C. Ne renommer que `getDocument`**, le seul que la spec n'a jamais demandé.
*Coût : trois fichiers.*

### Ce que je recommande : A

Pas par purisme, mais à cause de ce qu'est ce projet. La simplistique soutient
que **le nom d'une chose compte**, qu'un terme mal choisi coûte à ceux qui
l'héritent. Un site qui défend cette thèse et garde quatre noms anglais « parce
que renommer est fastidieux » s'expose à l'objection la plus facile du monde.

L'argument contraire, qui est sérieux : `get` est une convention quasi
universelle en JavaScript, les bases de code bilingues sont la norme, et la
cohérence interne compte peut-être plus que la cohérence linguistique. Si tu
considères `get` comme de la ponctuation technique plutôt que comme un mot,
l'option B est parfaitement défendable — et elle a l'avantage de rendre la spec
honnête, ce qui est le minimum dans tous les cas.

**Ce qu'il ne faut pas faire : rien.** En l'état, la spec se contredit, et c'est
ce qui a produit l'incohérence.

---

## 2. Les trois titres de niveau 1 de ton manifeste

### Ce qui se passe aujourd'hui

`content/manifeste.md` porte trois titres de niveau 1 : « Qu'est-ce que la
simplistique ? », « Ce que la simplistique n'est pas », « Comment ». C'est une
structure naturelle pour un document ; mais rendue telle quelle dans une page web,
elle produit **trois titres de premier niveau sur une même page**, dont aucun ne
correspond au titre de l'onglet (« Manifeste — Simplistique »).

Pour un lecteur voyant, aucune conséquence. Pour un lecteur d'écran qui navigue de
titre en titre pour se repérer, le plan de la page est faux : il y a trois racines
là où il devrait y en avoir une.

### Les options

**A. Modifier ton markdown** : passer les trois `#` en `##`.
*Coût : trois caractères. Mais ça modifie ton document, et ta structure devient
dépendante d'une contrainte d'affichage.*

**B. Décaler les niveaux au rendu.** La page fournit son propre `<h1>`
(« Manifeste »), et la chaîne de rendu abaisse d'un cran tous les titres du
document : tes `#` deviennent des `<h2>`, tes `##` des `<h3>`. **Ton fichier n'est
pas touché.**
*Coût : une vingtaine de lignes dans la chaîne markdown, plus ses tests.*

**C. Ne rien faire.**
*Coût : zéro, et un plan de page faux pour les lecteurs d'écran.*

### Ce que je recommande : B

Parce qu'elle respecte un principe qu'on a tenu depuis le début : **ton texte ne
bouge pas.** Les cinq fiches, le manifeste et la page « contribuer » ont été
recopiés octet pour octet depuis tes annexes, phrases inachevées comprises, et
j'ai refusé plusieurs fois de « corriger » ton écriture. Un décalage au rendu
place la contrainte technique du côté technique, là où elle appartient.

Un détail à trancher avec elle : `content/contribuer.md` commence par
`# Contribuer`, qui deviendrait un `<h2>` sous un `<h1>Contribuer` — le mot
apparaîtrait deux fois. Le plus simple est de retirer cette première ligne de
`contribuer.md`, un fichier que j'ai écrit et dont tu peux disposer librement.

---

## 3. Ton manifeste décrit les cinq types de confusion, et le code aussi

### Ce qui se passe aujourd'hui

`content/manifeste.md` décrit les cinq types de confusion en prose. Et
`content/taxonomies/confusions.yml` les décrit à nouveau, pour le système — dans
un ordre déjà différent : ton manifeste commence par la polysémie, le fichier par
le faux ami.

Le jour où tu ajoutes un sixième type au fichier, ton manifeste devient périmé en
silence. Rien ne le signalera, et c'est exactement le genre de décalage qui ne se
voit qu'après des mois.

### Les options

**A. Ne rien faire.** Un manifeste est un texte, pas une documentation générée. Il
dit l'intention ; le fichier YAML fait tourner le système. Qu'ils divergent est
peut-être normal.

**B. Détecter le décalage.** `npm run lint:content` avertit quand un type présent
dans le fichier YAML n'est mentionné nulle part dans le manifeste. Ton texte n'est
pas touché ; tu es simplement prévenu le jour où il prend du retard.
*Coût : une quinzaine de lignes, dans le script qui fait déjà ce genre de
vérification.*

**C. Générer la section du manifeste depuis le fichier YAML.**
*Coût : faible techniquement, mais ton manifeste cesserait d'être un texte que tu
écris. Je ne le recommande pas.*

**D. Lier les types depuis ta prose** vers le catalogue filtré
(`/fiches?confusion=polysemie-externe`), ce qui rendrait ton manifeste navigable.
*Coût : faible, mais c'est une modification éditoriale de ton texte — donc ta
décision, et elle est indépendante des trois autres.*

### Ce que je recommande : A plus B

Garder ta prose comme l'énoncé de l'intention, et ajouter le détecteur de
décalage. Tu gardes la main sur le texte, et la machine te prévient quand il
s'éloigne du système au lieu de te laisser le découvrir par hasard.

L'option D est séduisante — un manifeste dont chaque type de confusion mène aux
analyses correspondantes, c'est très exactement la transdisciplinarité que tu
décris, rendue cliquable. Mais elle touche ton écriture, donc elle t'appartient
entièrement, et elle peut attendre.

---

---

## 4. Une de mes contraintes est trop absolue pour le code qu'elle régit

### Ce qui se passe aujourd'hui

Le plan porte cette contrainte :

> Aucun slug de discipline ni de type de confusion n'est codé en dur hors de
> `content/taxonomies/*.yml`. Les trois statuts font exception : ils vivent dans le
> type `Statut`, la constante `STATUTS` et les tables exhaustives de la forme
> `Record<Statut, …>`, **et nulle part ailleurs**.

Les trois derniers mots sont faux, et ils l'étaient dès l'écriture. `scripts/coherence.ts`
nomme `pointe` et `propose` dans des conditions ordinaires, parce que ses règles
*portent sur le sens de ces statuts* :

- un statut `pointe` accompagné de suggestions est une fiche qui se contredit ;
- un statut `propose` sans aucune suggestion aussi.

Ce code a toutes les raisons d'exister — c'est le garde-fou éditorial du projet, celui
qui vérifie que tes fiches ne se contredisent pas elles-mêmes. Mais il viole la lettre
de ma contrainte.

### Les options

**A. Reformuler la contrainte.** Autoriser explicitement de nommer un statut là où
le statut *est le sujet* de la logique, et interdire ailleurs (affichage, filtrage,
routage).
*Coût : deux lignes de plan.*

**B. Refondre `coherence.ts`** pour exprimer ses règles dans une table indexée par
statut plutôt que par des conditions.
*Coût : une réécriture pour deux règles. Je ne le recommande pas — ce serait
contorsionner du code lisible pour satisfaire une formule.*

**C. Ne rien faire**, et garder une contrainte que le code enfreint légitimement.

### Ce que je recommande : A

L'intention de la contrainte était d'empêcher la *connaissance de la taxonomie* de
fuir dans du code qui n'a pas à la connaître : un composant d'affichage, un filtre,
une route. Les règles de cohérence, elles, n'ont pas d'autre objet que le sens des
statuts. La contrainte visait juste, elle a simplement été écrite trop large.

---

## 5. Un champ obligatoire que personne ne voit jamais

### Ce qui se passe aujourd'hui

La spec §3.4 exige un champ `description` sur **chaque** entrée de taxonomie —
chaque discipline, chaque type de confusion, chaque statut. Ces descriptions
existent, elles sont écrites, elles sont validées au build… et **aucune page ne les
affiche**. Elles ne servent à rien aujourd'hui.

Et ce sont de bons textes. Par exemple, pour le faux ami courant : « un mot du
langage ordinaire dont le sens technique n'a aucun rapport avec le sens commun. Le
lecteur croit comprendre, et c'est pire que de ne pas comprendre. » C'est exactement
ce qu'un visiteur a besoin de lire pour comprendre la taxonomie — et il ne le lira
jamais.

Il y a là une petite ironie : un projet dont la thèse est que les obligations inertes
coûtent à ceux qui les héritent impose un champ obligatoire sans consommateur.

### Les options

**A. Les afficher.** Les descriptions des cinq types de confusion et des trois
statuts forment un glossaire naturel. Trois emplacements possibles :
- sur `/fiches`, dans un bloc dépliable « que veulent dire ces catégories ? » au-dessus
  des filtres — là où la question se pose vraiment ;
- sur `/contribuer`, où un contributeur doit justement choisir un type de confusion ;
- dans la légende de la carte, qui explique déjà l'encodage des statuts.
*Coût : une quinzaine de lignes pour le premier, moins pour les autres.*

Un avertissement : ne les mets **pas** uniquement dans un attribut de survol. Sur un
téléphone, le survol n'existe pas, et ces textes deviendraient invisibles pour la
moitié de tes visiteurs.

**B. Rendre le champ optionnel** dans le schéma, et accepter que ces descriptions
soient des notes internes.
*Coût : un caractère dans le schéma.*

**C. Ne rien faire**, et garder l'obligation sans emploi.

### Ce que je recommande : A, sur `/fiches`

C'est l'endroit où un visiteur rencontre les catégories pour la première fois, et où
il se demande ce que « paire bancale » veut dire. Le bloc dépliable évite d'alourdir
la page pour qui connaît déjà.

Si tu ne veux pas de ce travail maintenant, prends B plutôt que C : une obligation
sans raison finit toujours par être remplie à la va-vite, et la première description
bâclée vaudra moins que pas de description du tout.

---

## 6. Ta note de vie privée dit vrai, mais pas tout

### Ce qui se passe aujourd'hui

La page « contribuer » promet que ton site n'enregistre jamais une adresse, seulement
son empreinte salée. C'est exact, et la relecture l'a vérifié ligne à ligne : aucune
colonne d'adresse dans la table, aucune requête qui en lise une, aucun journal,
aucun cookie.

Deux choses que la note ne dit pas, et que je ne veux pas trancher à ta place parce
qu'elles touchent ta voix, pas le code :

**Qui a accès à la base peut relier tes votants à eux-mêmes.** L'index
`votes_par_votant_date` permet de regrouper toutes les lignes d'une même empreinte :
on obtient la liste horodatée des fiches sur lesquelles cette personne a voté. Ce
n'est pas un historique de lecture — rien n'est écrit quand on lit une fiche — mais
c'est une corrélation entre votes que la note ne mentionne pas.

**Et qui détient à la fois la base et `SEL_VOTES` peut confirmer une adresse soupçonnée**
au prix d'un seul calcul. Ces deux-là vivent côte à côte dans ton panneau Vercel, donc
cette personne, c'est toi. « Irréversible » est vrai contre une fuite de la base seule,
pas contre son propriétaire. La note le laisse déjà entendre — « une clé secrète qui
ne quitte pas le serveur » — mais ne le dit pas franchement.

### Les options

**A. Ajouter deux phrases.** Par exemple, après le paragraphe sur l'empreinte : « Les
votes d'une même empreinte peuvent être reliés entre eux par qui administre la base.
L'empreinte ne remonte à une adresse que pour qui détient aussi la clé secrète. »
*Coût : deux phrases. Elles alourdissent une note aujourd'hui très lisible.*

**B. Ne rien changer.** La note est exacte ; aucune de ces deux nuances ne la rend
fausse, et elles décrivent une propriété commune à tout système de déduplication sans
comptes.

**C. Supprimer l'index `votes_par_votant_date`.** Il ne sert que la limite de débit,
qui filtre déjà par empreinte. Sans index, la corrélation reste possible, juste plus
lente. *Coût : une requête de limite de débit plus lente, pour un gain réel nul.
Je ne le recommande pas : ce serait de la sécurité par inconfort.*

### Ce que je recommande : A

Pas parce que la note est trompeuse — elle ne l'est pas —, mais parce que ton projet
soutient qu'un mot approximatif coûte à celui qui l'hérite. Une note de vie privée qui
dit exactement l'étendue de ce qu'elle promet est la version de ce site qui se tient.

Si tu choisis B, c'est défendable et je ne le regretterai pas : tu publies alors une
note vraie, simplement moins complète que ce qu'elle pourrait être.

---

## 7. Trois choses que tu ne pourras pas faire, et aucune n'est un bug

### Ce qui se passe aujourd'hui

Le système de vote est écrit, testé, et prêt. Mais il n'a aucun outil de réparation,
et c'est un manque de ma spec, pas du code.

**Tu ne pourras pas corriger une ligne orpheline.** Si tu reformules le texte d'une
alternative, son empreinte change : les anciens votes restent en base et ne sont plus
affichés nulle part. `npm run votes:orphelins` te les signale — il ne les corrige pas.
Les rattacher demande une requête SQL écrite à la main.

**Tu ne pourras pas sortir proprement d'une rotation de sel.** Ma spec la présente
comme « un geste manuel disponible » si tu soupçonnes un abus. En pratique : les
anciennes lignes gardent leur empreinte, donc comptent toujours dans les compteurs,
mais leurs auteurs ne les reconnaissent plus comme leurs et peuvent revoter — et
seront comptés deux fois. Rien ne permet de défaire cela sans `DELETE` manuel.

**Tu ne sauras pas que c'est cassé.** La route reste muette par conception, pour ne
jamais journaliser quoi que ce soit qui pourrait porter une adresse. Elle consigne
désormais le nom de la classe d'erreur et le code SQL — assez pour diagnostiquer en
dix secondes quand tu regardes — mais personne ne t'alertera. Une panne de trois
semaines ne se remarquerait qu'en ouvrant une fiche.

### Les options

**A. Une commande de purge, avec confirmation.** `npm run votes:purger` qui supprime
les lignes orphelines, et `--tout` pour vider la table après une rotation de sel.
*Coût : une petite heure, et un garde-fou sérieux contre la faute de frappe.*

**B. Attendre d'en avoir besoin.** Le corpus compte cinq fiches ; la première
reformulation d'alternative n'arrivera peut-être jamais, et une requête SQL ponctuelle
depuis la console Neon fait le travail.

**C. Une alerte minimale.** Un contrôle quotidien qui appelle `/api/votes?fiche=…` et
te prévient si la réponse n'est pas 200. *Coût : une action planifiée de quelques
lignes, et un peu de bruit les jours de panne d'hébergeur.*

### Ce que je recommande : B maintenant, A au premier besoin réel

Écrire une commande de purge avant d'avoir une seule ligne à purger, c'est construire
pour un avenir supposé. La console Neon suffit à cinq fiches. Mais garde cette page
sous la main : le jour où tu reformules une alternative qui a déjà des votes, tu auras
exactement ce problème, et tu sauras que ce n'est pas une surprise.

C, en revanche, vaut le coup dès que le vote compte pour toi. Un sondage dont personne
ne remarque la panne ne mesure rien.

---

## Résumé, mis à jour

| Question | Recommandation | Coût | Touche ton texte ? |
|---|---|---|---|
| 1. Noms anglais | Renommer les quatre (option A) | une demi-heure, mécanique | non |
| 2. Titres du manifeste | Décaler au rendu (option B) | une vingtaine de lignes | non |
| 3. Types de confusion en double | Laisser + détecter le décalage (A+B) | une quinzaine de lignes | non |
| 4. Contrainte trop absolue | Reformuler le plan (option A) | deux lignes | non |
| 5. `description` sans emploi | Afficher sur `/fiches` (option A) | une quinzaine de lignes | non |
| 6. Note de vie privée incomplète | Ajouter deux phrases (option A) | deux phrases | **oui** |
| 7. Aucun outil de réparation | Attendre, puis purger au besoin (B) | nul aujourd'hui | non |

Les questions 4, 5 et 7 sont des défauts de **ma** spec, pas du code : elle se contredit
dans un cas, et impose une obligation sans emploi dans l'autre. Les trois premières
sont de vrais choix de conception qui t'appartiennent.

Aucune des sept n'est urgente, et aucune ne bloque la mise en ligne. La seule qui ait
un effet sur un visiteur dès aujourd'hui reste la deuxième, et seulement pour ceux qui
naviguent avec un lecteur d'écran. La sixième est la seule qui touche un texte publié,
et la seule qui demande ta voix plutôt que mon avis.
