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
      favoritos: {
        Row: {
          created_at: string
          receta_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          receta_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          receta_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favoritos_receta_id_fkey"
            columns: ["receta_id"]
            isOneToOne: false
            referencedRelation: "recetas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favoritos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grupo_invitaciones: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          grupo_id: string
          id: string
          invited_by: string
          responded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          grupo_id: string
          id?: string
          invited_by: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          grupo_id?: string
          id?: string
          invited_by?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupo_invitaciones_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grupo_invitaciones_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grupo_miembros: {
        Row: {
          grupo_id: string
          joined_at: string
          rol: string
          usuario_id: string
        }
        Insert: {
          grupo_id: string
          joined_at?: string
          rol?: string
          usuario_id: string
        }
        Update: {
          grupo_id?: string
          joined_at?: string
          rol?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupo_miembros_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grupo_miembros_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos: {
        Row: {
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre?: string
        }
        Update: {
          created_at?: string
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
          dia_semana: string | null
          id: string
          menu_id: string
          receta_id: string
          tipo_comida: string | null
        }
        Insert: {
          dia_semana?: string | null
          id?: string
          menu_id: string
          receta_id: string
          tipo_comida?: string | null
        }
        Update: {
          dia_semana?: string | null
          id?: string
          menu_id?: string
          receta_id?: string
          tipo_comida?: string | null
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
          grupo_id: string
          id: string
          semana_inicio: string
          usuario_id: string
        }
        Insert: {
          created_at?: string | null
          grupo_id: string
          id?: string
          semana_inicio?: string
          usuario_id: string
        }
        Update: {
          created_at?: string | null
          grupo_id?: string
          id?: string
          semana_inicio?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menus_semanales_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menus_semanales_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          tipo_comida: string[]
          titulo: string
          updated_at: string
          video_url: string | null
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
          tipo_comida?: string[]
          titulo: string
          updated_at?: string
          video_url?: string | null
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
          tipo_comida?: string[]
          titulo?: string
          updated_at?: string
          video_url?: string | null
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
      shopping_list_extra: {
        Row: {
          cantidad: number
          comprado: boolean
          created_at: string
          grupo_id: string
          id: string
          ingrediente_id: string | null
          nombre_personalizado: string | null
          unidad: string
          usuario_id: string
        }
        Insert: {
          cantidad: number
          comprado?: boolean
          created_at?: string
          grupo_id: string
          id?: string
          ingrediente_id?: string | null
          nombre_personalizado?: string | null
          unidad: string
          usuario_id: string
        }
        Update: {
          cantidad?: number
          comprado?: boolean
          created_at?: string
          grupo_id?: string
          id?: string
          ingrediente_id?: string | null
          nombre_personalizado?: string | null
          unidad?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_extra_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_extra_ingrediente_id_fkey"
            columns: ["ingrediente_id"]
            isOneToOne: false
            referencedRelation: "ingredientes"
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
      accept_group_invitation: {
        Args: { p_invitation_id: string }
        Returns: string
      }
      add_group_member: { Args: { p_email: string }; Returns: string }
      add_menu_recipe: {
        Args: { p_recipe_id: string; p_week: string }
        Returns: string
      }
      add_recipe_to_shopping_list: {
        Args: { p_receta_id: string }
        Returns: {
          cantidad: number
          comprado: boolean
          created_at: string
          grupo_id: string
          id: string
          ingrediente_id: string | null
          nombre_personalizado: string | null
          unidad: string
          usuario_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "shopping_list_extra"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_set_profile_access: {
        Args: { p_banned: boolean; p_role: string; p_user_id: string }
        Returns: string
      }
      clear_shopping_list: { Args: { p_week: string }; Returns: undefined }
      count_public_recipes: {
        Args: {
          p_allergen_ids?: string[]
          p_max_time?: number
          p_meal_types?: string[]
          p_query?: string
        }
        Returns: number
      }
      create_group_invitation: {
        Args: { p_email: string }
        Returns: {
          created_at: string
          email: string
          expires_at: string
          grupo_id: string
          id: string
          invited_by: string
          responded_at: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "grupo_invitaciones"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decline_group_invitation: {
        Args: { p_invitation_id: string }
        Returns: string
      }
      delete_ingredient: { Args: { p_id: string }; Returns: undefined }
      delete_user_account: { Args: { p_user_id: string }; Returns: boolean }
      get_public_recipe_authors: {
        Args: { p_recipe_ids: string[] }
        Returns: {
          avatar_path: string
          display_name: string
          recipe_id: string
        }[]
      }
      is_active_user: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_group_mate: { Args: { p_creador_id: string }; Returns: boolean }
      list_group_invitations: {
        Args: never
        Returns: {
          created_at: string
          email: string
          expires_at: string
          grupo_id: string
          id: string
          invited_by: string
          responded_at: string | null
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "grupo_invitaciones"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_group_members: {
        Args: never
        Returns: {
          avatar_path: string
          display_name: string
          email: string
          es_yo: boolean
          rol: string
          usuario_id: string
        }[]
      }
      list_pending_invitations_for_me: {
        Args: never
        Returns: {
          created_at: string
          expires_at: string
          grupo_id: string
          grupo_nombre: string
          id: string
          invited_by_nombre: string
        }[]
      }
      my_grupo_id: { Args: never; Returns: string }
      regenerate_shopping_list: {
        Args: { p_week: string }
        Returns: {
          cantidad: number
          comprado: boolean
          created_at: string
          id: string
          ingrediente_id: string | null
          menu_id: string
          nombre_personalizado: string | null
          unidad: string
          usuario_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "shopping_list_items"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      remove_extra_item: { Args: { p_item_id: string }; Returns: string }
      remove_group_member: { Args: { p_target_id: string }; Returns: string }
      remove_menu_recipe: {
        Args: { p_recipe_id: string; p_week: string }
        Returns: string
      }
      remove_shopping_item: { Args: { p_item_id: string }; Returns: string }
      revoke_group_invitation: {
        Args: { p_invitation_id: string }
        Returns: string
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
      save_recipe:
        | {
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
        | {
            Args: {
              p_descripcion: string
              p_id: string
              p_imagen_url: string
              p_ingredientes: Json
              p_instrucciones: string[]
              p_porciones: number
              p_publica: boolean
              p_tiempo_preparacion: number
              p_titulo: string
              p_video_url: string
            }
            Returns: string
          }
        | {
            Args: {
              p_descripcion: string
              p_id: string
              p_imagen_url: string
              p_ingredientes: Json
              p_instrucciones: string[]
              p_porciones: number
              p_publica: boolean
              p_tiempo_preparacion: number
              p_tipo_comida: string[]
              p_titulo: string
              p_video_url: string
            }
            Returns: string
          }
      search_admin_recetas: {
        Args: {
          p_aprobada?: boolean
          p_limit?: number
          p_offset?: number
          p_publica?: boolean
          p_query?: string
        }
        Returns: {
          aprobada: boolean
          autor_email: string
          created_at: string
          descripcion: string
          id: string
          porciones: number
          publica: boolean
          tiempo_preparacion: number
          titulo: string
          total_count: number
        }[]
      }
      search_public_recipes: {
        Args: {
          p_allergen_ids?: string[]
          p_limit?: number
          p_max_time?: number
          p_meal_types?: string[]
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
          tipo_comida: string[]
          titulo: string
          total_count: number
        }[]
      }
      set_extra_item_purchased: {
        Args: { p_item_id: string; p_purchased: boolean }
        Returns: string
      }
      set_shopping_item_purchased: {
        Args: { p_item_id: string; p_purchased: boolean }
        Returns: string
      }
      storage_avatar_is_public: {
        Args: { object_name: string }
        Returns: boolean
      }
      storage_recipe_is_public: {
        Args: { object_name: string }
        Returns: boolean
      }
      toggle_favorite: { Args: { p_receta_id: string }; Returns: boolean }
      update_my_profile: {
        Args: {
          p_allergen_ids?: string[]
          p_avatar_path: string
          p_display_name: string
        }
        Returns: string
      }
      valid_recipe_instructions: { Args: { value: string[] }; Returns: boolean }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

