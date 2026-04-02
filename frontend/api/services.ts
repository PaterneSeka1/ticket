import { apiRequest } from "@/api/client";
import type { Service } from "@/api/types";

export function fetchServices() {
  return apiRequest<Service[]>("/services");
}
