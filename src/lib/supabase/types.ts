export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      addon_groups: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_required: boolean | null
          max_selections: number | null
          menu_item_id: string
          min_selections: number | null
          name: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_required?: boolean | null
          max_selections?: number | null
          menu_item_id: string
          min_selections?: number | null
          name: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_required?: boolean | null
          max_selections?: number | null
          menu_item_id?: string
          min_selections?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "addon_groups_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      addon_options: {
        Row: {
          additional_price: number
          addon_group_id: string
          created_at: string | null
          display_order: number | null
          id: string
          is_available: boolean | null
          name: string
        }
        Insert: {
          additional_price?: number
          addon_group_id: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_available?: boolean | null
          name: string
        }
        Update: {
          additional_price?: number
          addon_group_id?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_available?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "addon_options_addon_group_id_fkey"
            columns: ["addon_group_id"]
            isOneToOne: false
            referencedRelation: "addon_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bir_receipt_config: {
        Row: {
          accreditation_date: string | null
          accreditation_number: string | null
          business_address: string
          business_name: string
          created_at: string | null
          id: string
          permit_date_issued: string | null
          permit_number: string | null
          pos_machine_id: string | null
          receipt_series_current: number
          receipt_series_start: number
          terminal_id: string | null
          tin: string
          updated_at: string | null
        }
        Insert: {
          accreditation_date?: string | null
          accreditation_number?: string | null
          business_address: string
          business_name: string
          created_at?: string | null
          id?: string
          permit_date_issued?: string | null
          permit_number?: string | null
          pos_machine_id?: string | null
          receipt_series_current?: number
          receipt_series_start?: number
          terminal_id?: string | null
          tin: string
          updated_at?: string | null
        }
        Update: {
          accreditation_date?: string | null
          accreditation_number?: string | null
          business_address?: string
          business_name?: string
          created_at?: string | null
          id?: string
          permit_date_issued?: string | null
          permit_number?: string | null
          pos_machine_id?: string | null
          receipt_series_current?: number
          receipt_series_start?: number
          terminal_id?: string | null
          tin?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      kitchen_stations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      menu_item_stations: {
        Row: {
          kitchen_station_id: string
          menu_item_id: string
        }
        Insert: {
          kitchen_station_id: string
          menu_item_id: string
        }
        Update: {
          kitchen_station_id?: string
          menu_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_stations_kitchen_station_id_fkey"
            columns: ["kitchen_station_id"]
            isOneToOne: false
            referencedRelation: "kitchen_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_stations_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          allergens: string[] | null
          base_price: number
          category_id: string
          created_at: string | null
          deleted_at: string | null
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_available: boolean | null
          is_featured: boolean | null
          name: string
          nutritional_info: Json | null
          preparation_time_minutes: number | null
          slug: string
          translations: Json | null
          updated_at: string | null
        }
        Insert: {
          allergens?: string[] | null
          base_price: number
          category_id: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_featured?: boolean | null
          name: string
          nutritional_info?: Json | null
          preparation_time_minutes?: number | null
          slug: string
          translations?: Json | null
          updated_at?: string | null
        }
        Update: {
          allergens?: string[] | null
          base_price?: number
          category_id?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_featured?: boolean | null
          name?: string
          nutritional_info?: Json | null
          preparation_time_minutes?: number | null
          slug?: string
          translations?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          order_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_addons: {
        Row: {
          additional_price: number
          addon_name: string
          addon_option_id: string | null
          created_at: string | null
          id: string
          order_item_id: string
        }
        Insert: {
          additional_price?: number
          addon_name: string
          addon_option_id?: string | null
          created_at?: string | null
          id?: string
          order_item_id: string
        }
        Update: {
          additional_price?: number
          addon_name?: string
          addon_option_id?: string | null
          created_at?: string | null
          id?: string
          order_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_item_addons_addon_option_id_fkey"
            columns: ["addon_option_id"]
            isOneToOne: false
            referencedRelation: "addon_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_addons_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          item_name: string
          menu_item_id: string | null
          order_id: string
          quantity: number
          special_instructions: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_name: string
          menu_item_id?: string | null
          order_id: string
          quantity?: number
          special_instructions?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          item_name?: string
          menu_item_id?: string | null
          order_id?: string
          quantity?: number
          special_instructions?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancelled_at: string | null
          created_at: string | null
          deleted_at: string | null
          discount_amount: number | null
          estimated_ready_at: string | null
          expires_at: string | null
          guest_phone: string | null
          id: string
          order_number: string
          order_type: Database["public"]["Enums"]["order_type"]
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          promo_code_id: string | null
          ready_at: string | null
          room_number: string | null
          served_at: string | null
          service_charge: number | null
          special_instructions: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          table_number: string | null
          tax_amount: number
          total_amount: number
          updated_at: string | null
          version: number | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          discount_amount?: number | null
          estimated_ready_at?: string | null
          expires_at?: string | null
          guest_phone?: string | null
          id?: string
          order_number?: string
          order_type: Database["public"]["Enums"]["order_type"]
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          promo_code_id?: string | null
          ready_at?: string | null
          room_number?: string | null
          served_at?: string | null
          service_charge?: number | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_number?: string | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          discount_amount?: number | null
          estimated_ready_at?: string | null
          expires_at?: string | null
          guest_phone?: string | null
          id?: string
          order_number?: string
          order_type?: Database["public"]["Enums"]["order_type"]
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          promo_code_id?: string | null
          ready_at?: string | null
          room_number?: string | null
          served_at?: string | null
          service_charge?: number | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_number?: string | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          cash_received: number | null
          change_given: number | null
          completed_at: string | null
          created_at: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          processed_by: string | null
          provider_reference: string | null
          status: string
        }
        Insert: {
          amount: number
          cash_received?: number | null
          change_given?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          processed_by?: string | null
          provider_reference?: string | null
          status?: string
        }
        Update: {
          amount?: number
          cash_received?: number | null
          change_given?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string
          processed_by?: string | null
          provider_reference?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          pin_hash: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          pin_hash?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          pin_hash?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string | null
          current_usage_count: number | null
          description: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id: string
          is_active: boolean | null
          max_usage_count: number | null
          min_order_amount: number | null
          updated_at: string | null
          valid_from: string
          valid_until: string
        }
        Insert: {
          code: string
          created_at?: string | null
          current_usage_count?: number | null
          description?: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_usage_count?: number | null
          min_order_amount?: number | null
          updated_at?: string | null
          valid_from: string
          valid_until: string
        }
        Update: {
          code?: string
          created_at?: string | null
          current_usage_count?: number | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_usage_count?: number | null
          min_order_amount?: number | null
          updated_at?: string | null
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
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
      cancel_expired_orders: { Args: never; Returns: number }
      generate_order_number: { Args: never; Returns: string }
      get_next_bir_receipt_number: { Args: never; Returns: string }
      increment_promo_usage: { Args: { promo_id: string }; Returns: undefined }
      process_cash_payment: {
        Args: {
          p_amount: number
          p_cash_received: number
          p_cashier_id: string
          p_change_given: number
          p_order_id: string
        }
        Returns: string
      }
      user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      discount_type: "percentage" | "fixed_amount"
      order_status:
        | "pending_payment"
        | "paid"
        | "preparing"
        | "ready"
        | "served"
        | "cancelled"
      order_type: "dine_in" | "room_service" | "takeout"
      payment_method: "cash" | "gcash" | "card"
      payment_status: "unpaid" | "processing" | "paid" | "refunded" | "expired"
      user_role: "admin" | "cashier" | "kitchen" | "kiosk"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      discount_type: ["percentage", "fixed_amount"],
      order_status: [
        "pending_payment",
        "paid",
        "preparing",
        "ready",
        "served",
        "cancelled",
      ],
      order_type: ["dine_in", "room_service", "takeout"],
      payment_method: ["cash", "gcash", "card"],
      payment_status: ["unpaid", "processing", "paid", "refunded", "expired"],
      user_role: ["admin", "cashier", "kitchen", "kiosk"],
    },
  },
} as const

