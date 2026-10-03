# Contribuer

Le corpus est ouvert. Il n’y a pas encore de comptes ni de votes sur ce site :
tout passe par le dépôt, où la discussion reste publique et tracée.

## Proposer une analyse

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
- Les huit champs du front-matter : `terme`, `discipline`, `confusion`,
  `statut`, `resume`, `suggestions`, `cree`, `modifie`.
- `resume` : 240 caractères maximum.
- `discipline` et `confusion` : doivent exister dans `content/taxonomies/`.

La commande `npm run lint:content` reproduit cette vérification en local,
avant d’ouvrir la pull request.

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
