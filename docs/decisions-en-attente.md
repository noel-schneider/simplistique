# Trois décisions en attente

Trois questions se sont posées pendant la construction de la v1. Elles ne sont pas
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

## Résumé

| Question | Recommandation | Coût | Touche ton texte ? |
|---|---|---|---|
| 1. Noms anglais | Renommer les quatre (option A) | une demi-heure, mécanique | non |
| 2. Titres du manifeste | Décaler au rendu (option B) | une vingtaine de lignes | non |
| 3. Types de confusion en double | Laisser + détecter le décalage (A+B) | une quinzaine de lignes | non |

Aucune des trois n'est urgente, et aucune ne bloque la mise en ligne. La seule qui
ait un effet sur un visiteur dès aujourd'hui est la deuxième, et seulement pour
ceux qui naviguent avec un lecteur d'écran.
