# Workflow de la logique métier

## API exposée
- `TicketsController` (JWT + `tickets/` route) délègue chaque action aux méthodes du service : création, recherche filtrée, commentaires, timeline, mise à jour de statut ou suppression (`backend/src/tickets/tickets.controller.ts:1-56`).

## 1. Cycle de vie d'un ticket
1. **Création** (`TicketsService.create`, `backend/src/tickets/tickets.service.ts:65-135`) :
   - la catégorie est vérifiée (statut actif et type cohérent) puis la SLA est résolue via la politique prioritaire (`sla.getPolicy`).
   - la personne qui recevra le ticket est choisie (`findActiveSuperAdmin > findActiveDsiResponsible > findAnyAdmin`).
   - un code unique (`TK-YYYYMMDD-XXX`) est calculé et l’enregistrement est créé avec un statut initial `RECU`.
   - deux événements de timeline (création, réception) sont ajoutés et l’activité est tracée pour l’émetteur et le destinataire grâce à `ActivityLogService`.
2. **Mise à jour** (`backend/src/tickets/tickets.service.ts:207-244`) : toute propriété modifiable (catégorie, priorité, métadonnées) passe par `buildUpdatePayload`, avec compensation SLA automatique si seule la priorité bouge.
3. **Transitions de statut** (`STATUS_TRANSITIONS` et `updateStatus`, `backend/src/tickets/tickets.service.ts:32-291`) :
   - seules certaines transitions sont permises et seules les personnes DSI avec rôle RESPONSABLE/CO_RESPONSABLE peuvent les déclencher (`canActOnStatus`).
   - la résolution renseigne `resolvedAt`, un événement de timeline est inscrit et l’activité est loggée.
4. **Mesure du temps d’attente** (`computeWaitMinutes` et `toTicketDto`, `backend/src/tickets/tickets.service.ts:520-575`) : la durée depuis la réception ou la création jusqu’à la résolution (ou maintenant) alimente la propriété `waitMinutes` renvoyée au client.

## 2. Interactions complémentaires
- **Commentaires & timeline manuelle** (`addComment`, `recordTimeline`, `backend/src/tickets/tickets.service.ts:293-345`) : chaque ajout en base crée un événement de timeline et un log d’activité pour suivre les discussions.
- **Suppression** (`remove`, `backend/src/tickets/tickets.service.ts:437-454`) : on efface d’abord les commentaires, les événements et les logs associés, puis le ticket, avec enregistrement de l’action.
- **Catégories** (`createCategory`, `updateCategory`, `deleteCategory`, `backend/src/tickets/tickets.service.ts:347-435`) : la création vérifie l’unicité, la mise à jour normalise le libellé et la suppression désactive la catégorie. Chaque mutation est auditée.

## 3. Utilisateurs et habilitations
- **Création / mise à jour** (`UsersService.create/update`, `backend/src/users/users.service.ts:32-163`) : le mot de passe est hashé, la contrainte du champ `service` limitée à la direction DO est appliquée, puis l’action est loggée.
- **Activation, désactivation et consultation** (`backend/src/users/users.service.ts:117-164`) : les états actifs basculent via des mises à jour, chaque transition déclenche un log, et les droits de lecture filtrent selon le rôle de l’acteur.
- **Consistance des données** (`ensureServiceReservedToDo`, `backend/src/users/users.service.ts:244-257`) et routines de gestion des erreurs de duplicat/absence.

## 4. SLA et attentes
- `SlaService` (`backend/src/sla/sla.service.ts:15-75`) expose :
  - la liste et la lecture des politiques,
  - la mise à jour consolide les champs `responseMinutes`, `resolutionMinutes` et `isActive` avant d’upsert et log l’action,
  - les tickets consomment ces valeurs pour pré-calculer `slaMaxMinutes` quand elles ne sont pas fournies.

## 5. Audit et traçabilité
- `ActivityLogService` (`backend/src/activity/activity-log.service.ts:1-46`) sert d’outil transversal pour enregistrer chaque création, mutation ou commentaire qui concerne un ticket ou un utilisateur.
- Le service tickets enrichit la timeline et l’activité pour fournir une traçabilité utilisateur par utilisateur.

Ce workflow montre les contraintes métier (types/catégories, rôles DSI, SLA, audit) et les enchaînements attendus par les contrôleurs et services de la couche backend actuelle.
