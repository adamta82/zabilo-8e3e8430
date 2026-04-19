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
      article_reads: {
        Row: {
          article_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_reads_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "knowledge_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          manager_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          manager_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          created_at: string
          description: string | null
          document_date: string | null
          document_type: string
          employee_id: string
          file_name: string
          file_path: string
          id: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_date?: string | null
          document_type: string
          employee_id: string
          file_name: string
          file_path: string
          id?: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          description?: string | null
          document_date?: string | null
          document_type?: string
          employee_id?: string
          file_name?: string
          file_path?: string
          id?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      knowledge_articles: {
        Row: {
          article_type: string
          author_id: string
          content: string
          created_at: string
          department_id: string | null
          id: string
          is_pinned: boolean
          is_published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          article_type?: string
          author_id: string
          content: string
          created_at?: string
          department_id?: string | null
          id?: string
          is_pinned?: boolean
          is_published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          article_type?: string
          author_id?: string
          content?: string
          created_at?: string
          department_id?: string | null
          id?: string
          is_pinned?: boolean
          is_published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_articles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          approver_id: string | null
          avatar_url: string | null
          calendar_emails: string[] | null
          can_manage_shifts: boolean
          created_at: string
          department_id: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          hire_date: string | null
          id: string
          is_partner: boolean
          job_title: string | null
          phone: string | null
          show_in_shifts: boolean
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          address?: string | null
          approver_id?: string | null
          avatar_url?: string | null
          calendar_emails?: string[] | null
          can_manage_shifts?: boolean
          created_at?: string
          department_id?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          is_partner?: boolean
          job_title?: string | null
          phone?: string | null
          show_in_shifts?: boolean
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          address?: string | null
          approver_id?: string | null
          avatar_url?: string | null
          calendar_emails?: string[] | null
          can_manage_shifts?: boolean
          created_at?: string
          department_id?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          is_partner?: boolean
          job_title?: string | null
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
      can_manage_shifts: { Args: { _user_id: string }; Returns: boolean }
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
