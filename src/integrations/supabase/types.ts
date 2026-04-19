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
      crypto_payment_methods: {
        Row: {
          id: string
          coin_name: string
          symbol: string
          network: string
          wallet_address: string | null
          qr_code_url: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coin_name: string
          symbol: string
          network: string
          wallet_address?: string | null
          qr_code_url?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coin_name?: string
          symbol?: string
          network?: string
          wallet_address?: string | null
          qr_code_url?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      assets_config: {
        Row: {
          id: string
          symbol: string
          name: string
          category: string
          status: string
          min_trade: number
          max_trade: number
          payout_pct: number
          spread: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          symbol: string
          name: string
          category: string
          status?: string
          min_trade?: number
          max_trade?: number
          payout_pct?: number
          spread?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          symbol?: string
          name?: string
          category?: string
          status?: string
          min_trade?: number
          max_trade?: number
          payout_pct?: number
          spread?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          link_url: string | null
          message: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          target_roles: Json
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          link_url?: string | null
          message: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          target_roles?: Json
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          link_url?: string | null
          message?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          target_roles?: Json
          title?: string
        }
        Relationships: []
      }
      bonus_settings: {
        Row: {
          created_at: string
          deposit_bonus_enabled: boolean
          deposit_bonus_max: number
          deposit_bonus_min: number
          deposit_bonus_percent: number
          id: string
          referral_commission_enabled: boolean
          referral_commission_payout_timing: string
          referral_commission_percent: number
          referral_commission_type: string
          updated_at: string
          welcome_bonus_amount: number
          welcome_bonus_enabled: boolean
          welcome_bonus_trigger: string
        }
        Insert: {
          created_at?: string
          deposit_bonus_enabled?: boolean
          deposit_bonus_max?: number
          deposit_bonus_min?: number
          deposit_bonus_percent?: number
          id?: string
          referral_commission_enabled?: boolean
          referral_commission_payout_timing?: string
          referral_commission_percent?: number
          referral_commission_type?: string
          updated_at?: string
          welcome_bonus_amount?: number
          welcome_bonus_enabled?: boolean
          welcome_bonus_trigger?: string
        }
        Update: {
          created_at?: string
          deposit_bonus_enabled?: boolean
          deposit_bonus_max?: number
          deposit_bonus_min?: number
          deposit_bonus_percent?: number
          id?: string
          referral_commission_enabled?: boolean
          referral_commission_payout_timing?: string
          referral_commission_percent?: number
          referral_commission_type?: string
          updated_at?: string
          welcome_bonus_amount?: number
          welcome_bonus_enabled?: boolean
          welcome_bonus_trigger?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json
          expires_at: string | null
          external_key: string | null
          id: string
          is_read: boolean
          link_url: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          expires_at?: string | null
          external_key?: string | null
          id?: string
          is_read?: boolean
          link_url?: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          expires_at?: string | null
          external_key?: string | null
          id?: string
          is_read?: boolean
          link_url?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      deposit_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          credited_amount: number | null
          deposit_bonus: number
          id: string
          method: string
          payment_method_id: string | null
          processed_at: string | null
          processed_by: string | null
          promo_bonus: number
          promo_id: string | null
          referral_commission: number
          status: string
          tx_hash: string | null
          updated_at: string
          user_id: string
          welcome_bonus: number
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          credited_amount?: number | null
          deposit_bonus?: number
          id?: string
          method: string
          payment_method_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          promo_bonus?: number
          promo_id?: string | null
          referral_commission?: number
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id: string
          welcome_bonus?: number
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          credited_amount?: number | null
          deposit_bonus?: number
          id?: string
          method?: string
          payment_method_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          promo_bonus?: number
          promo_id?: string | null
          referral_commission?: number
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
          welcome_bonus?: number
        }
        Relationships: [
          {
            foreignKeyName: "deposit_requests_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "crypto_payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_requests_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          platform_name: string
          support_email: string
          timezone: string
          min_trade_amount: number
          max_trade_amount: number
          enforce_max_exposure: boolean
          enforce_2fa: boolean
          require_kyc_withdrawal: boolean
          strict_password: boolean
          welcome_bonus_pct: number
          referral_commission_pct: number
          logo_url: string | null
          favicon_url: string | null
          chart_up_color: string
          chart_down_color: string
          chart_bg_color: string
          site_title: string
          meta_description: string
          meta_keywords: string
          og_title: string
          og_description: string
          og_image_url: string
          twitter_card_type: string
          twitter_title: string
          twitter_description: string
          twitter_image_url: string
            canonical_url: string
            robots_directive: string
            custom_meta_tags: string
            website_content: string
            created_at: string
            updated_at: string
        }
        Insert: {
          id?: string
          platform_name?: string
          support_email?: string
          timezone?: string
          min_trade_amount?: number
          max_trade_amount?: number
          enforce_max_exposure?: boolean
          enforce_2fa?: boolean
          require_kyc_withdrawal?: boolean
          strict_password?: boolean
          welcome_bonus_pct?: number
          referral_commission_pct?: number
          logo_url?: string | null
          favicon_url?: string | null
          chart_up_color?: string
          chart_down_color?: string
          chart_bg_color?: string
          site_title?: string
          meta_description?: string
          meta_keywords?: string
          og_title?: string
          og_description?: string
          og_image_url?: string
          twitter_card_type?: string
          twitter_title?: string
          twitter_description?: string
          twitter_image_url?: string
            canonical_url?: string
            robots_directive?: string
            custom_meta_tags?: string
            website_content?: string
            created_at?: string
            updated_at?: string
        }
        Update: {
          id?: string
          platform_name?: string
          support_email?: string
          timezone?: string
          min_trade_amount?: number
          max_trade_amount?: number
          enforce_max_exposure?: boolean
          enforce_2fa?: boolean
          require_kyc_withdrawal?: boolean
          strict_password?: boolean
          welcome_bonus_pct?: number
          referral_commission_pct?: number
          logo_url?: string | null
          favicon_url?: string | null
          chart_up_color?: string
          chart_down_color?: string
          chart_bg_color?: string
          site_title?: string
          meta_description?: string
          meta_keywords?: string
          og_title?: string
          og_description?: string
          og_image_url?: string
          twitter_card_type?: string
          twitter_title?: string
          twitter_description?: string
          twitter_image_url?: string
            canonical_url?: string
            robots_directive?: string
            custom_meta_tags?: string
            website_content?: string
            created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          id: string
          code: string
          type: string
          reward_value: string
          usages: number
          max_usages: number
          expiry_date: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          type: string
          reward_value: string
          usages?: number
          max_usages?: number
          expiry_date: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          type?: string
          reward_value?: string
          usages?: number
          max_usages?: number
          expiry_date?: string
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_name?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_name?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_id: string
          sender_name: string
          sender_role: string
          thread_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_id: string
          sender_name?: string
          sender_role?: string
          thread_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          sender_name?: string
          sender_role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "support_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      support_threads: {
        Row: {
          assigned_role: Database["public"]["Enums"]["app_role"] | null
          category: string
          created_at: string
          id: string
          last_message_at: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_role?: Database["public"]["Enums"]["app_role"] | null
          category?: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_role?: Database["public"]["Enums"]["app_role"] | null
          category?: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          message: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
        profiles: {
          Row: {
            avatar_url: string | null
            balance: number
          created_at: string
          display_name: string | null
          id: string
          kyc_documents: Json | null
          kyc_status: string | null
          referral_code: string
          referral_earnings: number
          referred_by: string | null
          total_deposit: number
          total_profit: number
          total_trade_volume_30d: number
          total_trades: number
          total_wins: number
          updated_at: string
          username: string | null
          trade_count_30d: number
          vip_tier: string | null
          vip_tier_override: string | null
          welcome_bonus_granted_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          balance?: number
          created_at?: string
          display_name?: string | null
          id: string
          kyc_documents?: Json | null
          kyc_status?: string | null
          referral_code?: string
          referral_earnings?: number
          referred_by?: string | null
          total_deposit?: number
          total_profit?: number
          total_trade_volume_30d?: number
          total_trades?: number
          total_wins?: number
          updated_at?: string
          username?: string | null
          trade_count_30d?: number
          vip_tier?: string | null
          vip_tier_override?: string | null
          welcome_bonus_granted_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          balance?: number
          created_at?: string
          display_name?: string | null
          id?: string
          kyc_documents?: Json | null
          kyc_status?: string | null
          referral_code?: string
          referral_earnings?: number
          referred_by?: string | null
          total_deposit?: number
          total_profit?: number
          total_trade_volume_30d?: number
          total_trades?: number
          total_wins?: number
          updated_at?: string
          username?: string | null
          trade_count_30d?: number
          vip_tier?: string | null
          vip_tier_override?: string | null
          welcome_bonus_granted_at?: string | null
        }
        Relationships: []
      }
      tournaments: {
        Row: {
          id: string
          title: string
          description: string | null
          entry_fee: number
          rebuy_cost: number
          prize_pool: number
          starting_balance: number
          start_date: string
          end_date: string
          status: Database["public"]["Enums"]["tournament_status"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          entry_fee?: number
          rebuy_cost?: number
          prize_pool?: number
          starting_balance?: number
          start_date: string
          end_date: string
          status?: Database["public"]["Enums"]["tournament_status"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          entry_fee?: number
          rebuy_cost?: number
          prize_pool?: number
          starting_balance?: number
          start_date?: string
          end_date?: string
          status?: Database["public"]["Enums"]["tournament_status"]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tournament_participants: {
        Row: {
          id: string
          tournament_id: string
          user_id: string
          current_balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          user_id: string
          current_balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          user_id?: string
          current_balance?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      trades: {
        Row: {
          amount: number
          asset_symbol: string
          closed_at: string | null
          direction: string
          entry_price: number
          exit_price: number | null
          expiry_seconds: number
          id: string
          opened_at: string
          payout_rate: number
          profit: number | null
          status: string
          tournament_participant_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          asset_symbol: string
          closed_at?: string | null
          direction: string
          entry_price: number
          exit_price?: number | null
          expiry_seconds: number
          id?: string
          opened_at?: string
          payout_rate?: number
          profit?: number | null
          status?: string
          tournament_participant_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          asset_symbol?: string
          closed_at?: string | null
          direction?: string
          entry_price?: number
          exit_price?: number | null
          expiry_seconds?: number
          id?: string
          opened_at?: string
          payout_rate?: number
          profit?: number | null
          status?: string
          tournament_participant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_tournament_participant_id_fkey"
            columns: ["tournament_participant_id"]
            isOneToOne: false
            referencedRelation: "tournament_participants"
            referencedColumns: ["id"]
          }
        ]
      }
      withdrawal_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          destination: string
          id: string
          method: string
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          destination: string
          id?: string
          method: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          destination?: string
          id?: string
          method?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
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
          role: Database["public"]["Enums"]["app_role"]
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
      admin_create_announcement: {
        Args: {
          p_expires_at?: string | null
          p_link_url?: string | null
          p_message: string
          p_scheduled_at?: string | null
          p_target_roles?: Json
          p_title: string
        }
        Returns: string
      }
      admin_update_withdrawal_status: {
        Args: {
          p_admin_note?: string | null
          p_request_id: string
          p_status: string
        }
        Returns: Json
      }
      admin_update_deposit_status: {
        Args: {
          p_admin_note?: string | null
          p_request_id: string
          p_status: string
        }
        Returns: Json
      }
      assign_staff_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: Json
      }
      create_notification_internal: {
        Args: {
          p_data?: Json
          p_expires_at?: string | null
          p_external_key?: string | null
          p_link_url?: string | null
          p_message: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      dispatch_due_announcements: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      dispatch_announcement_internal: {
        Args: {
          p_announcement_id: string
        }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: {
        Args: {
          _user_id: string
        }
        Returns: boolean
      }
      process_deposit_checkout: {
        Args: {
          p_amount: number
          p_method?: string
          p_promo_id?: string | null
        }
        Returns: Json
      }
      process_deposit_event: {
        Args: {
          p_amount: number
          p_method?: string
          p_promo_bonus?: number
        }
        Returns: Json
      }
      process_trade_referral_commission: {
        Args: {
          p_event: string
          p_trade_id: string
        }
        Returns: number
      }
      request_withdrawal: {
        Args: {
          p_amount: number
          p_destination: string
          p_method: string
        }
        Returns: Json
      }
      request_deposit_review: {
        Args: {
          p_amount: number
          p_method: string
          p_payment_method_id?: string | null
          p_promo_id?: string | null
          p_tx_hash?: string | null
        }
        Returns: Json
      }
      revoke_staff_role: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "auditor"
        | "content_marketing_manager"
        | "finance_manager"
        | "moderator"
        | "support_agent"
        | "trade_risk_manager"
        | "user"
      tournament_status: "upcoming" | "active" | "completed" | "cancelled"
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
      app_role: [
        "admin",
        "auditor",
        "content_marketing_manager",
        "finance_manager",
        "moderator",
        "support_agent",
        "trade_risk_manager",
        "user",
      ],
    },
  },
} as const
