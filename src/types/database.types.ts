export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      alergenos: {
        Row: {
          created_at: string | null
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      categorias_ingredientes: {
        Row: {
          created_at: string | null
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      ingrediente_alergenos: {
        Row: {
          alergeno_id: string
          ingrediente_id: string
        }
        Insert: {
          alergeno_id: string
          ingrediente_id: string
        }
        Update: {
          alergeno_id?: string
          ingrediente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingrediente_alergenos_alergeno_id_fkey"
            columns: ["alergeno_id"]
            isOneToOne: false
            referencedRelation: "alergenos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingrediente_alergenos_ingrediente_id_fkey"
            columns: ["ingrediente_id"]
            isOneToOne: false
            referencedRelation: "ingredientes"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredientes: {
        Row: {
          categoria_id: string | null
          created_at: string | null
          id: string
          nombre: string
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string | null
          id?: string
          nombre: string
        }
        Update: {
          categoria_id?: string | null
          created_at?: string | null
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredientes_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_ingredientes"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_recetas: {
        Row: {
          dia_semana: string
          menu_id: string
          receta_id: string
          tipo_comida: string
        }
        Insert: {
          dia_semana: string
          menu_id: string
          receta_id: string
          tipo_comida: string
        }
        Update: {
          dia_semana?: string
          menu_id?: string
          receta_id?: string
          tipo_comida?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_recetas_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus_semanales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_recetas_receta_id_fkey"
            columns: ["receta_id"]
            isOneToOne: false
            referencedRelation: "recetas"
            referencedColumns: ["id"]
          },
        ]
      }
      menus_semanales: {
        Row: {
          created_at: string | null
          id: string
          semana_inicio: string
          usuario_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          semana_inicio?: string
          usuario_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          semana_inicio?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menus_semanales_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          banned: boolean
          created_at: string
          deletion_requested_at: string | null
          display_name: string | null
          email: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          banned?: boolean
          created_at?: string
          deletion_requested_at?: string | null
          display_name?: string | null
          email: string
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          banned?: boolean
          created_at?: string
          deletion_requested_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      profile_allergens: {
        Row: {
          allergen_id: string
          user_id: string
        }
        Insert: {
          allergen_id: string
          user_id: string
        }
        Update: {
          allergen_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_allergens_allergen_id_fkey"
            columns: ["allergen_id"]
            isOneToOne: false
            referencedRelation: "alergenos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_allergens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      receta_ingredientes: {
        Row: {
          cantidad: number
          id: string
          ingrediente_id: string | null
          nombre_personalizado: string | null
          receta_id: string
          unidad: string
        }
        Insert: {
          cantidad: number
          id?: string
          ingrediente_id?: string | null
          nombre_personalizado?: string | null
          receta_id: string
          unidad: string
        }
        Update: {
          cantidad?: number
          id?: string
          ingrediente_id?: string | null
          nombre_personalizado?: string | null
          receta_id?: string
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "receta_ingredientes_ingrediente_id_fkey"
            columns: ["ingrediente_id"]
            isOneToOne: false
            referencedRelation: "ingredientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receta_ingredientes_receta_id_fkey"
            columns: ["receta_id"]
            isOneToOne: false
            referencedRelation: "recetas"
            referencedColumns: ["id"]
          },
        ]
      }
      recetas: {
        Row: {
          aprobada: boolean
          creador_id: string | null
          created_at: string | null
          descripcion: string | null
          id: string
          imagen_url: string | null
          instrucciones: string[]
          porciones: number
          publica: boolean
          tiempo_preparacion: number
          titulo: string
          updated_at: string
        }
        Insert: {
          aprobada?: boolean
          creador_id?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          imagen_url?: string | null
          instrucciones: string[]
          porciones?: number
          publica?: boolean
          tiempo_preparacion?: number
          titulo: string
          updated_at?: string
        }
        Update: {
          aprobada?: boolean
          creador_id?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          imagen_url?: string | null
          instrucciones?: string[]
          porciones?: number
          publica?: boolean
          tiempo_preparacion?: number
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recetas_creador_id_fkey"
            columns: ["creador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list_items: {
        Row: {
          cantidad: number
          comprado: boolean
          created_at: string
          id: string
          ingrediente_id: string | null
          menu_id: string
          nombre_personalizado: string | null
          unidad: string
          usuario_id: string
        }
        Insert: {
          cantidad: number
          comprado?: boolean
          created_at?: string
          id?: string
          ingrediente_id?: string | null
          menu_id: string
          nombre_personalizado?: string | null
          unidad: string
          usuario_id: string
        }
        Update: {
          cantidad?: number
          comprado?: boolean
          created_at?: string
          id?: string
          ingrediente_id?: string | null
          menu_id?: string
          nombre_personalizado?: string | null
          unidad?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_ingrediente_id_fkey"
            columns: ["ingrediente_id"]
            isOneToOne: false
            referencedRelation: "ingredientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus_semanales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_usuario_id_fkey"
            columns: ["usuario_id"]
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
      admin_set_profile_access: {
        Args: { p_banned: boolean; p_role: string; p_user_id: string }
        Returns: string
      }
      count_public_recipes: {
        Args: {
          p_allergen_ids?: string[]
          p_max_time?: number
          p_query?: string
        }
        Returns: number
      }
      delete_ingredient: { Args: { p_id: string }; Returns: undefined }
      delete_user_account: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      get_public_recipe_authors: {
        Args: { p_recipe_ids: string[] }
        Returns: {
          avatar_path: string | null
          display_name: string | null
          recipe_id: string
        }[]
      }
      is_active_user: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      regenerate_shopping_list: {
        Args: { p_week: string }
        Returns: Database["public"]["Tables"]["shopping_list_items"]["Row"][]
      }
      save_ingredient: {
        Args: {
          p_alergeno_ids: string[]
          p_categoria_id?: string
          p_id?: string
          p_nombre: string
        }
        Returns: string
      }
      save_menu_slot: {
        Args: {
          p_day: string
          p_meal: string
          p_recipe_id?: string
          p_week: string
        }
        Returns: string
      }
      save_recipe: {
        Args: {
          p_descripcion?: string
          p_id: string
          p_imagen_url?: string
          p_ingredientes: Json
          p_instrucciones: string[]
          p_porciones: number
          p_publica: boolean
          p_tiempo_preparacion: number
          p_titulo: string
        }
        Returns: string
      }
      search_public_recipes: {
        Args: {
          p_allergen_ids?: string[]
          p_limit?: number
          p_max_time?: number
          p_offset?: number
          p_query?: string
        }
        Returns: {
          created_at: string
          descripcion: string
          id: string
          imagen_url: string
          porciones: number
          tiempo_preparacion: number
          titulo: string
          total_count: number
        }[]
      }
      set_shopping_item_purchased: {
        Args: { p_item_id: string; p_purchased: boolean }
        Returns: string
      }
      storage_recipe_is_public: {
        Args: { object_name: string }
        Returns: boolean
      }
      storage_avatar_is_public: {
        Args: { object_name: string }
        Returns: boolean
      }
      update_my_profile: {
        Args: {
          p_allergen_ids?: string[]
          p_avatar_path: string | null
          p_display_name: string
        }
        Returns: string
      }
      valid_recipe_instructions: {
        Args: { value: string[] }
        Returns: boolean
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
