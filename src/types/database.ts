export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type ProfileRole = "client" | "barber" | "admin";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: ProfileRole;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          preferred_barber_id: string | null;
          loyalty_points: number;
          is_active: boolean;
          deleted_at: string | null;
          internal_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      client_preferences: {
        Row: {
          user_id: string;
          favorite_barber_id: string | null;
          favorite_service_id: string | null;
          personal_notes: string | null;
          birthday: string | null;
          marketing_opt_in: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["client_preferences"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["client_preferences"]["Row"]>;
        Relationships: [];
      };
      barbers: {
        Row: {
          id: string;
          profile_id: string | null;
          name: string;
          slug: string;
          bio: string | null;
          specialties: string[];
          photo_url: string | null;
          rating: number;
          is_featured: boolean;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["barbers"]["Row"]> & {
          name: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["barbers"]["Row"]>;
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          duration_minutes: number;
          buffer_minutes: number;
          price_cents: number;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["services"]["Row"]> & {
          slug: string;
          name: string;
          description: string;
          duration_minutes: number;
          price_cents: number;
        };
        Update: Partial<Database["public"]["Tables"]["services"]["Row"]>;
        Relationships: [];
      };
      business_settings: {
        Row: {
          id: boolean;
          business_name: string;
          timezone: string;
          min_notice_minutes: number;
          max_advance_days: number;
          cancellation_limit_minutes: number;
          reschedule_limit_minutes: number;
          slot_interval_minutes: number;
          default_buffer_minutes: number;
          whatsapp_phone: string | null;
          email: string | null;
          address: string | null;
          notification_cron_last_run_at: string | null;
          notification_cron_last_result: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["business_settings"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["business_settings"]["Row"]>;
        Relationships: [];
      };
      availability_rules: {
        Row: {
          id: string;
          barber_id: string | null;
          weekday: number;
          start_time: string;
          end_time: string;
          break_start: string | null;
          break_end: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["availability_rules"]["Row"]> & {
          weekday: number;
          start_time: string;
          end_time: string;
        };
        Update: Partial<Database["public"]["Tables"]["availability_rules"]["Row"]>;
        Relationships: [];
      };
      blocked_slots: {
        Row: {
          id: string;
          barber_id: string | null;
          starts_at: string;
          ends_at: string;
          reason: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["blocked_slots"]["Row"]> & {
          starts_at: string;
          ends_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["blocked_slots"]["Row"]>;
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          user_id: string | null;
          barber_id: string;
          service_id: string;
          starts_at: string;
          ends_at: string;
          status: AppointmentStatus;
          customer_name: string;
          customer_email: string | null;
          customer_phone: string;
          guest_lookup_code: string;
          guest_access_token_hash: string;
          notes: string | null;
          internal_notes: string | null;
          source: string;
          cancel_reason: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["appointments"]["Row"]> & {
          barber_id: string;
          service_id: string;
          starts_at: string;
          ends_at: string;
          customer_name: string;
          customer_phone: string;
          guest_lookup_code: string;
          guest_access_token_hash: string;
        };
        Update: Partial<Database["public"]["Tables"]["appointments"]["Row"]>;
        Relationships: [];
      };
      appointment_guests: {
        Row: {
          appointment_id: string;
          name: string;
          email: string | null;
          phone: string;
          lookup_code: string;
          access_token_hash: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["appointment_guests"]["Row"]> & {
          appointment_id: string;
          name: string;
          phone: string;
          lookup_code: string;
          access_token_hash: string;
        };
        Update: Partial<Database["public"]["Tables"]["appointment_guests"]["Row"]>;
        Relationships: [];
      };
      appointment_reviews: {
        Row: {
          id: string;
          appointment_id: string;
          profile_id: string | null;
          barber_id: string;
          service_id: string;
          customer_name: string;
          rating: number;
          comment: string;
          is_public: boolean;
          is_approved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["appointment_reviews"]["Row"]> & {
          appointment_id: string;
          barber_id: string;
          service_id: string;
          customer_name: string;
          rating: number;
          comment: string;
        };
        Update: Partial<Database["public"]["Tables"]["appointment_reviews"]["Row"]>;
        Relationships: [];
      };
      contact_messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          message: string;
          status: string;
          ip_hash: string | null;
          user_agent_hash: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["contact_messages"]["Row"]> & {
          name: string;
          email: string;
          message: string;
        };
        Update: Partial<Database["public"]["Tables"]["contact_messages"]["Row"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          appointment_id: string | null;
          channel: string;
          destination: string;
          status: string;
          payload: Json;
          error_message: string | null;
          sent_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          channel: string;
          destination: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_table: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]> & {
          action: string;
          entity_table: string;
        };
        Update: never;
        Relationships: [];
      };
      appointment_status_history: {
        Row: {
          id: string;
          appointment_id: string;
          previous_status: AppointmentStatus | null;
          next_status: AppointmentStatus;
          reason: string | null;
          actor_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["appointment_status_history"]["Row"]> & {
          appointment_id: string;
          next_status: AppointmentStatus;
        };
        Update: Partial<Database["public"]["Tables"]["appointment_status_history"]["Row"]>;
        Relationships: [];
      };
      rate_limits: {
        Row: {
          key: string;
          bucket: string;
          hits: number;
          window_start: string;
          created_at: string;
        };
        Insert: Database["public"]["Tables"]["rate_limits"]["Row"];
        Update: Partial<Database["public"]["Tables"]["rate_limits"]["Row"]>;
        Relationships: [];
      };
      loyalty_events: {
        Row: {
          id: string;
          profile_id: string | null;
          appointment_id: string | null;
          points_delta: number;
          reason: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["loyalty_events"]["Row"]> & {
          points_delta: number;
          reason: string;
        };
        Update: Partial<Database["public"]["Tables"]["loyalty_events"]["Row"]>;
        Relationships: [];
      };
      payment_records: {
        Row: {
          id: string;
          appointment_id: string | null;
          profile_id: string | null;
          provider: "stripe" | "manual";
          provider_reference: string | null;
          amount_cents: number;
          currency: string;
          status: "pending" | "requires_action" | "paid" | "failed" | "refunded" | "cancelled";
          metadata: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["payment_records"]["Row"]> & {
          amount_cents: number;
        };
        Update: Partial<Database["public"]["Tables"]["payment_records"]["Row"]>;
        Relationships: [];
      };
      notification_jobs: {
        Row: {
          id: string;
          appointment_id: string | null;
          channel: "email" | "whatsapp";
          template: string;
          scheduled_for: string;
          status: "queued" | "sent" | "failed" | "cancelled";
          attempts: number;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notification_jobs"]["Row"]> & {
          channel: "email" | "whatsapp";
          template: string;
          scheduled_for: string;
        };
        Update: Partial<Database["public"]["Tables"]["notification_jobs"]["Row"]>;
        Relationships: [];
      };
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      check_rate_limit: {
        Args: {
          p_key: string;
          p_bucket: string;
          p_limit: number;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
      active_admin_count: {
        Args: {
          p_excluding?: string | null;
        };
        Returns: number;
      };
      soft_delete_profile: {
        Args: {
          p_profile_id: string;
          p_actor_id?: string | null;
        };
        Returns: void;
      };
      get_guest_appointment_details: {
        Args: {
          p_code: string;
          p_contact: string;
        };
        Returns: Array<{
          id: string;
          service_id: string;
          barber_id: string;
          starts_at: string;
          ends_at: string;
          status: AppointmentStatus;
          customer_name: string;
          customer_email: string | null;
          customer_phone: string;
          service_name: string;
          service_price_cents: number;
          service_duration_minutes: number;
          barber_name: string;
        }>;
      };
    };
    Views: Record<string, never>;
    Enums: {
      profile_role: ProfileRole;
      appointment_status: AppointmentStatus;
      notification_status: "queued" | "sent" | "failed" | "cancelled";
      contact_status: "new" | "read" | "archived";
    };
    CompositeTypes: Record<string, never>;
  };
};
