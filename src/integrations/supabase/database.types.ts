 
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
          base_yield: number
          created_at: string | null
          icon: string
          id: string
          max_level: number
          name: string
          part_number: number
          stage: number
        }
        Insert: {
          base_cost: number
          base_yield: number
          created_at?: string | null
          icon: string
          id: string
          max_level?: number
          name: string
          part_number: number
          stage: number
        }
        Update: {
          base_cost?: number
          base_yield?: number
          created_at?: string | null
          icon?: string
          id?: string
          max_level?: number
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
          burned_amount: number | null
          conversion_type: string
          created_at: string | null
          exchange_rate: number | null
          id: string
          telegram_id: number | null
          tier_at_conversion: string
          tier_bonus_percent: number
          user_id: string | null
        }
        Insert: {
          amount_in: number
          amount_out: number
          burned_amount?: number | null
          conversion_type: string
          created_at?: string | null
          exchange_rate?: number | null
          id?: string
          telegram_id?: number | null
          tier_at_conversion: string
          tier_bonus_percent: number
          user_id?: string | null
        }
        Update: {
          amount_in?: number
          amount_out?: number
          burned_amount?: number | null
          conversion_type?: string
          created_at?: string | null
          exchange_rate?: number | null
          id?: string
          telegram_id?: number | null
          tier_at_conversion?: string
          tier_bonus_percent?: number
          user_id?: string | null
        }
        Relationships: []
      }
      daily_rewards: {
        Row: {
          bb_reward: number | null
          bz_reward: number | null
          day: number
          description: string
          xp_reward: number | null
        }
        Insert: {
          bb_reward?: number | null
          bz_reward?: number | null
          day: number
          description: string
          xp_reward?: number | null
        }
        Update: {
          bb_reward?: number | null
          bz_reward?: number | null
          day?: number
          description?: string
          xp_reward?: number | null
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
          created_at: string | null
          description: string
          id: string
          image_url: string | null
          name: string
          price_bb: number
          requirement_type: string | null
          requirement_value: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id: string
          image_url?: string | null
          name: string
          price_bb: number
          requirement_type?: string | null
          requirement_value?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          image_url?: string | null
          name?: string
          price_bb?: number
          requirement_type?: string | null
          requirement_value?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_build_end_time: string | null
          active_build_part_id: string | null
          avatar_url: string | null
          bb_balance: number | null
          booster_energy_capacity: number | null
          booster_energy_per_tap: number | null
          booster_income_per_tap: number | null
          booster_recovery_rate: number | null
          bz_balance: number | null
          created_at: string | null
          current_energy: number | null
          daily_reward_last_claim: string | null
          daily_reward_streak: number | null
          display_name: string | null
          email: string | null
          energy_recovery_rate: number | null
          full_name: string | null
          id: string
          last_claim_timestamp: string | null
          last_energy_update: string | null
          max_energy: number | null
          nfts_owned: Json | null
          quickcharge_cooldown_until: string | null
          quickcharge_last_reset: string | null
          quickcharge_uses_remaining: number | null
          referral_code: string | null
          referral_milestone_10_claimed: boolean | null
          referral_milestone_25_claimed: boolean | null
          referral_milestone_5_claimed: boolean | null
          referral_milestone_50_claimed: boolean | null
          referred_by_code: string | null
          telegram_first_name: string | null
          telegram_id: number | null
          telegram_last_name: string | null
          telegram_username: string | null
          tier: string | null
          total_referrals: number | null
          total_taps: number | null
          updated_at: string | null
          xp: number | null
        }
        Insert: {
          active_build_end_time?: string | null
          active_build_part_id?: string | null
          avatar_url?: string | null
          bb_balance?: number | null
          booster_energy_capacity?: number | null
          booster_energy_per_tap?: number | null
          booster_income_per_tap?: number | null
          booster_recovery_rate?: number | null
          bz_balance?: number | null
          created_at?: string | null
          current_energy?: number | null
          daily_reward_last_claim?: string | null
          daily_reward_streak?: number | null
          display_name?: string | null
          email?: string | null
          energy_recovery_rate?: number | null
          full_name?: string | null
          id: string
          last_claim_timestamp?: string | null
          last_energy_update?: string | null
          max_energy?: number | null
          nfts_owned?: Json | null
          quickcharge_cooldown_until?: string | null
          quickcharge_last_reset?: string | null
          quickcharge_uses_remaining?: number | null
          referral_code?: string | null
          referral_milestone_10_claimed?: boolean | null
          referral_milestone_25_claimed?: boolean | null
          referral_milestone_5_claimed?: boolean | null
          referral_milestone_50_claimed?: boolean | null
          referred_by_code?: string | null
          telegram_first_name?: string | null
          telegram_id?: number | null
          telegram_last_name?: string | null
          telegram_username?: string | null
          tier?: string | null
          total_referrals?: number | null
          total_taps?: number | null
          updated_at?: string | null
          xp?: number | null
        }
        Update: {
          active_build_end_time?: string | null
          active_build_part_id?: string | null
          avatar_url?: string | null
          bb_balance?: number | null
          booster_energy_capacity?: number | null
          booster_energy_per_tap?: number | null
          booster_income_per_tap?: number | null
          booster_recovery_rate?: number | null
          bz_balance?: number | null
          created_at?: string | null
          current_energy?: number | null
          daily_reward_last_claim?: string | null
          daily_reward_streak?: number | null
          display_name?: string | null
          email?: string | null
          energy_recovery_rate?: number | null
          full_name?: string | null
          id?: string
          last_claim_timestamp?: string | null
          last_energy_update?: string | null
          max_energy?: number | null
          nfts_owned?: Json | null
          quickcharge_cooldown_until?: string | null
          quickcharge_last_reset?: string | null
          quickcharge_uses_remaining?: number | null
          referral_code?: string | null
          referral_milestone_10_claimed?: boolean | null
          referral_milestone_25_claimed?: boolean | null
          referral_milestone_5_claimed?: boolean | null
          referral_milestone_50_claimed?: boolean | null
          referred_by_code?: string | null
          telegram_first_name?: string | null
          telegram_id?: number | null
          telegram_last_name?: string | null
          telegram_username?: string | null
          tier?: string | null
          total_referrals?: number | null
          total_taps?: number | null
          updated_at?: string | null
          xp?: number | null
        }
        Relationships: []
      }
      referral_earnings: {
        Row: {
          claimed: boolean | null
          claimed_at: string | null
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
          claimed_at?: string | null
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
          claimed_at?: string | null
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
          id: string
          invited_at: string | null
          invitee_id: string
          inviter_id: string
          referral_code: string
        }
        Insert: {
          bonus_claimed?: boolean | null
          id?: string
          invited_at?: string | null
          invitee_id: string
          inviter_id: string
          referral_code: string
        }
        Update: {
          bonus_claimed?: boolean | null
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
        Relationships: []
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
        ]
      }
      tasks: {
        Row: {
          created_at: string | null
          description: string
          id: string
          is_active: boolean | null
          reward_amount: number
          reward_type: string
          target_value: number
          task_type: string
          title: string
          tracking_field: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id: string
          is_active?: boolean | null
          reward_amount: number
          reward_type: string
          target_value: number
          task_type: string
          title: string
          tracking_field: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          reward_amount?: number
          reward_type?: string
          target_value?: number
          task_type?: string
          title?: string
          tracking_field?: string
        }
        Relationships: []
      }
      user_build_parts: {
        Row: {
          build_ends_at: string | null
          build_started_at: string | null
          created_at: string | null
          current_level: number
          id: string
          is_building: boolean | null
          last_upgraded_at: string | null
          part_id: string
          total_yield_contributed: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          build_ends_at?: string | null
          build_started_at?: string | null
          created_at?: string | null
          current_level?: number
          id?: string
          is_building?: boolean | null
          last_upgraded_at?: string | null
          part_id: string
          total_yield_contributed?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          build_ends_at?: string | null
          build_started_at?: string | null
          created_at?: string | null
          current_level?: number
          id?: string
          is_building?: boolean | null
          last_upgraded_at?: string | null
          part_id?: string
          total_yield_contributed?: number | null
          updated_at?: string | null
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
        ]
      }
      user_daily_claims: {
        Row: {
          bb_claimed: number | null
          bz_claimed: number | null
          claimed_at: string | null
          day: number
          id: string
          user_id: string
          xp_claimed: number | null
        }
        Insert: {
          bb_claimed?: number | null
          bz_claimed?: number | null
          claimed_at?: string | null
          day: number
          id?: string
          user_id: string
          xp_claimed?: number | null
        }
        Update: {
          bb_claimed?: number | null
          bz_claimed?: number | null
          claimed_at?: string | null
          day?: number
          id?: string
          user_id?: string
          xp_claimed?: number | null
        }
        Relationships: []
      }
      user_nfts: {
        Row: {
          id: string
          nft_id: string
          price_paid_bb: number
          purchased_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          nft_id: string
          price_paid_bb: number
          purchased_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          nft_id?: string
          price_paid_bb?: number
          purchased_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_nfts_nft_id_fkey"
            columns: ["nft_id"]
            isOneToOne: false
            referencedRelation: "nfts"
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
          claimed: boolean | null
          claimed_at: string | null
          completed_at: string | null
          created_at: string | null
          current_progress: number | null
          id: string
          is_completed: boolean | null
          reset_at: string | null
          task_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          claimed?: boolean | null
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_progress?: number | null
          id?: string
          is_completed?: boolean | null
          reset_at?: string | null
          task_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          claimed?: boolean | null
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_progress?: number | null
          id?: string
          is_completed?: boolean | null
          reset_at?: string | null
          task_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_task_progress_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
