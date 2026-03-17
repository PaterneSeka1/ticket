d# Documentation des endpoints

## Préambule
- L'application écoute par défaut sur `http://localhost:3000` si `PORT` n'est pas précisé.
- Une `ValidationPipe` globale transforme les entrées, enlève les champs non whitelistés et interdit les propriétés inconnues.
- Tous les endpoints protégés attendent le header `Authorization: Bearer <token>` délivré par `/auth/login`. Les contrôles d'accès reposent sur `JwtAuthGuard` et, pour les routes `users`/`tickets/categories`, `RolesGuard` (uniquement `ADMIN`/`SUPER_ADMIN`).
- Les enums (`UserRole`, `TicketType`, `TicketStatus`, `TicketPriority`, `TimelineEventType`, etc.) sont exposés par `generated/prisma`. Se reporter à ce fichier si besoin des valeurs exactes.

## Endpoint global
### GET `/`
- Pas d'authentification.
- Retourne la chaîne renvoyée par `AppService.getHello()` (disponible pour tester que le serveur est vivant).

## Authentification
### POST `/auth/login`
- Body (JSON) :
  - `email` *(string, email, optionnel)* ou `matricule` *(string, optionnel)* : au moins l'un des deux doit être présent grâce au validateur `EmailOrMatricule`.
  - `passwordHash` *(string, requis)* : hash du mot de passe (le service attend déjà un hash côté client).
- Réponse :
  - `user` (détail `AuthenticatedUserDto`).
  - `authenticatedAt` (date de connexion).
  - `accessToken` (JWT à réutiliser dans `Authorization`).
- Code HTTP `200 OK` (jamais `201`).

### GET `/auth/me`
- Header `Authorization: Bearer <token>` requis.
- Retourne l'utilisateur authentifié (`AuthenticatedUserDto`).
- Permet de vérifier que le jeton est toujours valide et d'extraire les rôles/infos.

### POST `/auth/logout`
- Header `Authorization: Bearer <token>` requis.
- Ne prend pas de body.
- Valide simplement le JWT actif puis renvoie `204 No Content`. Cela permet au front de savoir que l'API a bien reçu la demande de déconnexion tout en restant stateless.

## Utilisateurs (`/users`, rôle ADMIN/SUPER_ADMIN requis)
- Les routes sont sécurisées par `JwtAuthGuard + RolesGuard`. Le `CurrentUser` injecte les infos de l'auteur dans chaque handler.

### POST `/users`
- Crée un utilisateur. Body (JSON) :
  - `nom`, `prenom`, `email`, `matricule`, `passwordHash` (tous requis, chaînes).
  - `role` *(enum UserRole, optionnel)*, sinon défaut défini côté service.
  - `direction` *(enum DirectionType, optionnel)*.
  - `service` *(enum OperationService, optionnel)*.
  - `isActive` *(boolean, optionnel)*.
  - `createdById` *(MongoId, optionnel)* et `lastLogin` *(ISO date, optionnel)* sont acceptés mais traités si présents.
- Réponse : l'utilisateur créé.
- Code HTTP `201 Created`.

### GET `/users`
- Liste tous les utilisateurs actifs (et éventuellement inactifs selon implémentation service).
- Pas de body.

### GET `/users/:id`
- Récupère un utilisateur par identifiant Mongo (`:id`).

### PATCH `/users/:id`
- Met à jour un utilisateur. Body : mêmes champs que pour la création mais tous optionnels (`PartialType` de `CreateUserDto`).
- L'utilisateur qui fait la requête est injecté via `@CurrentUser` pour journaliser/modifier les droits (voir service).

### DELETE `/users/:id`
- Supprime un utilisateur (retourne `204 No Content`).
- Le user courant est passé à la couche service pour traçabilité.

### PATCH `/users/:id/activate`
### PATCH `/users/:id/deactivate`
- Ne prennent pas de body.
- Permettent d'activer/désactiver un compte.
- Retourne l'utilisateur mis à jour (ou `204` selon implémentation service).

