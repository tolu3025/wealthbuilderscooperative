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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      blog_posts: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          excerpt: string | null
          id: string
          image_url: string | null
          published: boolean | null
          show_as_banner: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published?: boolean | null
          show_as_banner?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published?: boolean | null
          show_as_banner?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_settlements: {
        Row: {
          created_at: string | null
          id: string
          referral_count: number | null
          settled_at: string | null
          settled_by: string | null
          settlement_month: string
          state: string | null
          state_rep_commission: number | null
          status: string | null
          total_referral_commission: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referral_count?: number | null
          settled_at?: string | null
          settled_by?: string | null
          settlement_month: string
          state?: string | null
          state_rep_commission?: number | null
          status?: string | null
          total_referral_commission?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referral_count?: number | null
          settled_at?: string | null
          settled_by?: string | null
          settlement_month?: string
          state?: string | null
          state_rep_commission?: number | null
          status?: string | null
          total_referral_commission?: number | null
        }
        Relationships: []
      }
      commissions: {
        Row: {
          amount: number
          commission_type: string | null
          created_at: string | null
          id: string
          invited_member_id: string
          member_id: string
          status: string | null
        }
        Insert: {
          amount: number
          commission_type?: string | null
          created_at?: string | null
          id?: string
          invited_member_id: string
          member_id: string
          status?: string | null
        }
        Update: {
          amount?: number
          commission_type?: string | null
          created_at?: string | null
          id?: string
          invited_member_id?: string
          member_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_invited_member_id_fkey"
            columns: ["invited_member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      contributions: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          breakdown_type: string | null
          capital_amount: number
          contribution_month: string | null
          created_at: string | null
          id: string
          member_id: string
          payment_date: string | null
          payment_status: string | null
          project_support_amount: number
          receipt_url: string | null
          savings_amount: number
          settlement_month: string | null
          settlement_status: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          breakdown_type?: string | null
          capital_amount: number
          contribution_month?: string | null
          created_at?: string | null
          id?: string
          member_id: string
          payment_date?: string | null
          payment_status?: string | null
          project_support_amount: number
          receipt_url?: string | null
          savings_amount: number
          settlement_month?: string | null
          settlement_status?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          breakdown_type?: string | null
          capital_amount?: number
          contribution_month?: string | null
          created_at?: string | null
          id?: string
          member_id?: string
          payment_date?: string | null
          payment_status?: string | null
          project_support_amount?: number
          receipt_url?: string | null
          savings_amount?: number
          settlement_month?: string | null
          settlement_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contributions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      director_assignments: {
        Row: {
          assigned_date: string
          created_at: string
          director_profile_id: string
          id: string
          state: string | null
        }
        Insert: {
          assigned_date?: string
          created_at?: string
          director_profile_id: string
          id?: string
          state?: string | null
        }
        Update: {
          assigned_date?: string
          created_at?: string
          director_profile_id?: string
          id?: string
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "director_assignments_director_profile_id_fkey"
            columns: ["director_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dismissed_announcements: {
        Row: {
          blog_post_id: string
          dismissed_at: string
          id: string
          user_id: string
        }
        Insert: {
          blog_post_id: string
          dismissed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          blog_post_id?: string
          dismissed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dismissed_announcements_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      dividend_distributions: {
        Row: {
          created_at: string | null
          created_by: string | null
          distribution_date: string | null
          eligible_members_count: number
          id: string
          property_id: string | null
          status: string | null
          total_capital_pool: number
          total_profit: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          distribution_date?: string | null
          eligible_members_count: number
          id?: string
          property_id?: string | null
          status?: string | null
          total_capital_pool: number
          total_profit: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          distribution_date?: string | null
          eligible_members_count?: number
          id?: string
          property_id?: string | null
          status?: string | null
          total_capital_pool?: number
          total_profit?: number
        }
        Relationships: [
          {
            foreignKeyName: "dividend_distributions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      dividends: {
        Row: {
          amount: number
          created_at: string | null
          distribution_date: string | null
          distribution_id: string | null
          dividend_percentage: number | null
          id: string
          member_capital_at_distribution: number | null
          member_id: string
          property_name: string | null
          status: string | null
          total_profit: number | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          distribution_date?: string | null
          distribution_id?: string | null
          dividend_percentage?: number | null
          id?: string
          member_capital_at_distribution?: number | null
          member_id: string
          property_name?: string | null
          status?: string | null
          total_profit?: number | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          distribution_date?: string | null
          distribution_id?: string | null
          dividend_percentage?: number | null
          id?: string
          member_capital_at_distribution?: number | null
          member_id?: string
          property_name?: string | null
          status?: string | null
          total_profit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dividends_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_allocations: {
        Row: {
          allocation_type: string
          amount: number
          created_at: string
          id: string
          registration_id: string | null
          settled_at: string | null
          settled_by: string | null
          settlement_month: string
          status: string | null
        }
        Insert: {
          allocation_type: string
          amount: number
          created_at?: string
          id?: string
          registration_id?: string | null
          settled_at?: string | null
          settled_by?: string | null
          settlement_month: string
          status?: string | null
        }
        Update: {
          allocation_type?: string
          amount?: number
          created_at?: string
          id?: string
          registration_id?: string | null
          settled_at?: string | null
          settled_by?: string | null
          settlement_month?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_allocations_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registration_fees"
            referencedColumns: ["id"]
          },
        ]
      }
      member_balances: {
        Row: {
          created_at: string
          eligible_for_dividend: boolean
          eligible_for_withdrawal: boolean
          id: string
          last_contribution_date: string | null
          member_id: string
          months_contributed: number
          total_capital: number
          total_project_support: number
          total_savings: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          eligible_for_dividend?: boolean
          eligible_for_withdrawal?: boolean
          id?: string
          last_contribution_date?: string | null
          member_id: string
          months_contributed?: number
          total_capital?: number
          total_project_support?: number
          total_savings?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          eligible_for_dividend?: boolean
          eligible_for_withdrawal?: boolean
          id?: string
          last_contribution_date?: string | null
          member_id?: string
          months_contributed?: number
          total_capital?: number
          total_project_support?: number
          total_savings?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_balances_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_settlements: {
        Row: {
          broad_sheet_data: Json | null
          created_at: string
          id: string
          settled_at: string | null
          settled_by: string | null
          settlement_month: string
          status: string | null
          total_allocated: number | null
          total_contributions: number | null
          total_registrations: number | null
        }
        Insert: {
          broad_sheet_data?: Json | null
          created_at?: string
          id?: string
          settled_at?: string | null
          settled_by?: string | null
          settlement_month: string
          status?: string | null
          total_allocated?: number | null
          total_contributions?: number | null
          total_registrations?: number | null
        }
        Update: {
          broad_sheet_data?: Json | null
          created_at?: string
          id?: string
          settled_at?: string | null
          settled_by?: string | null
          settlement_month?: string
          status?: string | null
          total_allocated?: number | null
          total_contributions?: number | null
          total_registrations?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_enrollments: {
        Row: {
          enrolled_at: string
          id: string
          member_id: string
          plan_id: string
          status: string
        }
        Insert: {
          enrolled_at?: string
          id?: string
          member_id: string
          plan_id: string
          status?: string
        }
        Update: {
          enrolled_at?: string
          id?: string
          member_id?: string
          plan_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_enrollments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_enrollments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "property_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          breakdown_type: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          invite_code: string | null
          invited_by: string | null
          last_name: string
          member_number: string | null
          phone: string | null
          registration_pin: string | null
          registration_status: string | null
          state: string | null
          state_rep_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          breakdown_type?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          invite_code?: string | null
          invited_by?: string | null
          last_name: string
          member_number?: string | null
          phone?: string | null
          registration_pin?: string | null
          registration_status?: string | null
          state?: string | null
          state_rep_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          breakdown_type?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          invite_code?: string | null
          invited_by?: string | null
          last_name?: string
          member_number?: string | null
          phone?: string | null
          registration_pin?: string | null
          registration_status?: string | null
          state?: string | null
          state_rep_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_state_rep_id_fkey"
            columns: ["state_rep_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          created_at: string | null
          current_value: number | null
          description: string | null
          id: string
          image_url: string | null
          location: string | null
          name: string
          purchase_price: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          name: string
          purchase_price?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          name?: string
          purchase_price?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      property_plans: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          plan_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          name: string
          plan_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          plan_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      registration_fees: {
        Row: {
          app_maintenance_share: number
          chairman_share: number
          coop_office_share: number
          corporator_office_share: number
          created_at: string | null
          directors_share: number
          id: string
          member_id: string
          payment_date: string | null
          payment_receipt_url: string | null
          settlement_month: string | null
          settlement_status: string | null
          status: string | null
          total_amount: number
        }
        Insert: {
          app_maintenance_share?: number
          chairman_share?: number
          coop_office_share?: number
          corporator_office_share?: number
          created_at?: string | null
          directors_share?: number
          id?: string
          member_id: string
          payment_date?: string | null
          payment_receipt_url?: string | null
          settlement_month?: string | null
          settlement_status?: string | null
          status?: string | null
          total_amount?: number
        }
        Update: {
          app_maintenance_share?: number
          chairman_share?: number
          coop_office_share?: number
          corporator_office_share?: number
          created_at?: string | null
          directors_share?: number
          id?: string
          member_id?: string
          payment_date?: string | null
          payment_receipt_url?: string | null
          settlement_month?: string | null
          settlement_status?: string | null
          status?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "registration_fees_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      state_representatives: {
        Row: {
          assigned_date: string | null
          created_at: string | null
          id: string
          rep_profile_id: string | null
          state: string
          whatsapp_number: string | null
        }
        Insert: {
          assigned_date?: string | null
          created_at?: string | null
          id?: string
          rep_profile_id?: string | null
          state: string
          whatsapp_number?: string | null
        }
        Update: {
          assigned_date?: string | null
          created_at?: string | null
          id?: string
          rep_profile_id?: string | null
          state?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "state_representatives_rep_profile_id_fkey"
            columns: ["rep_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          account_name: string
          account_number: string
          amount: number
          bank_name: string
          created_at: string | null
          id: string
          member_id: string
          processed_at: string | null
          processed_by: string | null
          requested_at: string | null
          status: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          amount: number
          bank_name: string
          created_at?: string | null
          id?: string
          member_id: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string | null
          status?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          amount?: number
          bank_name?: string
          created_at?: string | null
          id?: string
          member_id?: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_dividend_eligibility: {
        Args: { p_member_id: string }
        Returns: boolean
      }
      generate_invite_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_member_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_pin: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "state_rep" | "member" | "director"
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
      app_role: ["admin", "state_rep", "member", "director"],
    },
  },
} as const
