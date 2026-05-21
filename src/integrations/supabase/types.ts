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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      advisor_run_log: {
        Row: {
          duration_ms: number | null
          error: string | null
          id: string
          insights_generated: number | null
          ran_at: string | null
        }
        Insert: {
          duration_ms?: number | null
          error?: string | null
          id?: string
          insights_generated?: number | null
          ran_at?: string | null
        }
        Update: {
          duration_ms?: number | null
          error?: string | null
          id?: string
          insights_generated?: number | null
          ran_at?: string | null
        }
        Relationships: []
      }
      assistant_actions_log: {
        Row: {
          action_type: string
          created_at: string | null
          description: string
          id: string
          metadata: Json | null
          related_entity_id: string | null
          related_entity_type: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          description: string
          id?: string
          metadata?: Json | null
          related_entity_id?: string | null
          related_entity_type?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          related_entity_id?: string | null
          related_entity_type?: string | null
        }
        Relationships: []
      }
      business_insights: {
        Row: {
          action_label: string | null
          action_route: string | null
          category: string
          created_at: string | null
          data_snapshot: Json | null
          description: string
          dismissed_at: string | null
          expires_at: string | null
          id: string
          insight_type: string
          is_dismissed: boolean | null
          is_read: boolean | null
          priority: string
          read_at: string | null
          title: string
          was_acted_on: boolean | null
        }
        Insert: {
          action_label?: string | null
          action_route?: string | null
          category: string
          created_at?: string | null
          data_snapshot?: Json | null
          description: string
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          insight_type: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          priority: string
          read_at?: string | null
          title: string
          was_acted_on?: boolean | null
        }
        Update: {
          action_label?: string | null
          action_route?: string | null
          category?: string
          created_at?: string | null
          data_snapshot?: Json | null
          description?: string
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          insight_type?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          priority?: string
          read_at?: string | null
          title?: string
          was_acted_on?: boolean | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          label: string
          sort_order: number | null
          value: string
          visible: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          sort_order?: number | null
          value: string
          visible?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          sort_order?: number | null
          value?: string
          visible?: boolean | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          notified_at: string | null
          read: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          notified_at?: string | null
          read?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          notified_at?: string | null
          read?: boolean | null
        }
        Relationships: []
      }
      coupon_products: {
        Row: {
          coupon_id: string
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_products_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          customer_id: string | null
          id: string
          order_id: string | null
          used_at: string
        }
        Insert: {
          coupon_id: string
          customer_id?: string | null
          id?: string
          order_id?: string | null
          used_at?: string
        }
        Update: {
          coupon_id?: string
          customer_id?: string | null
          id?: string
          order_id?: string | null
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "vista_deuda_pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expiration_date: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          minimum_purchase_amount: number
          single_use: boolean
          zumbita_request_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value: number
          expiration_date?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          minimum_purchase_amount?: number
          single_use?: boolean
          zumbita_request_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expiration_date?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          minimum_purchase_amount?: number
          single_use?: boolean
          zumbita_request_id?: string | null
        }
        Relationships: []
      }
      order_payments: {
        Row: {
          estado: string
          fecha_creacion: string
          fecha_pago: string
          hora_pago: string
          id: number
          monto: number
          notas: string | null
          order_id: string
          tipo: string
        }
        Insert: {
          estado?: string
          fecha_creacion?: string
          fecha_pago?: string
          hora_pago?: string
          id?: number
          monto: number
          notas?: string | null
          order_id: string
          tipo: string
        }
        Update: {
          estado?: string
          fecha_creacion?: string
          fecha_pago?: string
          hora_pago?: string
          id?: number
          monto?: number
          notas?: string | null
          order_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "vista_deuda_pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_id: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
          desired_date: string
          discount_amount: number
          id: string
          items: Json
          notes: string | null
          notified_at: string | null
          payment_status: string | null
          preferred_time: string
          status: string
          subtotal: number | null
          total: number
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          desired_date: string
          discount_amount?: number
          id?: string
          items: Json
          notes?: string | null
          notified_at?: string | null
          payment_status?: string | null
          preferred_time: string
          status?: string
          subtotal?: number | null
          total: number
        }
        Update: {
          coupon_id?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          desired_date?: string
          discount_amount?: number
          id?: string
          items?: Json
          notes?: string | null
          notified_at?: string | null
          payment_status?: string | null
          preferred_time?: string
          status?: string
          subtotal?: number | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string | null
          id: string
          label: string
          price: number
          product_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          price: number
          product_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          price?: number
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          category: string
          created_at: string | null
          description: string | null
          featured: boolean | null
          id: string
          image_url: string | null
          last_price_sync: string | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category: string
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          last_price_sync?: string | null
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          last_price_sync?: string | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      promotion_products: {
        Row: {
          created_at: string
          id: string
          product_id: string
          promotion_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          promotion_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          promotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_products_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          banner_text: string | null
          created_at: string | null
          day_of_week: number | null
          description: string | null
          discount_type: string
          discount_value: number | null
          end_date: string | null
          id: string
          internal_notes: string | null
          is_active: boolean
          name: string | null
          product_ids: string[] | null
          show_discount_badge: boolean
          start_date: string | null
          status: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          banner_text?: string | null
          created_at?: string | null
          day_of_week?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number | null
          end_date?: string | null
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          name?: string | null
          product_ids?: string[] | null
          show_discount_badge?: boolean
          start_date?: string | null
          status?: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          banner_text?: string | null
          created_at?: string | null
          day_of_week?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number | null
          end_date?: string | null
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          name?: string | null
          product_ids?: string[] | null
          show_discount_badge?: boolean
          start_date?: string | null
          status?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action_type: string
          created_at: string
          id: string
          identifier: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          identifier: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          identifier?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
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
      zumbita_discount_requests: {
        Row: {
          created_at: string
          customer_name: string
          email: string | null
          id: string
          is_zumbita_student: boolean
          message: string | null
          status: string
          verified_alumna: boolean
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          customer_name: string
          email?: string | null
          id?: string
          is_zumbita_student?: boolean
          message?: string | null
          status?: string
          verified_alumna?: boolean
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          customer_name?: string
          email?: string | null
          id?: string
          is_zumbita_student?: boolean
          message?: string | null
          status?: string
          verified_alumna?: boolean
          whatsapp?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      customer_summary: {
        Row: {
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          first_order_date: string | null
          last_order_date: string | null
          total_orders: number | null
          total_spent: number | null
        }
        Relationships: []
      }
      daily_revenue: {
        Row: {
          avg_order_value: number | null
          cancelled_orders: number | null
          completed_orders: number | null
          order_count: number | null
          order_date: string | null
          pending_orders: number | null
          revenue: number | null
        }
        Relationships: []
      }
      product_performance: {
        Row: {
          product_id: string | null
          product_name: string | null
          times_ordered: number | null
          total_revenue: number | null
          total_units_sold: number | null
        }
        Relationships: []
      }
      vista_deuda_pedidos: {
        Row: {
          cantidad_pagos: number | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          desired_date: string | null
          deuda_restante: number | null
          estado_deuda: string | null
          id: string | null
          payment_status: string | null
          porcentaje_pagado: number | null
          status: string | null
          total: number | null
          total_pagado: number | null
        }
        Relationships: []
      }
      vista_estadisticas_cobranza: {
        Row: {
          pedidos_pagos: number | null
          pedidos_parciales: number | null
          pedidos_sin_pagar: number | null
          tasa_cobranza: number | null
          total_pedidos: number | null
          total_pendiente: number | null
          total_recaudado: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      obtener_deuda_pedido: {
        Args: { pedido_id_param: string }
        Returns: {
          cantidad_pagos: number
          completamente_pagado: boolean
          deuda_restante: number
          total_pagado: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
