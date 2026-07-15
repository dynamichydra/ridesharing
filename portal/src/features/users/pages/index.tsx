import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CreateRiderDialog } from "../components/dialog";
import UserList from "./list";

export default function UserListPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
  <h2 className="text-3xl font-bold tracking-tight text-foreground">
    Users Management
  </h2>
  <p className="text-muted-foreground mt-1">
    View, search, verify and configure registered platform users.
  </p>
</div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Users Directory</CardTitle>
          <CardDescription>
            Users who can book rides using the customer application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

  <div className="flex justify-end">
    <Button
      size="sm"
      onClick={() => setIsCreateOpen(true)}
      className="w-fit gap-2 px-3 shadow-sm font-medium cursor-pointer"
    >
      <UserPlus className="h-3.5 w-3.5" />
      Add User
    </Button>
  </div>

  <UserList />
</CardContent>
      </Card>

      <CreateRiderDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          setIsCreateOpen(false);
          queryClient.invalidateQueries({ queryKey: ["riders"], refetchType: "active" });
        }}
      />
    </div>
  );
}