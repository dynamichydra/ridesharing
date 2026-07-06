import { useUser } from "@/hooks/use-user";
import { LoginForm } from "../components/loginForm";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Car } from "lucide-react";

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
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white">
            <Car className="size-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            RideShare
          </h1>
        </div>
        <LoginForm />
      </div>
    </div>
  );
};

export default Login;
