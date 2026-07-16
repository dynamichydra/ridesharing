import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Route-level render errors have no fallback today — an uncaught exception blanks the
// app. This is the single boundary that catches that instead of letting it happen.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-background text-foreground p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <div>
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mt-1">
              An unexpected error occurred while rendering this page.
            </p>
          </div>
          <Button onClick={() => (window.location.href = "/")} className="cursor-pointer">
            Back to Dashboard
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
