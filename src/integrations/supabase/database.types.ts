 
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
      build_parts: {
        Row: {
          base_cost: number
          base_yield_per_hour: number
          created_at: string
          description: string | null
          icon: string
          id: string
          name: string
          part_number: number
          stage: number
        }
        Insert: {
          base_cost: number
          base_yield_per_hour: number
          created_at?: string
          description?: string | null
          icon: string
          id: string
          name: string
          part_number: number
          stage: number
        }
        Update: {
          base_cost?: number
          base_yield_per_hour?: number
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
          part_number?: number
          stage?: number
        }
        Relationships: []
      }
      conversion_history: {
        Row: {
          amount_in: number
          amount_out: number
          bonus_percent: number | null
          conversion_type: string
          created_at: string | null
          id: string
          telegram_id: number
          tier_at_conversion: string | null
        }
        Insert: {
          amount_in: number
          amount_out: number
          bonus_percent?: number | null
          conversion_type: string
          created_at?: string | null
          id?: string
          telegram_id: number
          tier_at_conversion?: string | null
        }
        Update: {
          amount_in?: number
          amount_out?: number
          bonus_percent?: number | null
          conversion_type?: string
          created_at?: string | null
          id?: string
          telegram_id?: number
          tier_at_conversion?: string | null
        }
        Relationships: []
      }
      daily_rewards: {
        Row: {
          day: number
          description: string
          reward_amount: number
          reward_type: string
        }
        Insert: {
          day: number
          description: string
          reward_amount: number
          reward_type: string
        }
        Update: {
          day?: number
          description?: string
          reward_amount?: number
          reward_type?: string
        }
        Relationships: []
      }
      hardware_devices: {
        Row: {
          claimed_at: string | null
          created_at: string | null
          id: string
          last_connection: string | null
          product_type: string
          qr_hash: string
          total_sessions: number | null
          total_xp_earned: number | null
          unique_device_id: string
          user_id: string | null
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string | null
          id?: string
          last_connection?: string | null
          product_type: string
          qr_hash: string
          total_sessions?: number | null
          total_xp_earned?: number | null
          unique_device_id: string
          user_id?: string | null
        }
        Update: {
          claimed_at?: string | null
          created_at?: string | null
          id?: string
          last_connection?: string | null
          product_type?: string
          qr_hash?: string
          total_sessions?: number | null
          total_xp_earned?: number | null
          unique_device_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hardware_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hardware_sessions: {
        Row: {
          created_at: string | null
          device_id: string | null
          id: string
          session_end: string | null
          session_start: string | null
          session_type: string
          user_id: string | null
          xp_earned: number
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          session_end?: string | null
          session_start?: string | null
          session_type: string
          user_id?: string | null
          xp_earned: number
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          session_end?: string | null
          session_start?: string | null
          session_type?: string
          user_id?: string | null
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "hardware_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "hardware_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hardware_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nfts: {
        Row: {
          created_at: string
          description: string
          id: string
          image_url: string | null
          name: string
          price_bb: number
          rarity: string
          requirement_type: string | null
          requirement_value: number | null
        }
        Insert: {
          created_at?: string
          description: string
          id: string
          image_url?: string | null
          name: string
          price_bb: number
          rarity: string
          requirement_type?: string | null
          requirement_value?: number | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          name?: string
          price_bb?: number
          rarity?: string
          requirement_type?: string | null
          requirement_value?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_build_end_time: string | null
          active_build_part_id: string | null
          bb_balance: number
          booster_energy_capacity: number
          booster_energy_per_tap: number
          booster_income_per_tap: number
          booster_recovery_rate: number
          bz_balance: number
          created_at: string | null
          current_energy: number
          daily_reward_last_claim: string | null
          daily_reward_streak: number
          daily_taps_reset_at: string | null
          device_id: string | null
          display_name: string | null
          energy_recovery_rate: number
          id: string
          idle_bz_per_hour: number | null
          last_claim_timestamp: string
          last_energy_update: string
          last_idle_claim_at: string | null
          last_sync_at: string | null
          last_tap_time: string | null
          max_energy: number
          nfts_owned: string[]
          quickcharge_cooldown_until: string | null
          quickcharge_last_reset: string
          quickcharge_uses_remaining: number
          referral_code: string
          referral_milestone_10_claimed: boolean
          referral_milestone_25_claimed: boolean
          referral_milestone_5_claimed: boolean
          referral_milestone_50_claimed: boolean
          referred_by_code: string | null
          sync_version: number | null
          taps_today: number | null
          telegram_first_name: string | null
          telegram_id: number | null
          telegram_last_name: string | null
          telegram_username: string | null
          tier: string
          total_referrals: number
          total_taps: number | null
          updated_at: string
          username: string | null
          xp: number
        }
        Insert: {
          active_build_end_time?: string | null
          active_build_part_id?: string | null
          bb_balance?: number
          booster_energy_capacity?: number
          booster_energy_per_tap?: number
          booster_income_per_tap?: number
          booster_recovery_rate?: number
          bz_balance?: number
          created_at?: string | null
          current_energy?: number
          daily_reward_last_claim?: string | null
          daily_reward_streak?: number
          daily_taps_reset_at?: string | null
          device_id?: string | null
          display_name?: string | null
          energy_recovery_rate?: number
          id: string
          idle_bz_per_hour?: number | null
          last_claim_timestamp?: string
          last_energy_update?: string
          last_idle_claim_at?: string | null
          last_sync_at?: string | null
          last_tap_time?: string | null
          max_energy?: number
          nfts_owned?: string[]
          quickcharge_cooldown_until?: string | null
          quickcharge_last_reset?: string
          quickcharge_uses_remaining?: number
          referral_code: string
          referral_milestone_10_claimed?: boolean
          referral_milestone_25_claimed?: boolean
          referral_milestone_5_claimed?: boolean
          referral_milestone_50_claimed?: boolean
          referred_by_code?: string | null
          sync_version?: number | null
          taps_today?: number | null
          telegram_first_name?: string | null
          telegram_id?: number | null
          telegram_last_name?: string | null
          telegram_username?: string | null
          tier?: string
          total_referrals?: number
          total_taps?: number | null
          updated_at?: string
          username?: string | null
          xp?: number
        }
        Update: {
          active_build_end_time?: string | null
          active_build_part_id?: string | null
          bb_balance?: number
          booster_energy_capacity?: number
          booster_energy_per_tap?: number
          booster_income_per_tap?: number
          booster_recovery_rate?: number
          bz_balance?: number
          created_at?: string | null
          current_energy?: number
          daily_reward_last_claim?: string | null
          daily_reward_streak?: number
          daily_taps_reset_at?: string | null
          device_id?: string | null
          display_name?: string | null
          energy_recovery_rate?: number
          id?: string
          idle_bz_per_hour?: number | null
          last_claim_timestamp?: string
          last_energy_update?: string
          last_idle_claim_at?: string | null
          last_sync_at?: string | null
          last_tap_time?: string | null
          max_energy?: number
          nfts_owned?: string[]
          quickcharge_cooldown_until?: string | null
          quickcharge_last_reset?: string
          quickcharge_uses_remaining?: number
          referral_code?: string
          referral_milestone_10_claimed?: boolean
          referral_milestone_25_claimed?: boolean
          referral_milestone_5_claimed?: boolean
          referral_milestone_50_claimed?: boolean
          referred_by_code?: string | null
          sync_version?: number | null
          taps_today?: number | null
          telegram_first_name?: string | null
          telegram_id?: number | null
          telegram_last_name?: string | null
          telegram_username?: string | null
          tier?: string
          total_referrals?: number
          total_taps?: number | null
          updated_at?: string
          username?: string | null
          xp?: number
        }
        Relationships: []
      }
      referral_earnings: {
        Row: {
          claimed: boolean | null
          created_at: string | null
          id: string
          idle_earnings: number | null
          invitee_id: string
          inviter_id: string
          last_snapshot_idle: number | null
          last_snapshot_tap: number | null
          tap_earnings: number | null
          total_pending: number | null
        }
        Insert: {
          claimed?: boolean | null
          created_at?: string | null
          id?: string
          idle_earnings?: number | null
          invitee_id: string
          inviter_id: string
          last_snapshot_idle?: number | null
          last_snapshot_tap?: number | null
          tap_earnings?: number | null
          total_pending?: number | null
        }
        Update: {
          claimed?: boolean | null
          created_at?: string | null
          id?: string
          idle_earnings?: number | null
          invitee_id?: string
          inviter_id?: string
          last_snapshot_idle?: number | null
          last_snapshot_tap?: number | null
          tap_earnings?: number | null
          total_pending?: number | null
        }
        Relationships: []
      }
      referral_milestones: {
        Row: {
          claimed_at: string | null
          id: string
          milestone: number
          user_id: string
          xp_reward: number
        }
        Insert: {
          claimed_at?: string | null
          id?: string
          milestone: number
          user_id: string
          xp_reward: number
        }
        Update: {
          claimed_at?: string | null
          id?: string
          milestone?: number
          user_id?: string
          xp_reward?: number
        }
        Relationships: []
      }
      referrals: {
        Row: {
          bonus_claimed: boolean | null
          claimed_at: string | null
          id: string
          invited_at: string | null
          invitee_id: string
          inviter_id: string
          referral_code: string
        }
        Insert: {
          bonus_claimed?: boolean | null
          claimed_at?: string | null
          id?: string
          invited_at?: string | null
          invitee_id: string
          inviter_id: string
          referral_code: string
        }
        Update: {
          bonus_claimed?: boolean | null
          claimed_at?: string | null
          id?: string
          invited_at?: string | null
          invitee_id?: string
          inviter_id?: string
          referral_code?: string
        }
        Relationships: []
      }
      star_invoices: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          invoice_payload: string
          paid_at: string | null
          part_key: string
          part_level: number
          part_name: string
          stars_amount: number
          status: string
          telegram_payment_charge_id: string | null
          telegram_user_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invoice_payload: string
          paid_at?: string | null
          part_key: string
          part_level: number
          part_name: string
          stars_amount: number
          status?: string
          telegram_payment_charge_id?: string | null
          telegram_user_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invoice_payload?: string
          paid_at?: string | null
          part_key?: string
          part_level?: number
          part_name?: string
          stars_amount?: number
          status?: string
          telegram_payment_charge_id?: string | null
          telegram_user_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "star_invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      star_transactions: {
        Row: {
          created_at: string | null
          id: string
          invoice_id: string
          metadata: Json | null
          stars_paid: number
          telegram_user_id: number
          transaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invoice_id: string
          metadata?: Json | null
          stars_paid: number
          telegram_user_id: number
          transaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invoice_id?: string
          metadata?: Json | null
          stars_paid?: number
          telegram_user_id?: number
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "star_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "star_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "star_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          action_link: string | null
          created_at: string
          description: string
          id: string
          reward_amount: number
          reward_type: string
          target_value: number
          task_type: string
          title: string
        }
        Insert: {
          action_link?: string | null
          created_at?: string
          description: string
          id: string
          reward_amount: number
          reward_type: string
          target_value: number
          task_type: string
          title: string
        }
        Update: {
          action_link?: string | null
          created_at?: string
          description?: string
          id?: string
          reward_amount?: number
          reward_type?: string
          target_value?: number
          task_type?: string
          title?: string
        }
        Relationships: []
      }
      user_build_parts: {
        Row: {
          build_ends_at: string | null
          created_at: string
          id: string
          is_building: boolean
          level: number
          part_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          build_ends_at?: string | null
          created_at?: string
          id?: string
          is_building?: boolean
          level?: number
          part_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          build_ends_at?: string | null
          created_at?: string
          id?: string
          is_building?: boolean
          level?: number
          part_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_build_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "build_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_build_parts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_daily_claims: {
        Row: {
          claimed_at: string
          day: number
          id: string
          reward_amount: number
          reward_type: string
          telegram_id: number | null
          user_id: string | null
        }
        Insert: {
          claimed_at?: string
          day: number
          id?: string
          reward_amount: number
          reward_type: string
          telegram_id?: number | null
          user_id?: string | null
        }
        Update: {
          claimed_at?: string
          day?: number
          id?: string
          reward_amount?: number
          reward_type?: string
          telegram_id?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_nfts: {
        Row: {
          id: string
          nft_id: string
          price_paid_bb: number
          purchased_at: string
          telegram_id: number | null
          user_id: string | null
        }
        Insert: {
          id?: string
          nft_id: string
          price_paid_bb?: number
          purchased_at?: string
          telegram_id?: number | null
          user_id?: string | null
        }
        Update: {
          id?: string
          nft_id?: string
          price_paid_bb?: number
          purchased_at?: string
          telegram_id?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_nfts_nft_id_fkey"
            columns: ["nft_id"]
            isOneToOne: false
            referencedRelation: "nfts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_nfts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reward_state: {
        Row: {
          created_at: string | null
          current_reward_week: number | null
          current_weekly_period_start: string | null
          daily_streak: number | null
          id: string
          last_daily_claim_date: string | null
          telegram_id: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_reward_week?: number | null
          current_weekly_period_start?: string | null
          daily_streak?: number | null
          id?: string
          last_daily_claim_date?: string | null
          telegram_id?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_reward_week?: number | null
          current_weekly_period_start?: string | null
          daily_streak?: number | null
          id?: string
          last_daily_claim_date?: string | null
          telegram_id?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_task_progress: {
        Row: {
          claimed: boolean
          claimed_at: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          current_progress: number
          expires_at: string | null
          id: string
          reset_at: string
          task_id: string
          task_type: string
          telegram_id: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          claimed?: boolean
          claimed_at?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          expires_at?: string | null
          id?: string
          reset_at?: string
          task_id: string
          task_type?: string
          telegram_id?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          claimed?: boolean
          claimed_at?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          expires_at?: string | null
          id?: string
          reset_at?: string
          task_id?: string
          task_type?: string
          telegram_id?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_task_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_task_state: {
        Row: {
          created_at: string | null
          id: string
          last_daily_reset: string
          last_weekly_reset: string
          telegram_id: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_daily_reset?: string
          last_weekly_reset?: string
          telegram_id: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_daily_reset?: string
          last_weekly_reset?: string
          telegram_id?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_task_state_user_id_fkey"
            columns: ["user_id"]
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
      calculate_referral_earnings: {
        Args: { inviter_uuid: string }
        Returns: {
          lifetime_bz: number
          pending_bz: number
          total_referrals: number
        }[]
      }
      get_user_stats: {
        Args: { user_uuid: string }
        Returns: {
          bb_balance: number
          bz_balance: number
          current_energy: number
          last_sync_at: string
          max_energy: number
          referral_count: number
          sync_version: number
          telegram_id: number
          tier: string
          total_taps: number
          xp: number
        }[]
      }
      increment_total_taps: {
        Args: { tap_count?: number; user_uuid: string }
        Returns: number
      }
      update_user_balance: {
        Args: {
          bb_delta?: number
          bz_delta?: number
          user_uuid: string
          xp_delta?: number
        }
        Returns: {
          new_bb: number
          new_bz: number
          new_tier: string
          new_xp: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
