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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          acao: string
          condominio_id: string | null
          criado_em: string
          id: string
          registro_id: string
          tabela: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          condominio_id?: string | null
          criado_em?: string
          id?: string
          registro_id: string
          tabela: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          condominio_id?: string | null
          criado_em?: string
          id?: string
          registro_id?: string
          tabela?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
      blocos: {
        Row: {
          condominio_id: string
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          condominio_id: string
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          condominio_id?: string
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocos_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
      condominios: {
        Row: {
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      convites_acesso: {
        Row: {
          aceito_em: string | null
          condominio_id: string
          criado_em: string
          criado_por: string | null
          email: string
          expira_em: string
          id: string
          morador_id: string | null
          papel: Database["public"]["Enums"]["app_role"]
          revogado_em: string | null
          token_hash: string
        }
        Insert: {
          aceito_em?: string | null
          condominio_id: string
          criado_em?: string
          criado_por?: string | null
          email: string
          expira_em?: string
          id?: string
          morador_id?: string | null
          papel: Database["public"]["Enums"]["app_role"]
          revogado_em?: string | null
          token_hash: string
        }
        Update: {
          aceito_em?: string | null
          condominio_id?: string
          criado_em?: string
          criado_por?: string | null
          email?: string
          expira_em?: string
          id?: string
          morador_id?: string | null
          papel?: Database["public"]["Enums"]["app_role"]
          revogado_em?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "convites_acesso_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convites_acesso_morador_id_condominio_id_fkey"
            columns: ["morador_id", "condominio_id"]
            isOneToOne: false
            referencedRelation: "moradores"
            referencedColumns: ["id", "condominio_id"]
          },
        ]
      }
      moradores: {
        Row: {
          condominio_id: string
          contrato: Json | null
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          pets: Json
          telefone: string | null
          tipo: string
          unidade_id: string | null
          user_id: string | null
          veiculos: Json
        }
        Insert: {
          condominio_id: string
          contrato?: Json | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          pets?: Json
          telefone?: string | null
          tipo?: string
          unidade_id?: string | null
          user_id?: string | null
          veiculos?: Json
        }
        Update: {
          condominio_id?: string
          contrato?: Json | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          pets?: Json
          telefone?: string | null
          tipo?: string
          unidade_id?: string | null
          user_id?: string | null
          veiculos?: Json
        }
        Relationships: [
          {
            foreignKeyName: "moradores_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moradores_unidade_id_condominio_id_fkey"
            columns: ["unidade_id", "condominio_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id", "condominio_id"]
          },
        ]
      }
      profiles: {
        Row: {
          condominio_id: string | null
          created_at: string
          email: string
          id: string
          nome: string
        }
        Insert: {
          condominio_id?: string | null
          created_at?: string
          email?: string
          id: string
          nome?: string
        }
        Update: {
          condominio_id?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades: {
        Row: {
          andar: number | null
          aluguel_mensal: number | null
          agua_medidor: string | null
          bloco_id: string
          condominio_id: string
          contrato_fim: string | null
          contrato_inicio: string | null
          contrato_nome: string | null
          contrato_storage_path: string | null
          created_at: string
          fracao_ideal: number | null
          gas_medidor: string | null
          id: string
          metragem: number | null
          numero: string
          status: string
        }
        Insert: {
          andar?: number | null
          aluguel_mensal?: number | null
          agua_medidor?: string | null
          bloco_id: string
          condominio_id: string
          contrato_fim?: string | null
          contrato_inicio?: string | null
          contrato_nome?: string | null
          contrato_storage_path?: string | null
          created_at?: string
          fracao_ideal?: number | null
          gas_medidor?: string | null
          id?: string
          metragem?: number | null
          numero: string
          status?: string
        }
        Update: {
          andar?: number | null
          aluguel_mensal?: number | null
          agua_medidor?: string | null
          bloco_id?: string
          condominio_id?: string
          contrato_fim?: string | null
          contrato_inicio?: string | null
          contrato_nome?: string | null
          contrato_storage_path?: string | null
          created_at?: string
          fracao_ideal?: number | null
          gas_medidor?: string | null
          id?: string
          metragem?: number | null
          numero?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidades_bloco_id_condominio_id_fkey"
            columns: ["bloco_id", "condominio_id"]
            isOneToOne: false
            referencedRelation: "blocos"
            referencedColumns: ["id", "condominio_id"]
          },
          {
            foreignKeyName: "unidades_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
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
      aceitar_convite: { Args: { _token: string }; Returns: undefined }
      criar_convite: {
        Args: {
          _email: string
          _morador_id?: string
          _papel: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
      current_condominio_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      listar_acessos: {
        Args: never
        Returns: {
          email: string
          nome: string
          papel: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      revogar_acesso: { Args: { _user_id: string }; Returns: undefined }
      revogar_convite: { Args: { _id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "super_admin" | "sindico" | "porteiro" | "morador"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["super_admin", "sindico", "porteiro", "morador"],
    },
  },
} as const
