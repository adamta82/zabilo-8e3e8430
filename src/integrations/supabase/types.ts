export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      automations: {
        Row: {
          action_type: Database["public"]["Enums"]["automation_action"]
          created_at: string
          email_to_approver: boolean | null
          id: string
          is_active: boolean | null
          name: string
          payload_template: Json | null
          request_type_filter:
            | Database["public"]["Enums"]["request_type"][]
            | null
          trigger: Database["public"]["Enums"]["automation_trigger"]
          updated_at: string
          webhook_headers: Json | null
          webhook_url: string | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["automation_action"]
          created_at?: string
          email_to_approver?: boolean | null
          id?: string
          is_active?: boolean | null
          name: string
          payload_template?: Json | null
          request_type_filter?:
            | Database["public"]["Enums"]["request_type"][]
            | null
          trigger: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
          webhook_headers?: Json | null
          webhook_url?: string | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["automation_action"]
          created_at?: string
          email_to_approver?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
          payload_template?: Json | null
          request_type_filter?:
            | Database["public"]["Enums"]["request_type"][]
            | null
          trigger?: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
          webhook_headers?: Json | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      global_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approver_id: string | null
          avatar_url: string | null
          calendar_emails: string[] | null
          created_at: string
          department_id: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          show_in_shifts: boolean
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          approver_id?: string | null
          avatar_url?: string | null
          calendar_emails?: string[] | null
          created_at?: string
          department_id?: string | null
          email: string
          full_name: string
          id?: string
          phone?: string | null
          show_in_shifts?: boolean
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          approver_id?: string | null
          avatar_url?: string | null
          calendar_emails?: string[] | null
          created_at?: string
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          show_in_shifts?: boolean
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          items: Json | null
          notes: string | null
          status: Database["public"]["Enums"]["request_status"]
          type: Database["public"]["Enums"]["request_type"]
          updated_at: string
          use_vacation_days: boolean | null
          user_id: string
          vacation_end_date: string | null
          vacation_reason: string | null
          vacation_single_day: boolean | null
          vacation_start_date: string | null
          wfh_checklist: Json | null
          wfh_date: string | null
          wfh_tasks: Json | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          items?: Json | null
          notes?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          type: Database["public"]["Enums"]["request_type"]
          updated_at?: string
          use_vacation_days?: boolean | null
          user_id: string
          vacation_end_date?: string | null
          vacation_reason?: string | null
          vacation_single_day?: boolean | null
          vacation_start_date?: string | null
          wfh_checklist?: Json | null
          wfh_date?: string | null
          wfh_tasks?: Json | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          items?: Json | null
          notes?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          type?: Database["public"]["Enums"]["request_type"]
          updated_at?: string
          use_vacation_days?: boolean | null
          user_id?: string
          vacation_end_date?: string | null
          vacation_reason?: string | null
          vacation_single_day?: boolean | null
          vacation_start_date?: string | null
          wfh_checklist?: Json | null
          wfh_date?: string | null
          wfh_tasks?: Json | null
        }
        Relationships: []
      }
      shifts: {
        Row: {
          created_at: string
          date: string
          employee_id: string
          end_time: string
          id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          employee_id: string
          end_time: string
          id?: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          employee_id?: string
          end_time?: string
          id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_approver_of: {
        Args: { _approver_user_id: string; _employee_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "employee"
      automation_action: "webhook" | "email"
      automation_trigger:
        | "request_created"
        | "request_approved"
        | "request_rejected"
      request_status:
        | "pending"
        | "approved"
        | "rejected"
        | "ordered"
        | "supplied"
      request_type: "wfh" | "vacation" | "equipment" | "groceries"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "employee"],
      automation_action: ["webhook", "email"],
      automation_trigger: [
        "request_created",
        "request_approved",
        "request_rejected",
      ],
      request_status: [
        "pending",
        "approved",
        "rejected",
        "ordered",
        "supplied",
      ],
      request_type: ["wfh", "vacation", "equipment", "groceries"],
    },
  },
} as const
