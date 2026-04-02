import { apiRequest } from "@/api/client";
import type { Department } from "@/api/types";

export function fetchDepartments() {
  return apiRequest<Department[]>("/departments");
}
