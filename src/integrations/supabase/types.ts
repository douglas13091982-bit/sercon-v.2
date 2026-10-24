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
      acessos_prestadores: {
        Row: {
          autorizado_por: string | null
          condominio_id: string
          created_at: string
          documento: string | null
          empresa: string | null
          entrada_em: string
          id: string
          nome: string
          registrado_por: string | null
          saida_em: string | null
          servico: string
          unidade_id: string
        }
        Insert: {
          autorizado_por?: string | null
          condominio_id: string
          created_at?: string
          documento?: string | null
          empresa?: string | null
          entrada_em?: string
          id?: string
          nome: string
          registrado_por?: string | null
          saida_em?: string | null
          servico: string
          unidade_id: string
        }
        Update: {
          autorizado_por?: string | null
          condominio_id?: string
          created_at?: string
          documento?: string | null
          empresa?: string | null
          entrada_em?: string
          id?: string
          nome?: string
          registrado_por?: string | null
          saida_em?: string | null
          servico?: string
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acessos_prestadores_unidade_id_condominio_id_fkey"
            columns: ["unidade_id", "condominio_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id", "condominio_id"]
          },
        ]
      }
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
      chamados: {
        Row: {
          aberto_por: string | null
          atualizado_em: string
          categoria: string
          concluido_em: string | null
          condominio_id: string
          criado_em: string
          custo: number | null
          descricao: string | null
          id: string
          local: string | null
          prioridade: string
          responsavel: string | null
          status: string
          titulo: string
          unidade_id: string | null
        }
        Insert: {
          aberto_por?: string | null
          atualizado_em?: string
          categoria?: string
          concluido_em?: string | null
          condominio_id: string
          criado_em?: string
          custo?: number | null
          descricao?: string | null
          id?: string
          local?: string | null
          prioridade?: string
          responsavel?: string | null
          status?: string
          titulo: string
          unidade_id?: string | null
        }
        Update: {
          aberto_por?: string | null
          atualizado_em?: string
          categoria?: string
          concluido_em?: string | null
          condominio_id?: string
          criado_em?: string
          custo?: number | null
          descricao?: string | null
          id?: string
          local?: string | null
          prioridade?: string
          responsavel?: string | null
          status?: string
          titulo?: string
          unidade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chamados_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_unidade_id_condominio_id_fkey"
            columns: ["unidade_id", "condominio_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id", "condominio_id"]
          },
        ]
      }
      cobrancas_taxas_adicionais: {
        Row: {
          competencia: string
          condominio_id: string
          created_at: string
          descricao: string
          id: string
          status: string
          taxa_id: string
          unidade_id: string
          valor: number
          vencimento: string
        }
        Insert: {
          competencia: string
          condominio_id: string
          created_at?: string
          descricao: string
          id?: string
          status?: string
          taxa_id: string
          unidade_id: string
          valor: number
          vencimento: string
        }
        Update: {
          competencia?: string
          condominio_id?: string
          created_at?: string
          descricao?: string
          id?: string
          status?: string
          taxa_id?: string
          unidade_id?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_taxas_adicionais_taxa_id_condominio_id_fkey"
            columns: ["taxa_id", "condominio_id"]
            isOneToOne: false
            referencedRelation: "taxas_adicionais"
            referencedColumns: ["id", "condominio_id"]
          },
          {
            foreignKeyName: "cobrancas_taxas_adicionais_unidade_id_condominio_id_fkey"
            columns: ["unidade_id", "condominio_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id", "condominio_id"]
          },
        ]
      }
      cobrancas_unidade: {
        Row: {
          competencia: string
          condominio_id: string
          created_at: string
          descricao: string
          id: string
          leitura_id: string | null
          status: string
          tipo: string
          unidade_id: string
          valor: number
          vencimento: string
        }
        Insert: {
          competencia: string
          condominio_id: string
          created_at?: string
          descricao: string
          id?: string
          leitura_id?: string | null
          status?: string
          tipo: string
          unidade_id: string
          valor: number
          vencimento: string
        }
        Update: {
          competencia?: string
          condominio_id?: string
          created_at?: string
          descricao?: string
          id?: string
          leitura_id?: string | null
          status?: string
          tipo?: string
          unidade_id?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_unidade_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_unidade_leitura_id_fkey"
            columns: ["leitura_id"]
            isOneToOne: false
            referencedRelation: "leituras_consumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_unidade_unidade_id_condominio_id_fkey"
            columns: ["unidade_id", "condominio_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id", "condominio_id"]
          },
        ]
      }
      comunicados: {
        Row: {
          autor_id: string | null
          condominio_id: string
          conteudo: string
          criado_em: string
          id: string
          tipo: string
          titulo: string
        }
        Insert: {
          autor_id?: string | null
          condominio_id: string
          conteudo: string
          criado_em?: string
          id?: string
          tipo?: string
          titulo: string
        }
        Update: {
          autor_id?: string | null
          condominio_id?: string
          conteudo?: string
          criado_em?: string
          id?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunicados_condominio_id_fkey"
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
      configuracoes_financeiras: {
        Row: {
          agua_modo: string
          condominio_id: string
          criterio_rateio_agua: string
          taxa_condominio: number
          updated_at: string
          valor_m3_agua: number
          valor_m3_gas: number
          vencimento_dia: number
        }
        Insert: {
          agua_modo?: string
          condominio_id: string
          criterio_rateio_agua?: string
          taxa_condominio?: number
          updated_at?: string
          valor_m3_agua?: number
          valor_m3_gas?: number
          vencimento_dia?: number
        }
        Update: {
          agua_modo?: string
          condominio_id?: string
          criterio_rateio_agua?: string
          taxa_condominio?: number
          updated_at?: string
          valor_m3_agua?: number
          valor_m3_gas?: number
          vencimento_dia?: number
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_financeiras_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: true
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
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
      despesas_condominio: {
        Row: {
          categoria: string
          condominio_id: string
          created_at: string
          criado_por: string | null
          data: string
          descricao: string
          documento_storage_path: string | null
          fornecedor: string | null
          id: string
          valor: number
        }
        Insert: {
          categoria?: string
          condominio_id: string
          created_at?: string
          criado_por?: string | null
          data?: string
          descricao: string
          documento_storage_path?: string | null
          fornecedor?: string | null
          id?: string
          valor: number
        }
        Update: {
          categoria?: string
          condominio_id?: string
          created_at?: string
          criado_por?: string | null
          data?: string
          descricao?: string
          documento_storage_path?: string | null
          fornecedor?: string | null
          id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_condominio_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
      encomendas: {
        Row: {
          avisado_em: string | null
          chegada_em: string
          condominio_id: string
          descricao: string
          id: string
          registrado_por: string | null
          retirada_em: string | null
          retirado_por: string | null
          status: string
          transportadora: string | null
          unidade_id: string
        }
        Insert: {
          avisado_em?: string | null
          chegada_em?: string
          condominio_id: string
          descricao: string
          id?: string
          registrado_por?: string | null
          retirada_em?: string | null
          retirado_por?: string | null
          status?: string
          transportadora?: string | null
          unidade_id: string
        }
        Update: {
          avisado_em?: string | null
          chegada_em?: string
          condominio_id?: string
          descricao?: string
          id?: string
          registrado_por?: string | null
          retirada_em?: string | null
          retirado_por?: string | null
          status?: string
          transportadora?: string | null
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "encomendas_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encomendas_unidade_id_condominio_id_fkey"
            columns: ["unidade_id", "condominio_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id", "condominio_id"]
          },
        ]
      }
      financeiro_competencias: {
        Row: {
          competencia: string
          condominio_id: string
          conta_agua: number
          incluir_aluguel_na_cobranca: boolean
          modo_rateio_agua: string
          tarifa_gas_m3: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          competencia: string
          condominio_id: string
          conta_agua?: number
          incluir_aluguel_na_cobranca?: boolean
          modo_rateio_agua?: string
          tarifa_gas_m3?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          competencia?: string
          condominio_id?: string
          conta_agua?: number
          incluir_aluguel_na_cobranca?: boolean
          modo_rateio_agua?: string
          tarifa_gas_m3?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_competencias_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
      leituras_consumo: {
        Row: {
          competencia: string
          condominio_id: string
          consumo: number | null
          created_at: string
          criado_por: string | null
          id: string
          leitura_anterior: number
          leitura_atual: number
          tipo: string
          unidade_id: string
          valor_total: number | null
          valor_unitario: number
        }
        Insert: {
          competencia: string
          condominio_id: string
          consumo?: number | null
          created_at?: string
          criado_por?: string | null
          id?: string
          leitura_anterior: number
          leitura_atual: number
          tipo: string
          unidade_id: string
          valor_total?: number | null
          valor_unitario: number
        }
        Update: {
          competencia?: string
          condominio_id?: string
          consumo?: number | null
          created_at?: string
          criado_por?: string | null
          id?: string
          leitura_anterior?: number
          leitura_atual?: number
          tipo?: string
          unidade_id?: string
          valor_total?: number | null
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "leituras_consumo_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leituras_consumo_unidade_id_condominio_id_fkey"
            columns: ["unidade_id", "condominio_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id", "condominio_id"]
          },
        ]
      }
      meios_pagamento_condominio: {
        Row: {
          ativo: boolean
          condominio_id: string
          created_at: string
          criado_por: string | null
          dados_publicos: Json
          id: string
          instrucoes: string | null
          nome: string
          ordem: number
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          condominio_id: string
          created_at?: string
          criado_por?: string | null
          dados_publicos?: Json
          id?: string
          instrucoes?: string | null
          nome: string
          ordem?: number
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          condominio_id?: string
          created_at?: string
          criado_por?: string | null
          dados_publicos?: Json
          id?: string
          instrucoes?: string | null
          nome?: string
          ordem?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meios_pagamento_condominio_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
      mercadopago_credenciais: {
        Row: {
          access_token_cifrado: string
          boleto_ativo: boolean
          cartao_ativo: boolean
          condominio_id: string
          pix_ativo: boolean
          public_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          access_token_cifrado: string
          boleto_ativo?: boolean
          cartao_ativo?: boolean
          condominio_id: string
          pix_ativo?: boolean
          public_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          access_token_cifrado?: string
          boleto_ativo?: boolean
          cartao_ativo?: boolean
          condominio_id?: string
          pix_ativo?: boolean
          public_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mercadopago_credenciais_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: true
            referencedRelation: "condominios"
            referencedColumns: ["id"]
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
      pagamentos_morador: {
        Row: {
          competencia: string
          condominio_id: string
          conferido_em: string | null
          conferido_por: string | null
          id: string
          informado_em: string
          meio_nome_snapshot: string
          meio_pagamento_id: string | null
          morador_id: string | null
          observacao: string | null
          referencia_externa: string | null
          status: string
          unidade_id: string
          user_id: string
          valor: number
        }
        Insert: {
          competencia: string
          condominio_id: string
          conferido_em?: string | null
          conferido_por?: string | null
          id?: string
          informado_em?: string
          meio_nome_snapshot: string
          meio_pagamento_id?: string | null
          morador_id?: string | null
          observacao?: string | null
          referencia_externa?: string | null
          status?: string
          unidade_id: string
          user_id?: string
          valor: number
        }
        Update: {
          competencia?: string
          condominio_id?: string
          conferido_em?: string | null
          conferido_por?: string | null
          id?: string
          informado_em?: string
          meio_nome_snapshot?: string
          meio_pagamento_id?: string | null
          morador_id?: string | null
          observacao?: string | null
          referencia_externa?: string | null
          status?: string
          unidade_id?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_morador_meio_pagamento_id_condominio_id_fkey"
            columns: ["meio_pagamento_id", "condominio_id"]
            isOneToOne: false
            referencedRelation: "meios_pagamento_condominio"
            referencedColumns: ["id", "condominio_id"]
          },
          {
            foreignKeyName: "pagamentos_morador_morador_id_fkey"
            columns: ["morador_id"]
            isOneToOne: false
            referencedRelation: "moradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_morador_unidade_id_condominio_id_fkey"
            columns: ["unidade_id", "condominio_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id", "condominio_id"]
          },
        ]
      }
      portaria_configuracoes: {
        Row: {
          condominio_id: string
          habilitada: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          condominio_id: string
          habilitada?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          condominio_id?: string
          habilitada?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portaria_configuracoes_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: true
            referencedRelation: "condominios"
            referencedColumns: ["id"]
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
      taxas_adicionais: {
        Row: {
          aplica_a: string
          ativa: boolean
          condominio_id: string
          created_at: string
          criado_por: string | null
          fim: string | null
          id: string
          inicio: string
          modo: string
          nome: string
          valor: number
        }
        Insert: {
          aplica_a?: string
          ativa?: boolean
          condominio_id: string
          created_at?: string
          criado_por?: string | null
          fim?: string | null
          id?: string
          inicio: string
          modo?: string
          nome: string
          valor: number
        }
        Update: {
          aplica_a?: string
          ativa?: boolean
          condominio_id?: string
          created_at?: string
          criado_por?: string | null
          fim?: string | null
          id?: string
          inicio?: string
          modo?: string
          nome?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "taxas_adicionais_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
      taxas_adicionais_unidades: {
        Row: {
          condominio_id: string
          created_at: string
          taxa_id: string
          unidade_id: string
        }
        Insert: {
          condominio_id: string
          created_at?: string
          taxa_id: string
          unidade_id: string
        }
        Update: {
          condominio_id?: string
          created_at?: string
          taxa_id?: string
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxas_adicionais_unidades_taxa_id_condominio_id_fkey"
            columns: ["taxa_id", "condominio_id"]
            isOneToOne: false
            referencedRelation: "taxas_adicionais"
            referencedColumns: ["id", "condominio_id"]
          },
          {
            foreignKeyName: "taxas_adicionais_unidades_unidade_id_condominio_id_fkey"
            columns: ["unidade_id", "condominio_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id", "condominio_id"]
          },
        ]
      }
      unidades: {
        Row: {
          agua_medidor: string | null
          aluguel_mensal: number
          andar: number | null
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
          vagas_estacionamento: string[]
        }
        Insert: {
          agua_medidor?: string | null
          aluguel_mensal?: number
          andar?: number | null
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
          vagas_estacionamento?: string[]
        }
        Update: {
          agua_medidor?: string | null
          aluguel_mensal?: number
          andar?: number | null
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
          vagas_estacionamento?: string[]
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
      veiculos_condominio: {
        Row: {
          condominio_id: string
          cor: string | null
          created_at: string
          criado_por: string | null
          entrada_em: string | null
          id: string
          modelo: string
          morador_id: string | null
          placa: string
          saida_em: string | null
          tipo: string
          unidade_id: string
          vaga: string | null
        }
        Insert: {
          condominio_id: string
          cor?: string | null
          created_at?: string
          criado_por?: string | null
          entrada_em?: string | null
          id?: string
          modelo: string
          morador_id?: string | null
          placa: string
          saida_em?: string | null
          tipo?: string
          unidade_id: string
          vaga?: string | null
        }
        Update: {
          condominio_id?: string
          cor?: string | null
          created_at?: string
          criado_por?: string | null
          entrada_em?: string | null
          id?: string
          modelo?: string
          morador_id?: string | null
          placa?: string
          saida_em?: string | null
          tipo?: string
          unidade_id?: string
          vaga?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_condominio_morador_id_fkey"
            columns: ["morador_id"]
            isOneToOne: false
            referencedRelation: "moradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_condominio_unidade_id_condominio_id_fkey"
            columns: ["unidade_id", "condominio_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id", "condominio_id"]
          },
        ]
      }
      visitantes: {
        Row: {
          autorizado_por: string | null
          condominio_id: string
          documento: string | null
          entrada_em: string
          id: string
          nome: string
          registrado_por: string | null
          saida_em: string | null
          tipo: string
          unidade_id: string
        }
        Insert: {
          autorizado_por?: string | null
          condominio_id: string
          documento?: string | null
          entrada_em?: string
          id?: string
          nome: string
          registrado_por?: string | null
          saida_em?: string | null
          tipo?: string
          unidade_id: string
        }
        Update: {
          autorizado_por?: string | null
          condominio_id?: string
          documento?: string | null
          entrada_em?: string
          id?: string
          nome?: string
          registrado_por?: string | null
          saida_em?: string | null
          tipo?: string
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitantes_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitantes_unidade_id_condominio_id_fkey"
            columns: ["unidade_id", "condominio_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id", "condominio_id"]
          },
        ]
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
      gerar_cobrancas_condominio: {
        Args: { _competencia: string }
        Returns: Json
      }
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
      portaria_module_habilitado: {
        Args: { _condominio_id: string }
        Returns: boolean
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
