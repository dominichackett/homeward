export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface DependentRecord {
  id: string;
  full_name: string;
  condition_notes: string | null;
  primary_contact_name: string;
  primary_contact_phone: string;
  primary_contact_email: string | null;
  secondary_contact_name: string | null;
  secondary_contact_phone: string | null;
  consent_attested: boolean;
  encrypted_embedding: string; // Ciphertext of 128D facial descriptor
  photo_thumbnail_url: string | null;
  caregiver_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NullifierRecord {
  id: string;
  nullifier: string;
  action: string;
  last_report_at: string;
  created_at: string;
}

export interface IncidentRecord {
  id: string;
  dependent_id: string | null;
  case_token: string;
  nullifier: string;
  match_confidence: number;
  status: "active" | "resolved" | "dismissed";
  location_note: string | null;
  encrypted_photo_url: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface Database {
  public: {
    Tables: {
      dependents: {
        Row: DependentRecord;
        Insert: Omit<DependentRecord, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DependentRecord, "id">>;
      };
      nullifiers: {
        Row: NullifierRecord;
        Insert: Omit<NullifierRecord, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<NullifierRecord, "id">>;
      };
      incidents: {
        Row: IncidentRecord;
        Insert: Omit<IncidentRecord, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<IncidentRecord, "id">>;
      };
    };
  };
}
