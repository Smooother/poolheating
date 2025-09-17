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
      heat_pump_status: {
        Row: {
          created_at: string
          current_temp: number
          device_id: string
          id: string
          is_online: boolean
          last_communication: string
          mode: string | null
          power_status: string
          speed_percentage: number
          target_temp: number
          updated_at: string
          water_temp: number
        }
        Insert: {
          created_at?: string
          current_temp: number
          device_id: string
          id?: string
          is_online?: boolean
          last_communication?: string
          mode?: string | null
          power_status: string
          speed_percentage: number
          target_temp: number
          updated_at?: string
          water_temp: number
        }
        Update: {
          created_at?: string
          current_temp?: number
          device_id?: string
          id?: string
          is_online?: boolean
          last_communication?: string
          mode?: string | null
          power_status?: string
          speed_percentage?: number
          target_temp?: number
          updated_at?: string
          water_temp?: number
        }
        Relationships: []
      }
      price_data: {
        Row: {
          bidding_zone: string
          created_at: string
          currency: string
          end_time: string
          id: string
          price_value: number
          provider: string
          resolution: string
          start_time: string
          updated_at: string
        }
        Insert: {
          bidding_zone: string
          created_at?: string
          currency?: string
          end_time: string
          id?: string
          price_value: number
          provider?: string
          resolution?: string
          start_time: string
          updated_at?: string
        }
        Update: {
          bidding_zone?: string
          created_at?: string
          currency?: string
          end_time?: string
          id?: string
          price_value?: number
          provider?: string
          resolution?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      tuya_config: {
        Row: {
          client_id: string
          client_secret: string
          created_at: string
          device_id: string
          dp_mode_code: string
          dp_power_code: string
          dp_settemp_code: string
          dp_silent_code: string
          id: string
          uid: string
          updated_at: string
        }
        Insert: {
          client_id?: string
          client_secret?: string
          created_at?: string
          device_id?: string
          dp_mode_code?: string
          dp_power_code?: string
          dp_settemp_code?: string
          dp_silent_code?: string
          id?: string
          uid?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          client_secret?: string
          created_at?: string
          device_id?: string
          dp_mode_code?: string
          dp_power_code?: string
          dp_settemp_code?: string
          dp_silent_code?: string
          id?: string
          uid?: string
          updated_at?: string
        }
        Relationships: []
      }
      tuya_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: number
          expires_in: number
          refresh_token: string
          updated_at: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at: number
          expires_in: number
          refresh_token: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: number
          expires_in?: number
          refresh_token?: string
          updated_at?: string | null
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
