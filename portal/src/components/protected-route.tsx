import { useUser } from "@/hooks/use-user";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FullPageLoader from "./fullpage-loader";

type Protected = {
  children: React.ReactNode;
  allowedRoles?: string[];
};

function ProtectedRoute({ children, allowedRoles }: Protected) {
  const navigate = useNavigate();
  const { user, isLoading } = useUser();

  useEffect(() => {
    if (isLoading) return;

    // If not logged in
    if (!user || !user.access_token) {
      navigate("/login");
      return;
    }

    // Role verification (if needed in future)
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      navigate("/");
    }
  }, [user, isLoading, allowedRoles, navigate]);

  if (isLoading) {
    return <FullPageLoader />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
