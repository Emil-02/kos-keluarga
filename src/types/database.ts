
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "announcements": {
                  Row: {
                    "body": string,"created_at": string,"created_by": string | null,"id": string,"sent_notification": boolean,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"sent_notification"?: boolean,"title": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"sent_notification"?: boolean,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "announcements_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"bookings": {
                  Row: {
                    "admin_note": string | null,"code": string,"created_at": string,"decided_at": string | null,"duration": number,"email": string,"end_date": string | null,"full_name": string,"id": string,"id_card_path": string | null,"note": string | null,"occupants": number,"period": Database["public"]['Enums']["rent_period"],"phone": string,"room_id": string | null,"start_date": string,"status": Database["public"]['Enums']["booking_status"],"tenancy_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_note"?: string | null,"code": string,"created_at"?: string,"decided_at"?: string | null,"duration": number,"email": string,"end_date"?: never,"full_name": string,"id"?: string,"id_card_path"?: string | null,"note"?: string | null,"occupants"?: number,"period": Database["public"]['Enums']["rent_period"],"phone": string,"room_id"?: string | null,"start_date": string,"status"?: Database["public"]['Enums']["booking_status"],"tenancy_id"?: string | null
                  }
                  Update: {
                    "admin_note"?: string | null,"code"?: string,"created_at"?: string,"decided_at"?: string | null,"duration"?: number,"email"?: string,"end_date"?: never,"full_name"?: string,"id"?: string,"id_card_path"?: string | null,"note"?: string | null,"occupants"?: number,"period"?: Database["public"]['Enums']["rent_period"],"phone"?: string,"room_id"?: string | null,"start_date"?: string,"status"?: Database["public"]['Enums']["booking_status"],"tenancy_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookings_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_tenancy_fk"
      columns: ["tenancy_id"]
isOneToOne: false
      referencedRelation: "tenancies"
      referencedColumns: ["id"]
    }
                  ]
                },"complaints": {
                  Row: {
                    "admin_response": string | null,"created_at": string,"description": string,"id": string,"photo_path": string | null,"room_id": string | null,"status": Database["public"]['Enums']["complaint_status"],"tenant_id": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_response"?: string | null,"created_at"?: string,"description": string,"id"?: string,"photo_path"?: string | null,"room_id"?: string | null,"status"?: Database["public"]['Enums']["complaint_status"],"tenant_id": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "admin_response"?: string | null,"created_at"?: string,"description"?: string,"id"?: string,"photo_path"?: string | null,"room_id"?: string | null,"status"?: Database["public"]['Enums']["complaint_status"],"tenant_id"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "complaints_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "complaints_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"expenses": {
                  Row: {
                    "amount": number,"category": string,"created_at": string,"description": string | null,"id": string,"spent_on": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"category": string,"created_at"?: string,"description"?: string | null,"id"?: string,"spent_on"?: string
                  }
                  Update: {
                    "amount"?: number,"category"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"spent_on"?: string
                  }
                  Relationships: [
                    
                  ]
                },"facilities": {
                  Row: {
                    "created_at": string,"description": string | null,"icon": string,"id": string,"is_room_facility": boolean,"name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"icon"?: string,"id"?: string,"is_room_facility"?: boolean,"name": string,"sort_order"?: number
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"icon"?: string,"id"?: string,"is_room_facility"?: boolean,"name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"gallery": {
                  Row: {
                    "caption": string | null,"created_at": string,"id": string,"image_path": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "caption"?: string | null,"created_at"?: string,"id"?: string,"image_path": string,"sort_order"?: number
                  }
                  Update: {
                    "caption"?: string | null,"created_at"?: string,"id"?: string,"image_path"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"invoices": {
                  Row: {
                    "amount": number,"created_at": string,"description": string,"due_date": string,"id": string,"number": string,"paid_at": string | null,"period_end": string | null,"period_start": string | null,"status": Database["public"]['Enums']["invoice_status"],"tenancy_id": string,"type": Database["public"]['Enums']["invoice_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"description": string,"due_date": string,"id"?: string,"number"?: string,"paid_at"?: string | null,"period_end"?: string | null,"period_start"?: string | null,"status"?: Database["public"]['Enums']["invoice_status"],"tenancy_id": string,"type"?: Database["public"]['Enums']["invoice_type"]
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"description"?: string,"due_date"?: string,"id"?: string,"number"?: string,"paid_at"?: string | null,"period_end"?: string | null,"period_start"?: string | null,"status"?: Database["public"]['Enums']["invoice_status"],"tenancy_id"?: string,"type"?: Database["public"]['Enums']["invoice_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "invoices_tenancy_id_fkey"
      columns: ["tenancy_id"]
isOneToOne: false
      referencedRelation: "tenancies"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications_log": {
                  Row: {
                    "body": string,"channel": string,"created_at": string,"error": string | null,"id": string,"invoice_id": string | null,"kind": string,"recipient": string,"status": string,"subject": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"channel": string,"created_at"?: string,"error"?: string | null,"id"?: string,"invoice_id"?: string | null,"kind": string,"recipient": string,"status": string,"subject"?: string | null
                  }
                  Update: {
                    "body"?: string,"channel"?: string,"created_at"?: string,"error"?: string | null,"id"?: string,"invoice_id"?: string | null,"kind"?: string,"recipient"?: string,"status"?: string,"subject"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_log_invoice_id_fkey"
      columns: ["invoice_id"]
isOneToOne: false
      referencedRelation: "invoices"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "admin_note": string | null,"amount": number,"created_at": string,"id": string,"invoice_id": string,"method": Database["public"]['Enums']["payment_method"],"note": string | null,"paid_on": string,"proof_path": string | null,"status": Database["public"]['Enums']["payment_status"],"submitted_by": string | null,"verified_at": string | null,"verified_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_note"?: string | null,"amount": number,"created_at"?: string,"id"?: string,"invoice_id": string,"method"?: Database["public"]['Enums']["payment_method"],"note"?: string | null,"paid_on"?: string,"proof_path"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"submitted_by"?: string | null,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Update: {
                    "admin_note"?: string | null,"amount"?: number,"created_at"?: string,"id"?: string,"invoice_id"?: string,"method"?: Database["public"]['Enums']["payment_method"],"note"?: string | null,"paid_on"?: string,"proof_path"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"submitted_by"?: string | null,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_invoice_id_fkey"
      columns: ["invoice_id"]
isOneToOne: false
      referencedRelation: "invoices"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_submitted_by_fkey"
      columns: ["submitted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_verified_by_fkey"
      columns: ["verified_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "address": string | null,"created_at": string,"email": string | null,"full_name": string,"id": string,"id_card_path": string | null,"phone": string | null,"role": Database["public"]['Enums']["user_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string,"id": string,"id_card_path"?: string | null,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"]
                  }
                  Update: {
                    "address"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string,"id"?: string,"id_card_path"?: string | null,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"]
                  }
                  Relationships: [
                    
                  ]
                },"rooms": {
                  Row: {
                    "created_at": string,"floor": number,"id": string,"notes": string | null,"number": string,"status": Database["public"]['Enums']["room_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"floor"?: number,"id"?: string,"notes"?: string | null,"number": string,"status"?: Database["public"]['Enums']["room_status"]
                  }
                  Update: {
                    "created_at"?: string,"floor"?: number,"id"?: string,"notes"?: string | null,"number"?: string,"status"?: Database["public"]['Enums']["room_status"]
                  }
                  Relationships: [
                    
                  ]
                },"settings": {
                  Row: {
                    "address": string,"bank_account_name": string | null,"bank_account_number": string | null,"bank_name": string | null,"deposit": number,"description": string,"email": string | null,"id": number,"kos_name": string,"maps_embed_url": string | null,"price_daily": number,"price_monthly": number,"price_weekly": number,"qris_path": string | null,"room_features": (string)[],"room_size": string | null,"rules": (string)[],"tagline": string,"updated_at": string,"whatsapp": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string,"bank_account_name"?: string | null,"bank_account_number"?: string | null,"bank_name"?: string | null,"deposit"?: number,"description"?: string,"email"?: string | null,"id"?: number,"kos_name"?: string,"maps_embed_url"?: string | null,"price_daily"?: number,"price_monthly"?: number,"price_weekly"?: number,"qris_path"?: string | null,"room_features"?: (string)[],"room_size"?: string | null,"rules"?: (string)[],"tagline"?: string,"updated_at"?: string,"whatsapp"?: string
                  }
                  Update: {
                    "address"?: string,"bank_account_name"?: string | null,"bank_account_number"?: string | null,"bank_name"?: string | null,"deposit"?: number,"description"?: string,"email"?: string | null,"id"?: number,"kos_name"?: string,"maps_embed_url"?: string | null,"price_daily"?: number,"price_monthly"?: number,"price_weekly"?: number,"qris_path"?: string | null,"room_features"?: (string)[],"room_size"?: string | null,"rules"?: (string)[],"tagline"?: string,"updated_at"?: string,"whatsapp"?: string
                  }
                  Relationships: [
                    
                  ]
                },"tenancies": {
                  Row: {
                    "auto_renew": boolean,"booking_id": string | null,"created_at": string,"deposit": number,"end_date": string | null,"ended_at": string | null,"id": string,"notes": string | null,"paid_until": string,"period": Database["public"]['Enums']["rent_period"],"price": number,"room_id": string,"start_date": string,"status": Database["public"]['Enums']["tenancy_status"],"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auto_renew"?: boolean,"booking_id"?: string | null,"created_at"?: string,"deposit"?: number,"end_date"?: string | null,"ended_at"?: string | null,"id"?: string,"notes"?: string | null,"paid_until": string,"period": Database["public"]['Enums']["rent_period"],"price": number,"room_id": string,"start_date": string,"status"?: Database["public"]['Enums']["tenancy_status"],"tenant_id": string
                  }
                  Update: {
                    "auto_renew"?: boolean,"booking_id"?: string | null,"created_at"?: string,"deposit"?: number,"end_date"?: string | null,"ended_at"?: string | null,"id"?: string,"notes"?: string | null,"paid_until"?: string,"period"?: Database["public"]['Enums']["rent_period"],"price"?: number,"room_id"?: string,"start_date"?: string,"status"?: Database["public"]['Enums']["tenancy_status"],"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenancies_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tenancies_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tenancies_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"testimonials": {
                  Row: {
                    "content": string,"created_at": string,"id": string,"is_published": boolean,"name": string,"rating": number
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"name": string,"rating"?: number
                  }
                  Update: {
                    "content"?: string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"name"?: string,"rating"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "approve_booking":
{ Args: { "p_admin_note"?: string,"p_booking_id": string,"p_room_id": string,"p_tenant_id": string }; Returns: string
                           },
"available_rooms":
{ Args: { "p_end": string,"p_start": string }; Returns: {
              "floor": number,"id": string,"number": string
            }[]
                           },
"checkout_tenancy":
{ Args: { "p_date": string,"p_tenancy_id": string }; Returns: undefined
                           },
"count_available_rooms":
{ Args: { "p_end": string,"p_start": string }; Returns: number
                           },
"extend_tenancy":
{ Args: { "p_periods": number,"p_tenancy_id": string }; Returns: string
                           },
"generate_recurring_invoices":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"mark_invoice_paid":
{ Args: { "p_invoice_id": string }; Returns: undefined
                           },
"next_billing_start":
{ Args: { "p_tenancy_id": string }; Returns: string
                           },
"period_add":
{ Args: { "d": string,"n": number,"p": Database["public"]['Enums']["rent_period"] }; Returns: string
                           },
"record_payment":
{ Args: { "p_invoice_id": string,"p_method": Database["public"]['Enums']["payment_method"],"p_note"?: string,"p_paid_on": string }; Returns: string
                           },
"submit_payment":
{ Args: { "p_invoice_id": string,"p_method": Database["public"]['Enums']["payment_method"],"p_note"?: string,"p_paid_on": string,"p_proof_path": string }; Returns: string
                           },
"today_wib":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"verify_payment":
{ Args: { "p_admin_note"?: string,"p_approve": boolean,"p_payment_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "booking_status": "menunggu"|"disetujui"|"ditolak"|"dibatalkan","complaint_status": "baru"|"diproses"|"selesai","invoice_status": "belum_bayar"|"menunggu_verifikasi"|"lunas"|"dibatalkan","invoice_type": "sewa"|"deposit"|"listrik"|"denda"|"lainnya","payment_method": "transfer"|"qris"|"tunai","payment_status": "menunggu"|"diterima"|"ditolak","rent_period": "harian"|"mingguan"|"bulanan","room_status": "aktif"|"perbaikan","tenancy_status": "aktif"|"selesai","user_role": "admin"|"penghuni"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "booking_status": ["menunggu", "disetujui", "ditolak", "dibatalkan"],"complaint_status": ["baru", "diproses", "selesai"],"invoice_status": ["belum_bayar", "menunggu_verifikasi", "lunas", "dibatalkan"],"invoice_type": ["sewa", "deposit", "listrik", "denda", "lainnya"],"payment_method": ["transfer", "qris", "tunai"],"payment_status": ["menunggu", "diterima", "ditolak"],"rent_period": ["harian", "mingguan", "bulanan"],"room_status": ["aktif", "perbaikan"],"tenancy_status": ["aktif", "selesai"],"user_role": ["admin", "penghuni"]
          }
        }
} as const
