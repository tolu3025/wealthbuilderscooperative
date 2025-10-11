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
      app_role: "admin" | "state_rep" | "member"
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
      app_role: ["admin", "state_rep", "member"],
    },
  },
} as const
