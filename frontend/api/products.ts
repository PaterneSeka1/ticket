import { apiRequest } from "./client";
import type { ConcernedProduct } from "./types";

export interface ConcernedProductPayload {
  name: string;
  description?: string;
  isActive?: boolean;
}

export function fetchConcernedProducts() {
  return apiRequest<ConcernedProduct[]>("/tickets/products");
}

export function createConcernedProduct(payload: ConcernedProductPayload) {
  return apiRequest<ConcernedProduct>("/tickets/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateConcernedProduct(id: string, payload: Partial<ConcernedProductPayload>) {
  return apiRequest<ConcernedProduct>(`/tickets/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteConcernedProduct(id: string) {
  return apiRequest<void>(`/tickets/products/${id}`, {
    method: "DELETE",
  });
}