## Catégories de tickets (`/tickets/categories`, ADMIN/SUPER_ADMIN)
- Toutes les routes sont couvertes par le même guard et la validation des DTOs.

### GET `/tickets/categories`
- Retourne la liste des catégories existantes.

### POST `/tickets/categories`
- Body :
  - `libelle` *(string, requis)*.
  - `type` *(enum TicketType, requis)*.
  - `description` *(string, optionnel)*.
  - `isActive` *(boolean, optionnel)*.
- Code `201 Created`.

### PATCH `/tickets/categories/:id`
- Body : mêmes champs que le POST mais optionnels (`UpdateTicketCategoryDto`).
- `:id` est l'identifiant de la catégorie (MongoId).

### DELETE `/tickets/categories/:id`
- Supprime une catégorie (retourne `204 No Content`).

## Tickets (`/tickets`, JWT requis)
- Différents endpoints pour créer, lire et enrichir un ticket. Le `TicketsService` gère les dépendances (catégories, DSI, etc.).

### POST `/tickets`
- Crée une demande.
- Body obligatoire :
  - `type` *(TicketType)*, `priority` *(TicketPriority)*, `categoryId` *(MongoId)*, `description` *(string)*.
- Body optionnel :
  - `assignedService` *(OperationService)*, `clientName`, `product`, `attachmentName` (chaînes).
  - `detectedAt`, `resolvedAt` *(dates ISO strings)*.
  - `slaMaxMinutes`, `waitMinutes` *(entiers ≥ 0)*.
- Réponse : le ticket créé.
- Code `201 Created`.

### GET `/tickets`
- Filtrage via query :
  - `status`, `type`, `priority` (enums).
  - `emitterId`, `categoryId`, `receivedById` (MongoId).
  - `createdAfter`, `createdBefore` (ISO date strings).
- Retourne les tickets correspondant aux filtres actifs.

### GET `/tickets/:id`
- Récupère un ticket complet par identifiant.

### GET `/tickets/me/created`
- Retourne les tickets créés par l'utilisateur authentifié (`CurrentUser`).

### GET `/tickets/dsi/received`
- Retourne les tickets reçus par la DSI, en fonction du rôle `dsiTicketRole` du user.

### PATCH `/tickets/:id`
- Met à jour un ticket. Body identique à `CreateTicketDto` mais tous les champs sont optionnels (`UpdateTicketDto`).

### PATCH `/tickets/:id/status`
- Change le statut d'un ticket. Body :
  - `status` *(TicketStatus, requis)*.
  - `actorName` *(string, optionnel)*.
  - `receivedById` *(MongoId, optionnel)* : utilisé pour enregistrer l'utilisateur DSI qui prend en charge le ticket.
  - `eventType` *(TimelineEventType, optionnel)* : associe une entrée de timeline à ce changement.
- Le user connecté est injecté pour tracer la modification.

### POST `/tickets/:id/comments`
- Ajoute un commentaire.
- Body : { `content`: string }.
- Nécessite un `content` non vide.

### POST `/tickets/:id/timeline`
- Ajoute un événement de timeline.
- Body :
  - `type` *(TimelineEventType, requis)*.
  - `label` *(string, requis)*.
  - `actorName` *(string, requis)*.

### DELETE `/tickets/:id`
- Supprime le ticket et renvoie `204 No Content`.

## Bonnes pratiques d'appel
1. Toujours appeler `/auth/login` pour récupérer `accessToken` avant toute route protégée.
2. Fournir le JWT dans `Authorization: Bearer <token>` pour chaque requête nécessitant `JwtAuthGuard`.
3. Pour les routes `users` et `tickets/categories`, s'assurer que le compte connecté a un `role` `ADMIN` ou `SUPER_ADMIN` (cf. `UserRole`).
4. Respecter les DTOs car la validation globale refuse les propriétés non déclarées.
5. Les IDs attendus sont des objets Mongo (`string` 24 caractères) : vérifier que `categoryId`, `emitterId`, etc. respectent ce format.

En cas de doute sur une enum (type, status, priority, timeline event, etc.), consulter `generated/prisma/index.js` pour connaître les valeurs exactes attendues.
