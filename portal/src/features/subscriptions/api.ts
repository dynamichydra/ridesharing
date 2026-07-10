import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  CreateSubscriptionPlanPayload,
  Pagination,
  RawPagination,
  SubscriptionPlan,
  SubscriptionPlanListParams,
  SubscriptionPlanListResult,
  UpdateSubscriptionPlanPayload,
  VehicleTypeOption,
} from "./types";

function normalizePagination(
  raw: RawPagination | undefined,
  fallbackPage: number,
  fallbackLimit: number
): Pagination {
  if (!raw) {
    return { total: 0, page: fallbackPage, limit: fallbackLimit, totalPages: 1 };
  }
  return {
    total: raw.totalItems,
    page: raw.currentPage,
    limit: raw.itemsPerPage,
    totalPages: raw.totalPages,
  };
}

// GET /subscriptions/plans/all — Admin. List all plans, including inactive (paginated).
export async function fetchSubscriptionPlans(
  params: SubscriptionPlanListParams
): Promise<SubscriptionPlanListResult> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;

  const query = new URLSearchParams();
  query.set("page", String(page));
  query.set("limit", String(limit));

  const res = (await apiClient.get<SubscriptionPlan[]>(
    `/subscriptions/plans/all?${query.toString()}`
  )) as ApiResponse<SubscriptionPlan[]>;

  return {
    data: res.MESSAGE ?? [],
    pagination: normalizePagination(res.PAGINATION, page, limit),
  };
}

// GET /vehicle-types — Public. Used to populate the vehicle-type checkboxes
// on the plan form (vehicleTypeIds).
export async function fetchVehicleTypeOptions(): Promise<VehicleTypeOption[]> {
  const res = (await apiClient.get<VehicleTypeOption[]>(
    "/vehicle-types"
  )) as ApiResponse<VehicleTypeOption[]>;

  return res.MESSAGE ?? [];
}

// POST /subscriptions/plans — Admin. Create a plan.
export async function createSubscriptionPlan(
  payload: CreateSubscriptionPlanPayload
): Promise<SubscriptionPlan> {
  const res = (await apiClient.post(
    "/subscriptions/plans",
    payload
  )) as ApiResponse<SubscriptionPlan>;
  return res.MESSAGE;
}

// PATCH /subscriptions/plans/:id — Admin. Update a plan.
export async function updateSubscriptionPlan(
  id: string,
  payload: UpdateSubscriptionPlanPayload
): Promise<SubscriptionPlan> {
  const res = (await apiClient.patch(
    `/subscriptions/plans/${id}`,
    payload
  )) as ApiResponse<SubscriptionPlan>;
  return res.MESSAGE;
}

// DELETE /subscriptions/plans/:id — Admin. Delete/deactivate a plan.
export async function deleteSubscriptionPlan(id: string): Promise<void> {
  await apiClient.delete(`/subscriptions/plans/${id}`);
}