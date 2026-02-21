import { useEffect } from "react";
import { useLocation } from "wouter";

export default function RemindersPage() {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate("/app/inbox", { replace: true });
  }, [navigate]);

  return null;
}
