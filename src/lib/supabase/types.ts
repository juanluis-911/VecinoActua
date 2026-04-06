export type UserRole = "citizen" | "candidate" | "official" | "influencer";
export type ReportStatus = "open" | "in_progress" | "resolved";
export type ReportCategory = "bache" | "lampara" | "agua" | "basura" | "fuga" | "otro";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          is_verified: boolean;
          bio: string | null;
          colonia: string | null;
          city: string | null;
          reports_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          is_verified?: boolean;
          bio?: string | null;
          colonia?: string | null;
          city?: string | null;
          reports_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          is_verified?: boolean;
          bio?: string | null;
          colonia?: string | null;
          city?: string | null;
          reports_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          description: string | null;
          category: ReportCategory;
          status: ReportStatus;
          image_url: string | null;
          latitude: number | null;
          longitude: number | null;
          colonia: string | null;
          address: string | null;
          likes_count: number;
          comments_count: number;
          resolved_at: string | null;
          resolved_by: string | null;
          evidence_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          description?: string | null;
          category?: ReportCategory;
          status?: ReportStatus;
          image_url?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          colonia?: string | null;
          address?: string | null;
          likes_count?: number;
          comments_count?: number;
          resolved_at?: string | null;
          resolved_by?: string | null;
          evidence_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          title?: string;
          description?: string | null;
          category?: ReportCategory;
          status?: ReportStatus;
          image_url?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          colonia?: string | null;
          address?: string | null;
          likes_count?: number;
          comments_count?: number;
          resolved_at?: string | null;
          resolved_by?: string | null;
          evidence_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          report_id: string;
          author_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          author_id: string;
          content: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      likes: {
        Row: {
          id: string;
          report_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      report_status: ReportStatus;
      report_category: ReportCategory;
    };
    CompositeTypes: Record<string, never>;
  };
}

// Tipos con joins comunes
export type ReportWithAuthor = Database["public"]["Tables"]["reports"]["Row"] & {
  author: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "avatar_url" | "role" | "is_verified"> | null;
};
