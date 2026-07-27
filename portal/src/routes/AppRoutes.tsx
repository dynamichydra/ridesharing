import { Suspense, lazy } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Loader from "@/components/fullpage-loader";
import ProtectedRoute from "@/components/protected-route";

// Lazy imports for layouts and general pages
const Login = lazy(() => import("@/features/auth/pages/Login"));
const Register = lazy(() => import("@/features/auth/pages/Register"));
const Root = lazy(() => import("@/layouts/Root"));

// Lazy imports for features
const Dashboard = lazy(() => import("@/features/dashboard/pages"));
const UserList = lazy(() => import("@/features/users/pages/list"));
const RiderDetail = lazy(() => import("@/features/users/pages/Detail"));
const DriverList = lazy(() => import("@/features/drivers/pages/list"));
const DriverDetail = lazy(() => import("@/features/drivers/pages/Detail"));
const RideList = lazy(() => import("@/features/rides/pages"));
const VehicleTypeList = lazy(() => import("@/features/vehicle-types/pages"));
const VehicleModelList = lazy(() => import("@/features/vehicle-models/pages"));
const ZoneList = lazy(() => import("@/features/zones/pages"));
const GeoList = lazy(() => import("@/features/geo/pages"));
const FareRuleList = lazy(() => import("@/features/fare-rules/pages"));
const SubscriptionPlanList = lazy(() => import("@/features/subscriptions/pages"));
const RiderPlanList = lazy(() => import("@/features/rider-plans/pages"));
const WalletList = lazy(() => import("@/features/wallets/pages"));
const RidePaymentList = lazy(() => import("@/features/ride-payments/pages"));
const RefundList = lazy(() => import("@/features/refunds/pages"));
const PayoutList = lazy(() => import("@/features/payouts/pages"));
const DisputeList = lazy(() => import("@/features/disputes/pages"));
const ReconciliationList = lazy(() => import("@/features/reconciliation/pages"));
const LedgerList = lazy(() => import("@/features/ledger/pages"));
const FlaggedTripList = lazy(() => import("@/features/flagged-trips/pages"));
const AuditLogList = lazy(() => import("@/features/audit-logs/pages"));
const OnboardingConfigList = lazy(() => import("@/features/onboarding-config/pages"));
const NotificationTemplateList = lazy(() => import("@/features/notification-templates/pages/list"));

const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <Suspense fallback={<Loader />}>
        <Login />
      </Suspense>
    ),
  },
  {
    path: "/register",
    element: (
      <Suspense fallback={<Loader />}>
        <Register />
      </Suspense>
    ),
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<Loader />}>
          <Root />
        </Suspense>
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<Loader />}>
            <Dashboard />
          </Suspense>
        ),
      },
      {
        path: "users",
        element: (
          <Suspense fallback={<Loader />}>
            <UserList />
          </Suspense>
        ),
      },
      {
        path: "users/:riderId",
        element: (
          <Suspense fallback={<Loader />}>
            <RiderDetail />
          </Suspense>
        ),
      },
      {
        path: "drivers",
        element: (
          <Suspense fallback={<Loader />}>
            <DriverList />
          </Suspense>
        ),
      },
      {
        path: "drivers/:driverId",
        element: (
          <Suspense fallback={<Loader />}>
            <DriverDetail />
          </Suspense>
        ),
      },
      {
        path: "rides",
        element: (
          <Suspense fallback={<Loader />}>
            <RideList />
          </Suspense>
        ),
      },
      {
        path: "ride-payments",
        element: (
          <Suspense fallback={<Loader />}>
            <RidePaymentList />
          </Suspense>
        ),
      },
      {
        path: "vehicle-types",
        element: (
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <Suspense fallback={<Loader />}>
              <VehicleTypeList />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "vehicle-models",
        element: (
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <Suspense fallback={<Loader />}>
              <VehicleModelList />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "zones",
        element: (
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <Suspense fallback={<Loader />}>
              <ZoneList />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "locations",
        element: (
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <Suspense fallback={<Loader />}>
              <GeoList />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "fare-rules",
        element: (
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <Suspense fallback={<Loader />}>
              <FareRuleList />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "subscription-plans",
        element: (
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <Suspense fallback={<Loader />}>
              <SubscriptionPlanList />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "rider-plans",
        element: (
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <Suspense fallback={<Loader />}>
              <RiderPlanList />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "wallets",
        element: (
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <Suspense fallback={<Loader />}>
              <WalletList />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "refunds",
        element: (
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <Suspense fallback={<Loader />}>
              <RefundList />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "payouts",
        element: (
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <Suspense fallback={<Loader />}>
              <PayoutList />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "disputes",
        element: (
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <Suspense fallback={<Loader />}>
              <DisputeList />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "reconciliation",
        element: (
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <Suspense fallback={<Loader />}>
              <ReconciliationList />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "ledger",
        element: (
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <Suspense fallback={<Loader />}>
              <LedgerList />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "flagged-trips",
        element: (
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <Suspense fallback={<Loader />}>
              <FlaggedTripList />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "audit-logs",
        element: (
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <Suspense fallback={<Loader />}>
              <AuditLogList />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "onboarding-config",
        element: (
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <Suspense fallback={<Loader />}>
              <OnboardingConfigList />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "notification-templates",
        element: (
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <Suspense fallback={<Loader />}>
              <NotificationTemplateList />
            </Suspense>
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

export function AppRoutes() {
  return <RouterProvider router={router} />;
}
