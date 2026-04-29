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
      campaign_entries: {
        Row: {
          campaign_id: string
          created_at: string
          data: Json
          id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          data?: Json
          id?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          data?: Json
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_entries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          client_status: Database["public"]["Enums"]["campaign_client_status"]
          created_at: string
          id: string
          name: string
          organization_id: string
          system_status:
            | Database["public"]["Enums"]["campaign_system_status"]
            | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          client_status?: Database["public"]["Enums"]["campaign_client_status"]
          created_at?: string
          id?: string
          name: string
          organization_id: string
          system_status?:
            | Database["public"]["Enums"]["campaign_system_status"]
            | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          client_status?: Database["public"]["Enums"]["campaign_client_status"]
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          system_status?:
            | Database["public"]["Enums"]["campaign_system_status"]
            | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_organization_memberships: {
        Row: {
          created_at: string
          id: string
          meta_organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meta_organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meta_organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_organization_memberships_meta_organization_id_fkey"
            columns: ["meta_organization_id"]
            isOneToOne: false
            referencedRelation: "meta_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_organizations: {
        Row: {
          created_at: string
          custom_domain: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          show_dummy_templates: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_domain?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          show_dummy_templates?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_domain?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          show_dummy_templates?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      organization_excel_settings: {
        Row: {
          allow_empty: boolean
          correct_year: boolean
          created_at: string
          field_name: string
          field_type: string
          id: string
          is_mandatory: boolean
          meta_organization_id: string | null
          organization_id: string | null
          regex_pattern: string | null
          updated_at: string
        }
        Insert: {
          allow_empty?: boolean
          correct_year?: boolean
          created_at?: string
          field_name?: string
          field_type: string
          id?: string
          is_mandatory?: boolean
          meta_organization_id?: string | null
          organization_id?: string | null
          regex_pattern?: string | null
          updated_at?: string
        }
        Update: {
          allow_empty?: boolean
          correct_year?: boolean
          created_at?: string
          field_name?: string
          field_type?: string
          id?: string
          is_mandatory?: boolean
          meta_organization_id?: string | null
          organization_id?: string | null
          regex_pattern?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_excel_settings_meta_organization_id_fkey"
            columns: ["meta_organization_id"]
            isOneToOne: false
            referencedRelation: "meta_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_excel_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          accent_color: string | null
          created_at: string
          favicon_url: string | null
          font_family: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          meta_organization_id: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          favicon_url?: string | null
          font_family?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          meta_organization_id?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          favicon_url?: string | null
          font_family?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          meta_organization_id?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_meta_organization_id_fkey"
            columns: ["meta_organization_id"]
            isOneToOne: false
            referencedRelation: "meta_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      get_user_meta_org_ids: { Args: { _user_id?: string }; Returns: string[] }
      get_user_org_ids: { Args: { _user_id?: string }; Returns: string[] }
      is_member_of_meta_org: {
        Args: { _meta_org_id: string; _user_id?: string }
        Returns: boolean
      }
      is_member_of_org: {
        Args: { _org_id: string; _user_id?: string }
        Returns: boolean
      }
      is_meta_org_admin: {
        Args: { _meta_org_id: string; _user_id?: string }
        Returns: boolean
      }
      is_org_admin: {
        Args: { _org_id: string; _user_id?: string }
        Returns: boolean
      }
      is_system_admin: { Args: { _user_id?: string }; Returns: boolean }
    }
    Enums: {
      app_role: "system_admin"
      campaign_client_status:
        | "none"
        | "concept_sent"
        | "concept_approved"
        | "working_on_creative"
        | "list_uploaded_for_renders"
        | "ready_for_internal_tests"
        | "ready_for_tests_with_client"
        | "list_uploaded_for_send"
        | "client_rejects"
        | "client_approved_send"
      campaign_system_status:
        | "list_successfully_loaded"
        | "rendering"
        | "ready_to_send"
        | "tests_done"
      org_role: "meta_org_admin" | "org_admin" | "user"
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
      app_role: ["system_admin"],
      campaign_client_status: [
        "none",
        "concept_sent",
        "concept_approved",
        "working_on_creative",
        "list_uploaded_for_renders",
        "ready_for_internal_tests",
        "ready_for_tests_with_client",
        "list_uploaded_for_send",
        "client_rejects",
        "client_approved_send",
      ],
      campaign_system_status: [
        "list_successfully_loaded",
        "rendering",
        "ready_to_send",
        "tests_done",
      ],
      org_role: ["meta_org_admin", "org_admin", "user"],
    },
  },
} as const
