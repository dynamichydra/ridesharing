import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import queryClient from "@/lib/queryClient";
import { AppRoutes } from "@/routes/AppRoutes";
import { ThemeProvider } from "@/components/theme-provider";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="rideshare-admin-theme">
        <AppRoutes />
        <Toaster position="top-right" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
