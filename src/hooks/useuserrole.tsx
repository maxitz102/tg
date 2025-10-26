import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "employee" | "manager" | "admin";

export const useUserRole = (userId: string | undefined) => {
  const [role, setRole] = useState<UserRole>("employee");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data) {
        setRole(data.role as UserRole);
      }
      setLoading(false);
    };

    fetchRole();
  }, [userId]);

  return { role, loading };
};
