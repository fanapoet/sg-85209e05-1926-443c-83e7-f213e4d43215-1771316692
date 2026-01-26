 
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
