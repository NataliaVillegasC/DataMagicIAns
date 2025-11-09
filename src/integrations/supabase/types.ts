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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          ai_match_score: number | null
          ai_recommendation: string | null
          applied_date: string
          candidate_id: string
          created_at: string
          culture_fit_score: number | null
          id: string
          interview_notes: string | null
          job_opening_id: string
          predicted_success: number | null
          red_flags: Json | null
          retention_risk: number | null
          skill_match_score: number | null
          status: Database["public"]["Enums"]["application_status"] | null
          strengths: Json | null
          updated_at: string
        }
        Insert: {
          ai_match_score?: number | null
          ai_recommendation?: string | null
          applied_date?: string
          candidate_id: string
          created_at?: string
          culture_fit_score?: number | null
          id?: string
          interview_notes?: string | null
          job_opening_id: string
          predicted_success?: number | null
          red_flags?: Json | null
          retention_risk?: number | null
          skill_match_score?: number | null
          status?: Database["public"]["Enums"]["application_status"] | null
          strengths?: Json | null
          updated_at?: string
        }
        Update: {
          ai_match_score?: number | null
          ai_recommendation?: string | null
          applied_date?: string
          candidate_id?: string
          created_at?: string
          culture_fit_score?: number | null
          id?: string
          interview_notes?: string | null
          job_opening_id?: string
          predicted_success?: number | null
          red_flags?: Json | null
          retention_risk?: number | null
          skill_match_score?: number | null
          status?: Database["public"]["Enums"]["application_status"] | null
          strengths?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_opening_id_fkey"
            columns: ["job_opening_id"]
            isOneToOne: false
            referencedRelation: "job_openings"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_surveys: {
        Row: {
          candidate_id: string
          completed: boolean | null
          completed_at: string | null
          created_at: string
          eq_empathy: number | null
          eq_motivation: number | null
          eq_score: number | null
          eq_self_awareness: number | null
          eq_self_regulation: number | null
          eq_social_skills: number | null
          id: string
          ocean_agreeableness: number | null
          ocean_conscientiousness: number | null
          ocean_extraversion: number | null
          ocean_neuroticism: number | null
          ocean_openness: number | null
          sjt_responses: Json | null
          sjt_score: number | null
          star_action_score: number | null
          star_responses: Json | null
          star_result_score: number | null
          star_situation_score: number | null
          star_task_score: number | null
          survey_token: string
          updated_at: string
          values_alignment_score: number | null
          values_responses: Json | null
        }
        Insert: {
          candidate_id: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          eq_empathy?: number | null
          eq_motivation?: number | null
          eq_score?: number | null
          eq_self_awareness?: number | null
          eq_self_regulation?: number | null
          eq_social_skills?: number | null
          id?: string
          ocean_agreeableness?: number | null
          ocean_conscientiousness?: number | null
          ocean_extraversion?: number | null
          ocean_neuroticism?: number | null
          ocean_openness?: number | null
          sjt_responses?: Json | null
          sjt_score?: number | null
          star_action_score?: number | null
          star_responses?: Json | null
          star_result_score?: number | null
          star_situation_score?: number | null
          star_task_score?: number | null
          survey_token: string
          updated_at?: string
          values_alignment_score?: number | null
          values_responses?: Json | null
        }
        Update: {
          candidate_id?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          eq_empathy?: number | null
          eq_motivation?: number | null
          eq_score?: number | null
          eq_self_awareness?: number | null
          eq_self_regulation?: number | null
          eq_social_skills?: number | null
          id?: string
          ocean_agreeableness?: number | null
          ocean_conscientiousness?: number | null
          ocean_extraversion?: number | null
          ocean_neuroticism?: number | null
          ocean_openness?: number | null
          sjt_responses?: Json | null
          sjt_score?: number | null
          star_action_score?: number | null
          star_responses?: Json | null
          star_result_score?: number | null
          star_situation_score?: number | null
          star_task_score?: number | null
          survey_token?: string
          updated_at?: string
          values_alignment_score?: number | null
          values_responses?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_surveys_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          achievements: Json | null
          availability: string | null
          certifications: Json | null
          company: string
          created_at: string
          current_company: string | null
          current_position: string | null
          cv_file_name: string | null
          cv_upload_date: string | null
          cv_url: string | null
          document_language: string | null
          education: Json | null
          email: string
          experience: Json | null
          extracted_skills: Json | null
          full_name: string
          generic_skills: Json | null
          github_url: string | null
          id: string
          independent_work: boolean | null
          interests: Json | null
          languages: Json | null
          linkedin_url: string | null
          location: string | null
          notes: string | null
          phone: string | null
          portfolio_url: string | null
          professional_affiliations: Json | null
          professional_summary: string | null
          social_links: Json | null
          source_user_id: string | null
          status: Database["public"]["Enums"]["candidate_status"] | null
          updated_at: string
          volunteering: Json | null
          years_experience: number | null
        }
        Insert: {
          achievements?: Json | null
          availability?: string | null
          certifications?: Json | null
          company: string
          created_at?: string
          current_company?: string | null
          current_position?: string | null
          cv_file_name?: string | null
          cv_upload_date?: string | null
          cv_url?: string | null
          document_language?: string | null
          education?: Json | null
          email: string
          experience?: Json | null
          extracted_skills?: Json | null
          full_name: string
          generic_skills?: Json | null
          github_url?: string | null
          id?: string
          independent_work?: boolean | null
          interests?: Json | null
          languages?: Json | null
          linkedin_url?: string | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          portfolio_url?: string | null
          professional_affiliations?: Json | null
          professional_summary?: string | null
          social_links?: Json | null
          source_user_id?: string | null
          status?: Database["public"]["Enums"]["candidate_status"] | null
          updated_at?: string
          volunteering?: Json | null
          years_experience?: number | null
        }
        Update: {
          achievements?: Json | null
          availability?: string | null
          certifications?: Json | null
          company?: string
          created_at?: string
          current_company?: string | null
          current_position?: string | null
          cv_file_name?: string | null
          cv_upload_date?: string | null
          cv_url?: string | null
          document_language?: string | null
          education?: Json | null
          email?: string
          experience?: Json | null
          extracted_skills?: Json | null
          full_name?: string
          generic_skills?: Json | null
          github_url?: string | null
          id?: string
          independent_work?: boolean | null
          interests?: Json | null
          languages?: Json | null
          linkedin_url?: string | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          portfolio_url?: string | null
          professional_affiliations?: Json | null
          professional_summary?: string | null
          social_links?: Json | null
          source_user_id?: string | null
          status?: Database["public"]["Enums"]["candidate_status"] | null
          updated_at?: string
          volunteering?: Json | null
          years_experience?: number | null
        }
        Relationships: []
      }
      interviews: {
        Row: {
          candidate_id: string
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          feedback: string | null
          id: string
          interview_type: Database["public"]["Enums"]["interview_type"]
          interviewer_email: string | null
          interviewer_name: string | null
          job_opening_id: string | null
          location: string | null
          notes: string | null
          scheduled_date: string
          score: number | null
          status: Database["public"]["Enums"]["interview_status"] | null
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          feedback?: string | null
          id?: string
          interview_type: Database["public"]["Enums"]["interview_type"]
          interviewer_email?: string | null
          interviewer_name?: string | null
          job_opening_id?: string | null
          location?: string | null
          notes?: string | null
          scheduled_date: string
          score?: number | null
          status?: Database["public"]["Enums"]["interview_status"] | null
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          feedback?: string | null
          id?: string
          interview_type?: Database["public"]["Enums"]["interview_type"]
          interviewer_email?: string | null
          interviewer_name?: string | null
          job_opening_id?: string | null
          location?: string | null
          notes?: string | null
          scheduled_date?: string
          score?: number | null
          status?: Database["public"]["Enums"]["interview_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_job_opening_id_fkey"
            columns: ["job_opening_id"]
            isOneToOne: false
            referencedRelation: "job_openings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_openings: {
        Row: {
          company: string
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          employment_type: Database["public"]["Enums"]["employment_type"] | null
          id: string
          location: string | null
          nice_to_have_skills: Json | null
          positions_available: number | null
          required_skills: Json | null
          requirements: string | null
          salary_max: number | null
          salary_min: number | null
          status: Database["public"]["Enums"]["job_status"] | null
          title: string
          updated_at: string
          urgency: Database["public"]["Enums"]["job_urgency"] | null
        }
        Insert: {
          company: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          id?: string
          location?: string | null
          nice_to_have_skills?: Json | null
          positions_available?: number | null
          required_skills?: Json | null
          requirements?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: Database["public"]["Enums"]["job_status"] | null
          title: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["job_urgency"] | null
        }
        Update: {
          company?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          id?: string
          location?: string | null
          nice_to_have_skills?: Json | null
          positions_available?: number | null
          required_skills?: Json | null
          requirements?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: Database["public"]["Enums"]["job_status"] | null
          title?: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["job_urgency"] | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          full_name: string | null
          id: string
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          category: Database["public"]["Enums"]["skill_category"] | null
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["skill_category"] | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: Database["public"]["Enums"]["skill_category"] | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "recruiter"
      application_status:
        | "applied"
        | "screening"
        | "interview_scheduled"
        | "interviewing"
        | "offer"
        | "accepted"
        | "rejected"
        | "withdrawn"
      candidate_status:
        | "new"
        | "screening"
        | "interviewing"
        | "offer"
        | "hired"
        | "rejected"
        | "withdrawn"
      employment_type: "full_time" | "part_time" | "contract" | "internship"
      interview_status: "scheduled" | "completed" | "cancelled" | "rescheduled"
      interview_type:
        | "phone_screen"
        | "technical"
        | "behavioral"
        | "cultural_fit"
        | "final"
        | "other"
      job_status: "open" | "closed" | "on_hold" | "draft"
      job_urgency: "low" | "medium" | "high" | "critical"
      skill_category:
        | "technical"
        | "soft"
        | "language"
        | "certification"
        | "tool"
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
      app_role: ["admin", "moderator", "recruiter"],
      application_status: [
        "applied",
        "screening",
        "interview_scheduled",
        "interviewing",
        "offer",
        "accepted",
        "rejected",
        "withdrawn",
      ],
      candidate_status: [
        "new",
        "screening",
        "interviewing",
        "offer",
        "hired",
        "rejected",
        "withdrawn",
      ],
      employment_type: ["full_time", "part_time", "contract", "internship"],
      interview_status: ["scheduled", "completed", "cancelled", "rescheduled"],
      interview_type: [
        "phone_screen",
        "technical",
        "behavioral",
        "cultural_fit",
        "final",
        "other",
      ],
      job_status: ["open", "closed", "on_hold", "draft"],
      job_urgency: ["low", "medium", "high", "critical"],
      skill_category: [
        "technical",
        "soft",
        "language",
        "certification",
        "tool",
      ],
    },
  },
} as const
