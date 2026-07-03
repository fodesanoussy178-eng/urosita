// Types alignes manuellement sur supabase/migrations/000*.sql.
// A remplacer par `supabase gen types typescript` des que le projet est lie
// en CLI (cf. README) : la commande produira un fichier equivalent.

export type ProfileRole = 'worker' | 'structure_admin';
export type MissionStatus = 'open' | 'closed' | 'cancelled';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
export type PaymentStatus = 'pending' | 'held' | 'released' | 'failed';
export type DisputeStatus = 'open' | 'reviewing' | 'resolved' | 'rejected';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: ProfileRole;
          is_micro_entrepreneur: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          role?: ProfileRole;
          is_micro_entrepreneur?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      structures: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          siret: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          siret?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['structures']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'structures_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      missions: {
        Row: {
          id: string;
          structure_id: string;
          title: string;
          detail: string | null;
          city: string | null;
          scheduled_date: string;
          duration_minutes: number;
          worker_rate_cents: number;
          status: MissionStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          structure_id: string;
          title: string;
          detail?: string | null;
          city?: string | null;
          scheduled_date: string;
          duration_minutes: number;
          worker_rate_cents: number;
          status?: MissionStatus;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['missions']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'missions_structure_id_fkey';
            columns: ['structure_id'];
            isOneToOne: false;
            referencedRelation: 'structures';
            referencedColumns: ['id'];
          },
        ];
      };
      applications: {
        Row: {
          id: string;
          mission_id: string;
          worker_id: string;
          status: ApplicationStatus;
          checkin_token: string;
          checked_in_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          mission_id: string;
          worker_id: string;
          status?: ApplicationStatus;
          checkin_token?: string;
          checked_in_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['applications']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'applications_mission_id_fkey';
            columns: ['mission_id'];
            isOneToOne: false;
            referencedRelation: 'missions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'applications_worker_id_fkey';
            columns: ['worker_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      lemonway_accounts: {
        Row: {
          id: string;
          profile_id: string;
          lemonway_wallet_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          lemonway_wallet_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['lemonway_accounts']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'lemonway_accounts_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          application_id: string;
          amount_cents: number;
          status: PaymentStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          amount_cents: number;
          status?: PaymentStatus;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['payments']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'payments_application_id_fkey';
            columns: ['application_id'];
            isOneToOne: false;
            referencedRelation: 'applications';
            referencedColumns: ['id'];
          },
        ];
      };
      ratings: {
        Row: {
          id: string;
          application_id: string;
          structure_id: string;
          worker_id: string;
          score: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          structure_id: string;
          worker_id: string;
          score: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['ratings']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'ratings_application_id_fkey';
            columns: ['application_id'];
            isOneToOne: true;
            referencedRelation: 'applications';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ratings_structure_id_fkey';
            columns: ['structure_id'];
            isOneToOne: false;
            referencedRelation: 'structures';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ratings_worker_id_fkey';
            columns: ['worker_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reliability_disputes: {
        Row: {
          id: string;
          worker_id: string;
          description: string;
          status: DisputeStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          worker_id: string;
          description: string;
          status?: DisputeStatus;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['reliability_disputes']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'reliability_disputes_worker_id_fkey';
            columns: ['worker_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      reliability_index: {
        Row: {
          worker_id: string | null;
          accepted_count: number;
          rejected_count: number;
          cancelled_count: number;
          total_applications: number;
          reliability_score: number | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
  };
}
