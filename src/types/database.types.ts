// Types alignes manuellement sur supabase/migrations/000*.sql.
// A remplacer par `supabase gen types typescript` des que le projet est lie
// en CLI (cf. README) : la commande produira un fichier equivalent.

export type ProfileRole = 'worker' | 'structure_admin';
export type MissionStatus = 'open' | 'closed' | 'cancelled';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
export type PaymentStatus = 'pending' | 'held' | 'released' | 'failed';
export type RatingDirection = 'worker_to_structure' | 'structure_to_worker';
export type ReportMotif = 'absent' | 'conditions' | 'securite' | 'autre';
export type DisputeStatus = 'open' | 'reviewing' | 'resolved' | 'rejected';
export type KycStatus = 'unverified' | 'info_required' | 'pending' | 'verified' | 'rejected';
export type KycDocumentType = 'id_card' | 'passport' | 'residence_permit';
export type KycProvider = 'simulation' | 'lemonway';

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
          is_ess: boolean;
          about: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          siret?: string | null;
          is_ess?: boolean;
          about?: string | null;
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
          is_solidaire: boolean;
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
          is_solidaire?: boolean;
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
          direction: RatingDirection;
          created_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          structure_id: string;
          worker_id: string;
          score: number;
          direction?: RatingDirection;
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
      delay_notices: {
        Row: {
          id: string;
          application_id: string;
          minutes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          minutes: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['delay_notices']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'delay_notices_application_id_fkey';
            columns: ['application_id'];
            isOneToOne: false;
            referencedRelation: 'applications';
            referencedColumns: ['id'];
          },
        ];
      };
      reports: {
        Row: {
          id: string;
          application_id: string;
          worker_id: string;
          motif: ReportMotif;
          note: string | null;
          status: 'open' | 'reviewing' | 'resolved';
          created_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          worker_id: string;
          motif: ReportMotif;
          note?: string | null;
          status?: 'open' | 'reviewing' | 'resolved';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['reports']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'reports_application_id_fkey';
            columns: ['application_id'];
            isOneToOne: false;
            referencedRelation: 'applications';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_worker_id_fkey';
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
      kyc_verifications: {
        Row: {
          id: string;
          user_id: string;
          status: KycStatus;
          full_name: string | null;
          iban: string | null;
          document_type: KycDocumentType | null;
          document_path: string | null;
          missing_info: string | null;
          rejection_reason: string | null;
          submitted_at: string | null;
          reviewed_at: string | null;
          provider: KycProvider;
          provider_ref: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: KycStatus;
          full_name?: string | null;
          iban?: string | null;
          document_type?: KycDocumentType | null;
          document_path?: string | null;
          missing_info?: string | null;
          rejection_reason?: string | null;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          provider?: KycProvider;
          provider_ref?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['kyc_verifications']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'kyc_verifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      kyc_status_history: {
        Row: {
          id: string;
          verification_id: string;
          user_id: string;
          from_status: string | null;
          to_status: string;
          reason: string | null;
          source: 'user' | 'simulation' | 'lemonway_webhook' | 'system';
          created_at: string;
        };
        Insert: {
          id?: string;
          verification_id: string;
          user_id: string;
          from_status?: string | null;
          to_status: string;
          reason?: string | null;
          source?: 'user' | 'simulation' | 'lemonway_webhook' | 'system';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['kyc_status_history']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'kyc_status_history_verification_id_fkey';
            columns: ['verification_id'];
            isOneToOne: false;
            referencedRelation: 'kyc_verifications';
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
    Functions: {
      founder_list_verifications: {
        Args: { p_passcode: string };
        Returns: {
          id: string;
          user_id: string;
          full_name: string | null;
          status: KycStatus;
          document_type: KycDocumentType | null;
          iban_masked: string | null;
          missing_info: string | null;
          rejection_reason: string | null;
          submitted_at: string | null;
          reviewed_at: string | null;
          provider: KycProvider;
          created_at: string;
          updated_at: string;
        }[];
      };
      founder_verification_history: {
        Args: { p_passcode: string; p_verification_id: string };
        Returns: {
          id: string;
          from_status: string | null;
          to_status: string;
          reason: string | null;
          source: string;
          created_at: string;
        }[];
      };
      founder_set_verification_status: {
        Args: { p_passcode: string; p_verification_id: string; p_status: string; p_reason: string | null };
        Returns: undefined;
      };
    };
  };
}
