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
          attribution_mode: string
          confirmations_required: number
          id: string
          memo_label: string | null
          minimum_deposit_amount: number
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
          attribution_mode?: string
          confirmations_required?: number
          id?: string
          memo_label?: string | null
          minimum_deposit_amount?: number
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
          attribution_mode?: string
          confirmations_required?: number
          id?: string
          memo_label?: string | null
          minimum_deposit_amount?: number
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
      crypto_deposit_address_pool: {
        Row: {
          address: string
          assigned_at: string | null
          assigned_instruction_id: string | null
          assigned_user_id: string | null
          created_at: string
          id: string
          payment_method_id: string
          status: string
          updated_at: string
        }
        Insert: {
          address: string
          assigned_at?: string | null
          assigned_instruction_id?: string | null
          assigned_user_id?: string | null
          created_at?: string
          id?: string
          payment_method_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string
          assigned_at?: string | null
          assigned_instruction_id?: string | null
          assigned_user_id?: string | null
          created_at?: string
          id?: string
          payment_method_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crypto_deposit_address_pool_assigned_instruction_id_fkey"
            columns: ["assigned_instruction_id"]
            isOneToOne: false
            referencedRelation: "crypto_deposit_instructions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crypto_deposit_address_pool_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crypto_deposit_address_pool_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "crypto_payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_deposit_events: {
        Row: {
          amount_asset: number | null
          amount_asset_symbol: string | null
          amount_usd: number | null
          blockchain_address: string
          confirmations: number
          created_at: string
          deposit_request_id: string | null
          event_status: string
          external_event_id: string | null
          id: string
          instruction_id: string | null
          memo_value: string | null
          payment_method_id: string | null
          processed_at: string | null
          provider_name: string | null
          raw_payload: Json
          tx_hash: string
          updated_at: string
        }
        Insert: {
          amount_asset?: number | null
          amount_asset_symbol?: string | null
          amount_usd?: number | null
          blockchain_address: string
          confirmations?: number
          created_at?: string
          deposit_request_id?: string | null
          event_status?: string
          external_event_id?: string | null
          id?: string
          instruction_id?: string | null
          memo_value?: string | null
          payment_method_id?: string | null
          processed_at?: string | null
          provider_name?: string | null
          raw_payload?: Json
          tx_hash: string
          updated_at?: string
        }
        Update: {
          amount_asset?: number | null
          amount_asset_symbol?: string | null
          amount_usd?: number | null
          blockchain_address?: string
          confirmations?: number
          created_at?: string
          deposit_request_id?: string | null
          event_status?: string
          external_event_id?: string | null
          id?: string
          instruction_id?: string | null
          memo_value?: string | null
          payment_method_id?: string | null
          processed_at?: string | null
          provider_name?: string | null
          raw_payload?: Json
          tx_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crypto_deposit_events_deposit_request_id_fkey"
            columns: ["deposit_request_id"]
            isOneToOne: false
            referencedRelation: "deposit_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crypto_deposit_events_instruction_id_fkey"
            columns: ["instruction_id"]
            isOneToOne: false
            referencedRelation: "crypto_deposit_instructions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crypto_deposit_events_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "crypto_payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_deposit_instructions: {
        Row: {
          created_at: string
          credited_at: string | null
          deposit_address: string
          deposit_request_id: string
          detected_amount_asset: number | null
          detected_amount_usd: number | null
          detected_asset_symbol: string | null
          detected_tx_hash: string | null
          expected_amount_usd: number
          id: string
          instruction_status: string
          memo_label: string | null
          memo_value: string | null
          observed_confirmations: number
          payment_method_id: string
          promo_bonus: number
          required_confirmations: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credited_at?: string | null
          deposit_address: string
          deposit_request_id: string
          detected_amount_asset?: number | null
          detected_amount_usd?: number | null
          detected_asset_symbol?: string | null
          detected_tx_hash?: string | null
          expected_amount_usd: number
          id?: string
          instruction_status?: string
          memo_label?: string | null
          memo_value?: string | null
          observed_confirmations?: number
          payment_method_id: string
          promo_bonus?: number
          required_confirmations?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credited_at?: string | null
          deposit_address?: string
          deposit_request_id?: string
          detected_amount_asset?: number | null
          detected_amount_usd?: number | null
          detected_asset_symbol?: string | null
          detected_tx_hash?: string | null
          expected_amount_usd?: number
          id?: string
          instruction_status?: string
          memo_label?: string | null
          memo_value?: string | null
          observed_confirmations?: number
          payment_method_id?: string
          promo_bonus?: number
          required_confirmations?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crypto_deposit_instructions_deposit_request_id_fkey"
            columns: ["deposit_request_id"]
            isOneToOne: true
            referencedRelation: "deposit_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crypto_deposit_instructions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "crypto_payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crypto_deposit_instructions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          referred_deposit_bonus_percent: number
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
          referred_deposit_bonus_percent?: number
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
          referred_deposit_bonus_percent?: number
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
      deposit_bonus_offers: {
        Row: {
          bonus_percent: number
          created_at: string
          deposit_amount: number
          description: string | null
          id: string
          maximum_bonus_amount: number | null
          maximum_deposit_amount: number | null
          minimum_deposit_amount: number | null
          position: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          bonus_percent: number
          created_at?: string
          deposit_amount: number
          description?: string | null
          id?: string
          maximum_bonus_amount?: number | null
          maximum_deposit_amount?: number | null
          minimum_deposit_amount?: number | null
          position?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          bonus_percent?: number
          created_at?: string
          deposit_amount?: number
          description?: string | null
          id?: string
          maximum_bonus_amount?: number | null
          maximum_deposit_amount?: number | null
          minimum_deposit_amount?: number | null
          position?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      deposit_bonus_redemptions: {
        Row: {
          bonus_amount: number
          bonus_offer_id: string
          created_at: string
          credited_at: string | null
          deposit_amount: number
          deposit_request_id: string
          id: string
          released_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bonus_amount?: number
          bonus_offer_id: string
          created_at?: string
          credited_at?: string | null
          deposit_amount: number
          deposit_request_id: string
          id?: string
          released_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bonus_amount?: number
          bonus_offer_id?: string
          created_at?: string
          credited_at?: string | null
          deposit_amount?: number
          deposit_request_id?: string
          id?: string
          released_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposit_bonus_redemptions_bonus_offer_id_fkey"
            columns: ["bonus_offer_id"]
            isOneToOne: false
            referencedRelation: "deposit_bonus_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_bonus_redemptions_deposit_request_id_fkey"
            columns: ["deposit_request_id"]
            isOneToOne: false
            referencedRelation: "deposit_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_bonus_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          bonus_offer_id: string | null
          created_at: string
          credited_amount: number | null
          deposit_bonus: number
          id: string
          method: string
          payment_method_id: string | null
          provider_amount: number | null
          provider_callback_received_at: string | null
          provider_channel: string | null
          provider_checkout_id: string | null
          provider_currency: string | null
          provider_name: string | null
          provider_payload: Json
          provider_phone_number: string | null
          provider_request_id: string | null
          provider_result_code: string | null
          provider_result_desc: string | null
          provider_status: string | null
          provider_transaction_ref: string | null
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
          bonus_offer_id?: string | null
          created_at?: string
          credited_amount?: number | null
          deposit_bonus?: number
          id?: string
          method: string
          payment_method_id?: string | null
          provider_amount?: number | null
          provider_callback_received_at?: string | null
          provider_channel?: string | null
          provider_checkout_id?: string | null
          provider_currency?: string | null
          provider_name?: string | null
          provider_payload?: Json
          provider_phone_number?: string | null
          provider_request_id?: string | null
          provider_result_code?: string | null
          provider_result_desc?: string | null
          provider_status?: string | null
          provider_transaction_ref?: string | null
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
          bonus_offer_id?: string | null
          created_at?: string
          credited_amount?: number | null
          deposit_bonus?: number
          id?: string
          method?: string
          payment_method_id?: string | null
          provider_amount?: number | null
          provider_callback_received_at?: string | null
          provider_channel?: string | null
          provider_checkout_id?: string | null
          provider_currency?: string | null
          provider_name?: string | null
          provider_payload?: Json
          provider_phone_number?: string | null
          provider_request_id?: string | null
          provider_result_code?: string | null
          provider_result_desc?: string | null
          provider_status?: string | null
          provider_transaction_ref?: string | null
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
            foreignKeyName: "deposit_requests_bonus_offer_id_fkey"
            columns: ["bonus_offer_id"]
            isOneToOne: false
            referencedRelation: "deposit_bonus_offers"
            referencedColumns: ["id"]
          },
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
          mpesa_withdrawal_approval_threshold_kes: number
          require_kyc_withdrawal: boolean
          strict_password: boolean
          welcome_bonus_pct: number
          referral_commission_pct: number
          logo_url: string | null
          logo_url_light: string | null
          logo_url_dark: string | null
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
          mpesa_withdrawal_approval_threshold_kes?: number
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
          mpesa_withdrawal_approval_threshold_kes?: number
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
      referral_commissions: {
        Row: {
          id: string
          referrer_id: string
          referred_user_id: string
          deposit_request_id: string | null
          deposit_amount: number
          commission_rate: number
          commission_amount: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_user_id: string
          deposit_request_id?: string | null
          deposit_amount?: number
          commission_rate?: number
          commission_amount?: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          referrer_id?: string
          referred_user_id?: string
          deposit_request_id?: string | null
          deposit_amount?: number
          commission_rate?: number
          commission_amount?: number
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_referral_commissions_referrer"
            columns: ["referrer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_referral_commissions_referred"
            columns: ["referred_user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_referral_commissions_deposit"
            columns: ["deposit_request_id"]
            referencedRelation: "deposit_requests"
            referencedColumns: ["id"]
          }
        ]
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
            followers_count: number
            following_count: number
            id: string
            nationality: string | null
            phone_country: string | null
            phone_country_code: string | null
          kyc_documents: Json | null
          kyc_status: string | null
          referral_code: string
          referral_earnings: number
          referred_by: string | null
          reserved_withdrawal_balance: number
          social_trading_disabled: boolean
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
            followers_count?: number
            following_count?: number
            id: string
            nationality?: string | null
            phone_country?: string | null
            phone_country_code?: string | null
          kyc_documents?: Json | null
          kyc_status?: string | null
          referral_code?: string
          referral_earnings?: number
          referred_by?: string | null
          reserved_withdrawal_balance?: number
          social_trading_disabled?: boolean
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
            followers_count?: number
            following_count?: number
            id?: string
            nationality?: string | null
            phone_country?: string | null
            phone_country_code?: string | null
          kyc_documents?: Json | null
          kyc_status?: string | null
          referral_code?: string
          referral_earnings?: number
          referred_by?: string | null
          reserved_withdrawal_balance?: number
          social_trading_disabled?: boolean
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
          number_of_winners: number
          prize_distribution: Array<{ position: number; share: number; label?: string }> | null
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
          number_of_winners?: number
          prize_distribution?: Array<{ position: number; share: number; label?: string }> | null
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
          number_of_winners?: number
          prize_distribution?: Array<{ position: number; share: number; label?: string }> | null
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
          copied_from_user_id: string | null
          copy_setting_id: string | null
          direction: string
          entry_price: number
          exit_price: number | null
          expiry_seconds: number
          id: string
          opened_at: string
          payout_rate: number
          profit: number | null
          source_trade_id: string | null
          status: string
          trade_context: string
          tournament_participant_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          asset_symbol: string
          closed_at?: string | null
          copied_from_user_id?: string | null
          copy_setting_id?: string | null
          direction: string
          entry_price: number
          exit_price?: number | null
          expiry_seconds: number
          id?: string
          opened_at?: string
          payout_rate?: number
          profit?: number | null
          source_trade_id?: string | null
          status?: string
          trade_context?: string
          tournament_participant_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          asset_symbol?: string
          closed_at?: string | null
          copied_from_user_id?: string | null
          copy_setting_id?: string | null
          direction?: string
          entry_price?: number
          exit_price?: number | null
          expiry_seconds?: number
          id?: string
          opened_at?: string
          payout_rate?: number
          profit?: number | null
          source_trade_id?: string | null
          status?: string
          trade_context?: string
          tournament_participant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_copy_setting_id_fkey"
            columns: ["copy_setting_id"]
            isOneToOne: false
            referencedRelation: "copy_settings"
            referencedColumns: ["id"]
          },
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
          approval_required: boolean
          approval_threshold_kes: number | null
          approved_at: string | null
          approved_by: string | null
          auto_approved: boolean
          audit_log: Json
          completed_at: string | null
          created_at: string
          destination: string
          failed_at: string | null
          failure_reason: string | null
          id: string
          last_processing_error: string | null
          merchant_ref: string | null
          method: string
          next_retry_at: string
          processing_attempts: number
          processing_started_at: string | null
          provider_amount: number | null
          provider_callback_received_at: string | null
          provider_channel: string | null
          provider_checkout_id: string | null
          provider_currency: string | null
          provider_name: string | null
          provider_payload: Json
          provider_phone_number: string | null
          provider_request_id: string | null
          provider_result_code: string | null
          provider_result_desc: string | null
          provider_status: string | null
          provider_transaction_ref: string | null
          processed_at: string | null
          processed_by: string | null
          queued_at: string | null
          rejected_at: string | null
          request_ip: string | null
          request_user_agent: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          approval_required?: boolean
          approval_threshold_kes?: number | null
          approved_at?: string | null
          approved_by?: string | null
          auto_approved?: boolean
          audit_log?: Json
          completed_at?: string | null
          created_at?: string
          destination: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          last_processing_error?: string | null
          merchant_ref?: string | null
          method: string
          next_retry_at?: string
          processing_attempts?: number
          processing_started_at?: string | null
          provider_amount?: number | null
          provider_callback_received_at?: string | null
          provider_channel?: string | null
          provider_checkout_id?: string | null
          provider_currency?: string | null
          provider_name?: string | null
          provider_payload?: Json
          provider_phone_number?: string | null
          provider_request_id?: string | null
          provider_result_code?: string | null
          provider_result_desc?: string | null
          provider_status?: string | null
          provider_transaction_ref?: string | null
          processed_at?: string | null
          processed_by?: string | null
          queued_at?: string | null
          rejected_at?: string | null
          request_ip?: string | null
          request_user_agent?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          approval_required?: boolean
          approval_threshold_kes?: number | null
          approved_at?: string | null
          approved_by?: string | null
          auto_approved?: boolean
          audit_log?: Json
          completed_at?: string | null
          created_at?: string
          destination?: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          last_processing_error?: string | null
          merchant_ref?: string | null
          method?: string
          next_retry_at?: string
          processing_attempts?: number
          processing_started_at?: string | null
          provider_amount?: number | null
          provider_callback_received_at?: string | null
          provider_channel?: string | null
          provider_checkout_id?: string | null
          provider_currency?: string | null
          provider_name?: string | null
          provider_payload?: Json
          provider_phone_number?: string | null
          provider_request_id?: string | null
          provider_result_code?: string | null
          provider_result_desc?: string | null
          provider_status?: string | null
          provider_transaction_ref?: string | null
          processed_at?: string | null
          processed_by?: string | null
          queued_at?: string | null
          rejected_at?: string | null
          request_ip?: string | null
          request_user_agent?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      admin_delete_announcement: {
        Args: {
          p_announcement_id: string
          p_delete_dispatched_notifications?: boolean
        }
        Returns: Json
      }
      admin_update_announcement: {
        Args: {
          p_announcement_id: string
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
      admin_review_mobile_money_withdrawal: {
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
      create_crypto_deposit_instruction: {
        Args: {
          p_amount: number
          p_payment_method_id: string
          p_promo_id?: string | null
        }
        Returns: Json
      }
      cancel_withdrawal: {
        Args: {
          p_request_id: string
        }
        Returns: Json
      }
      claim_mobile_money_withdrawal: {
        Args: {
          p_request_id?: string | null
        }
        Returns: Json
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
      get_available_deposit_bonus_offers: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_reservation: boolean
          already_used: boolean
          bonus_amount: number
          bonus_percent: number
          deposit_amount: number
          description: string | null
          eligible: boolean
          id: string
          is_new_user: boolean
          maximum_bonus_amount: number | null
          maximum_deposit_amount: number | null
          minimum_deposit_amount: number | null
          monthly_locked: boolean
          position: number
          reason: string | null
          status: string
          title: string
        }[]
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
      process_crypto_deposit_detection: {
        Args: {
          p_address: string
          p_amount_asset?: number | null
          p_amount_asset_symbol?: string | null
          p_amount_usd?: number | null
          p_confirmations?: number
          p_event_status?: string | null
          p_external_event_id?: string | null
          p_memo_value?: string | null
          p_payment_method_id?: string | null
          p_provider_name?: string | null
          p_raw_payload?: Json
          p_tx_hash: string
        }
        Returns: Json
      }
      process_mobile_money_deposit_callback: {
        Args: {
          p_provider_amount?: number | null
          p_provider_channel?: string | null
          p_provider_checkout_id?: string | null
          p_provider_currency?: string | null
          p_provider_name?: string | null
          p_provider_payload?: Json
          p_provider_phone_number?: string | null
          p_provider_request_id?: string | null
          p_provider_result_code?: string | null
          p_provider_result_desc?: string | null
          p_provider_transaction_ref?: string | null
          p_request_id?: string | null
        }
        Returns: Json
      }
      process_mobile_money_withdrawal_callback: {
        Args: {
          p_provider_amount?: number | null
          p_provider_channel?: string | null
          p_provider_checkout_id?: string | null
          p_provider_currency?: string | null
          p_provider_name?: string | null
          p_provider_payload?: Json
          p_provider_phone_number?: string | null
          p_provider_request_id?: string | null
          p_provider_result_code?: string | null
          p_provider_result_desc?: string | null
          p_provider_transaction_ref?: string | null
          p_request_id?: string | null
        }
        Returns: Json
      }
      request_mobile_money_withdrawal: {
        Args: {
          p_amount: number
          p_amount_kes: number
          p_phone_number: string
          p_provider_channel?: string | null
          p_request_ip?: string | null
          p_request_user_agent?: string | null
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
      update_mobile_money_withdrawal_dispatch_state: {
        Args: {
          p_failure_reason?: string | null
          p_next_retry_at?: string | null
          p_next_status: string
          p_provider_payload?: Json
          p_provider_result_code?: string | null
          p_provider_result_desc?: string | null
          p_request_id: string
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
        send_email_verification_code: {
          Args: Record<PropertyKey, never>
          Returns: Json
        }
        revoke_staff_role: {
          Args: {
            p_user_id: string
          }
          Returns: Json
        }
        verify_email_with_code: {
          Args: {
            p_code: string
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
