import { Navigate } from "react-router";
import { LoadingOverlay } from "@mantine/core";
import { useAuth } from "~/lib/auth";

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingOverlay visible />;
  }

  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}
