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
          city: string;
          reports_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
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
        Insert: Omit<Database["public"]["Tables"]["reports"]["Row"], "id" | "likes_count" | "comments_count" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["reports"]["Row"]>;
      };
      comments: {
        Row: {
          id: string;
          report_id: string;
          author_id: string;
          content: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["comments"]["Row"], "id" | "created_at">;
        Update: never;
      };
      likes: {
        Row: {
          id: string;
          report_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["likes"]["Row"], "id" | "created_at">;
        Update: never;
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      user_role: UserRole;
      report_status: ReportStatus;
      report_category: ReportCategory;
    };
  };
}

// Tipos con joins comunes
export type ReportWithAuthor = Database["public"]["Tables"]["reports"]["Row"] & {
  profiles: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "avatar_url" | "role" | "is_verified">;
};
