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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_insights: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          user_id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          code: string
          description: string | null
          earned_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          code: string
          description?: string | null
          earned_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          code?: string
          description?: string | null
          earned_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          completed: boolean
          created_at: string
          description: string | null
          end_date: string
          goal_type: string
          goal_value: number
          id: string
          progress: number
          reward_xp: number
          start_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          description?: string | null
          end_date: string
          goal_type: string
          goal_value: number
          id?: string
          progress?: number
          reward_xp?: number
          start_date?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          description?: string | null
          end_date?: string
          goal_type?: string
          goal_value?: number
          id?: string
          progress?: number
          reward_xp?: number
          start_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chapters: {
        Row: {
          created_at: string
          id: string
          is_weak: boolean
          last_revised_at: string | null
          name: string
          next_revision_at: string | null
          notes: string | null
          revision_count: number
          revision_stage: number
          skip_count: number
          status: string
          strength: number
          subject_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_weak?: boolean
          last_revised_at?: string | null
          name: string
          next_revision_at?: string | null
          notes?: string | null
          revision_count?: number
          revision_stage?: number
          skip_count?: number
          status?: string
          strength?: number
          subject_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_weak?: boolean
          last_revised_at?: string | null
          name?: string
          next_revision_at?: string | null
          notes?: string | null
          revision_count?: number
          revision_stage?: number
          skip_count?: number
          status?: string
          strength?: number
          subject_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      doubts: {
        Row: {
          chapter_id: string | null
          created_at: string
          id: string
          question: string
          resolution: string | null
          resolved: boolean
          subject_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          id?: string
          question: string
          resolution?: string | null
          resolved?: boolean
          subject_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          id?: string
          question?: string
          resolution?: string | null
          resolved?: boolean
          subject_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doubts_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doubts_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      energy_logs: {
        Row: {
          created_at: string
          energy_level: string
          id: string
          log_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          energy_level: string
          id?: string
          log_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          energy_level?: string
          id?: string
          log_date?: string
          user_id?: string
        }
        Relationships: []
      }
      exams: {
        Row: {
          created_at: string
          exam_date: string
          id: string
          notes: string | null
          status: string
          subject_id: string | null
          syllabus_completion: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_date: string
          id?: string
          notes?: string | null
          status?: string
          subject_id?: string | null
          syllabus_completion?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exam_date?: string
          id?: string
          notes?: string | null
          status?: string
          subject_id?: string | null
          syllabus_completion?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_sessions: {
        Row: {
          created_at: string
          distraction_level: number | null
          duration_minutes: number
          focus_level: number | null
          id: string
          notes: string | null
          session_date: string
          subject_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          distraction_level?: number | null
          duration_minutes: number
          focus_level?: number | null
          id?: string
          notes?: string | null
          session_date?: string
          subject_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          distraction_level?: number | null
          duration_minutes?: number
          focus_level?: number | null
          id?: string
          notes?: string | null
          session_date?: string
          subject_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          id: string
          metric: string
          period: string
          progress: number
          start_date: string
          target: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric: string
          period: string
          progress?: number
          start_date?: string
          target: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metric?: string
          period?: string
          progress?: number
          start_date?: string
          target?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      homework: {
        Row: {
          completed: boolean
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          subject_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          subject_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_patterns: {
        Row: {
          category: string
          confidence: number
          created_at: string
          evidence: string | null
          id: string
          pattern: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          confidence?: number
          created_at?: string
          evidence?: string | null
          id?: string
          pattern: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          confidence?: number
          created_at?: string
          evidence?: string | null
          id?: string
          pattern?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      micro_goals: {
        Row: {
          completed_count: number
          created_at: string
          goal_date: string
          id: string
          subject_id: string | null
          target_count: number
          title: string
          user_id: string
        }
        Insert: {
          completed_count?: number
          created_at?: string
          goal_date?: string
          id?: string
          subject_id?: string | null
          target_count?: number
          title: string
          user_id: string
        }
        Update: {
          completed_count?: number
          created_at?: string
          goal_date?: string
          id?: string
          subject_id?: string | null
          target_count?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      mock_tests: {
        Row: {
          analysis: string | null
          completed: boolean
          created_at: string
          duration_minutes: number
          id: string
          questions: Json
          score: number | null
          subject_id: string | null
          topic: string
          total: number | null
          user_answers: Json | null
          user_id: string
        }
        Insert: {
          analysis?: string | null
          completed?: boolean
          created_at?: string
          duration_minutes?: number
          id?: string
          questions: Json
          score?: number | null
          subject_id?: string | null
          topic: string
          total?: number | null
          user_answers?: Json | null
          user_id: string
        }
        Update: {
          analysis?: string | null
          completed?: boolean
          created_at?: string
          duration_minutes?: number
          id?: string
          questions?: Json
          score?: number | null
          subject_id?: string | null
          topic?: string
          total?: number | null
          user_answers?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_tasks: {
        Row: {
          chapter_id: string | null
          completed: boolean
          created_at: string
          id: string
          priority: string
          subject_id: string | null
          task_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          completed?: boolean
          created_at?: string
          id?: string
          priority?: string
          subject_id?: string | null
          task_date?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          completed?: boolean
          created_at?: string
          id?: string
          priority?: string
          subject_id?: string | null
          task_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_tasks_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planner_tasks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          prediction: string
          reason: string | null
          risk_level: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          prediction: string
          reason?: string | null
          risk_level?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          prediction?: string
          reason?: string | null
          risk_level?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          best_streak: number
          created_at: string
          current_streak: number
          display_name: string | null
          id: string
          identity_label: string
          last_study_date: string | null
          level: number
          miss_streak: number
          updated_at: string
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          best_streak?: number
          created_at?: string
          current_streak?: number
          display_name?: string | null
          id: string
          identity_label?: string
          last_study_date?: string | null
          level?: number
          miss_streak?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          best_streak?: number
          created_at?: string
          current_streak?: number
          display_name?: string | null
          id?: string
          identity_label?: string
          last_study_date?: string | null
          level?: number
          miss_streak?: number
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      reflections: {
        Row: {
          created_at: string
          id: string
          improve: string | null
          mood: number | null
          reflection_date: string
          studied: string | null
          understood: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          improve?: string | null
          mood?: number | null
          reflection_date?: string
          studied?: string | null
          understood?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          improve?: string | null
          mood?: number | null
          reflection_date?: string
          studied?: string | null
          understood?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      test_scores: {
        Row: {
          created_at: string
          id: string
          max_score: number
          notes: string | null
          score: number
          subject_id: string | null
          test_date: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_score?: number
          notes?: string | null
          score: number
          subject_id?: string | null
          test_date?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_score?: number
          notes?: string | null
          score?: number
          subject_id?: string | null
          test_date?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_scores_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_blocks: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          label: string | null
          start_time: string
          subject_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          label?: string | null
          start_time: string
          subject_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          label?: string | null
          start_time?: string
          subject_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_blocks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
