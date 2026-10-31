---
terme: intervalle de confiance
discipline: statistiques
confusion: faux-ami-courant
statut: propose
preuve: documentee
resume: >
  Le mot « confiance » promet une certitude que l’intervalle ne donne pas : il
  mesure l’incertitude, et ne dit pas où se trouve la vraie valeur.
accroche: "Andrew Gelman écrit que l’intervalle de confiance ne devrait pas inspirer confiance, puisqu’il mesure une incertitude."
suggestions:
  - intervalle de compatibilité
  - intervalle d’incertitude
sources:
  - auteur: "Andrew Gelman et Sander Greenland"
    annee: 2019
    titre: "Are confidence intervals better termed “uncertainty intervals”?"
    url: https://sites.stat.columbia.edu/gelman/research/published/uncertainty_intervals.pdf
    lecture: originale
cree: 2026-10-31
modifie: 2026-10-31
---

## Pourquoi c’est confus

Un intervalle de confiance à 95 % est le résultat d’une procédure qui, répétée
un grand nombre de fois, couvrirait la vraie valeur dans 95 % des cas. Il ne
dit pas qu’il y a 95 % de chances que la vraie valeur soit dans cet intervalle
précis, et encore moins qu’on peut s’y fier.

Le mot « confiance » pousse précisément vers ces deux lectures fausses. Un
intervalle large, qui signale qu’on sait peu de chose, porte le même nom
rassurant qu’un intervalle étroit.

## Suggestion

« Intervalle de compatibilité », proposé par Sander Greenland. Il désigne
l’ensemble des valeurs que les données ne contredisent pas fortement, au vu
du modèle utilisé. C’est ce que l’intervalle établit, et rien de plus.

« Intervalle d’incertitude », proposé par Andrew Gelman, est plus parlant pour
un lecteur non spécialiste. Greenland le juge toutefois trompeur à son tour,
car l’intervalle ne prend pas en compte toutes les sources d’incertitude.

## Risques

Le terme est universel dans les publications, les logiciels et les normes de
présentation des résultats. Les deux alternatives sont en concurrence, ce qui
risque de diviser l’effort de changement. « Intervalle d’incertitude » peut
aussi se confondre avec les intervalles bayésiens, qui ont un autre sens.

## D’où ça vient

Le nom vient de Jerzy Neyman, dans les années 1930. En 2019, le *BMJ* publie
un débat entre Andrew Gelman et Sander Greenland intitulé « Are confidence
intervals better termed “uncertainty intervals”? ». Gelman y écrit que
l’intervalle de confiance ne devrait pas inspirer confiance, puisqu’il mesure
une incertitude. Greenland ajoute que le nom ne fournit aucune base à la
confiance au sens courant du mot.
