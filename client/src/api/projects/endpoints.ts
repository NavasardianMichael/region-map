const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export const PROJECT_ENDPOINTS = {
  list: `${BASE_URL}/projects`,
  bulkDelete: `${BASE_URL}/projects/bulk-delete`,
  detail: (id: string) => `${BASE_URL}/projects/${id}`,
  embed: (id: string) => `${BASE_URL}/projects/${id}/embed`,
  lock: (id: string) => `${BASE_URL}/projects/${id}/lock`,
} as const;
