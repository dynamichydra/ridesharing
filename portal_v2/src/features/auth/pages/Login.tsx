import { useUser } from "@/hooks/use-user";
import { LoginForm } from "../components/loginForm";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";


const Login = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useUser();

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/", { replace: true });
    }
  }, [isLoading, user, navigate]);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-muted/30">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background overflow-hidden border p-1.5 shadow-sm">
            <img src="/logo.png" alt="Ryva Ride Logo" className="size-full object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mt-2">
            Ryva Ride
          </h1>
        </div>
        <LoginForm />
      </div>
    </div>
  );
};

export default Login;
