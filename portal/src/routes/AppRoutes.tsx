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
const DriverList = lazy(() => import("@/features/drivers/pages"));
const RideList = lazy(() => import("@/features/rides/pages"));
const VehicleTypeList = lazy(() => import("@/features/vehicle-types/pages"));
const ZoneList = lazy(() => import("@/features/zones/pages"));
const FareRuleList = lazy(() => import("@/features/fare-rules/pages"));
const SubscriptionPlanList = lazy(() => import("@/features/subscriptions/pages"));

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
        path: "drivers",
        element: (
          <Suspense fallback={<Loader />}>
            <DriverList />
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
        path: "vehicle-types",
        element: (
          <Suspense fallback={<Loader />}>
            <VehicleTypeList />
          </Suspense>
        ),
      },
      {
        path: "zones",
        element: (
          <Suspense fallback={<Loader />}>
            <ZoneList />
          </Suspense>
        ),
      },
      {
        path: "fare-rules",
        element: (
          <Suspense fallback={<Loader />}>
            <FareRuleList />
          </Suspense>
        ),
      },
      {
        path: "subscription-plans",
        element: (
          <Suspense fallback={<Loader />}>
            <SubscriptionPlanList />
          </Suspense>
        ),
      },
    ],
  },
]);

export function AppRoutes() {
  return <RouterProvider router={router} />;
}
