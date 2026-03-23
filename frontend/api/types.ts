export type UserRole = "SUPER_ADMIN" | "ADMIN" | "USER";

export type DirectionType = "DAF" | "DSI" | "DO";

export type OperationService = "QUALITE" | "OPERATIONS" | "REPUTATION";

export type DsiTicketRole = "RESPONSABLE" | "CO_RESPONSABLE";

export type UserResponsibility = "RESPONSABLE" | "EMPLOYE";

export type TicketType = "INCIDENT" | "DEMANDE";

export type TicketStatus =
  | "RECU"
  | "EN_COURS"
  | "AJOURNE"
  | "RESOLU"
  | "ABANDONNE"
  | "FERME"
  | "OUVERT"
  | "PRIS";

export type TicketPriority = "BAS" | "MOYEN" | "HAUT" | "CRITIQUE";

export type TimelineEventType = "CREATE" | "RECEIVE" | "STATUS_CHANGE" | "ACTION";

export interface AuthenticatedUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  matricule: string;
  role: UserRole;
  direction?: DirectionType | null;
  service?: OperationService | null;
  dsiTicketRole?: DsiTicketRole | null;
  isResponsable: boolean;
  isActive: boolean;
  accessReport: boolean;
  exportReport: boolean;
  createdAt: string;
  updatedAt: string;
  createdById?: string | null;
  lastLogin?: string | null;
}

export interface TicketCategory {
  id: string;
  libelle: string;
  type: TicketType;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TicketCategorySummary {
  id: string;
  libelle: string;
  type: TicketType;
}

export interface TicketActor {
  id: string;
  nom: string;
  prenom: string;
}

export interface TicketTimeline {
  id: string;
  ticketId: string;
  type: TimelineEventType;
  label: string;
  actorName: string;
  createdAt: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  content: string;
  createdAt: string;
  author: TicketActor;
}

export interface Ticket {
  id: string;
  code: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  description: string;
  assignedService?: OperationService | null;
  category: TicketCategorySummary;
  emitter: TicketActor;
  receivedBy: TicketActor | null;
  receivedAt?: string | null;
  clientName?: string | null;
  product?: string | null;
  attachmentName?: string | null;
  detectedAt?: string | null;
  resolvedAt?: string | null;
  slaMaxMinutes?: number | null;
  waitMinutes?: number | null;
  createdAt: string;
  updatedAt: string;
  comments: TicketComment[];
  timeline: TicketTimeline[];
}
