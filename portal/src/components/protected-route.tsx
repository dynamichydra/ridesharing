import { useUser } from "@/hooks/use-user";
import { Navigate } from "react-router-dom";
import FullPageLoader from "./fullpage-loader";

type Protected = {
  children: React.ReactNode;
  allowedRoles?: string[];
};

// Redirects *before* rendering, so protected pages never mount (and fire API calls) for a
// signed-out user or the wrong role. The role comes from /admin/me (see useUser); the backend
// enforces the same rules independently.
function ProtectedRoute({ children, allowedRoles }: Protected) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!user || !user.access_token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
