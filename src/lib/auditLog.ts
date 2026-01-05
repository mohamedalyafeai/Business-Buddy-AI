import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type AuditAction =
  | "role_added"
  | "role_updated"
  | "role_removed"
  | "settings_updated"
  | "user_created"
  | "user_deleted";

export interface AuditLogEntry {
  action: AuditAction;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, string | number | boolean | null>;
}

export const createAuditLog = async (entry: AuditLogEntry): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("No authenticated user for audit log");
      return;
    }

    const { error } = await supabase
      .from("audit_logs")
      .insert([{
        admin_id: user.id,
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id || null,
        details: (entry.details || {}) as Json,
      }]);

    if (error) {
      console.error("Failed to create audit log:", error);
    }
  } catch (error) {
    console.error("Error creating audit log:", error);
  }
};
