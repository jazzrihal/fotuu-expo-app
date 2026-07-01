export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      badge_awards: {
        Row: {
          award_number: number
          awarded_at: string
          badge_id: string
          id: string
          metadata: Json
          post_id: string | null
          user_id: string
        }
        Insert: {
          award_number: number
          awarded_at?: string
          badge_id: string
          id?: string
          metadata?: Json
          post_id?: string | null
          user_id: string
        }
        Update: {
          award_number?: number
          awarded_at?: string
          badge_id?: string
          id?: string
          metadata?: Json
          post_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badge_awards_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_awards_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_awards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_definitions: {
        Row: {
          created_at: string
          description_template: string
          discovery_radius_meters: number | null
          id: string
          max_awards: number | null
          name: string
          total_awarded: number
        }
        Insert: {
          created_at?: string
          description_template: string
          discovery_radius_meters?: number | null
          id: string
          max_awards?: number | null
          name: string
          total_awarded?: number
        }
        Update: {
          created_at?: string
          description_template?: string
          discovery_radius_meters?: number | null
          id?: string
          max_awards?: number | null
          name?: string
          total_awarded?: number
        }
        Relationships: []
      }
      friendship_requests: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["friendship_status"]
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["friendship_status"]
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["friendship_status"]
        }
        Relationships: [
          {
            foreignKeyName: "friendship_requests_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendship_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moments: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          id: string
          latitude: number
          location: unknown
          longitude: number
          occurred_at: string
          region: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          latitude: number
          location?: unknown
          longitude: number
          occurred_at: string
          region?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          latitude?: number
          location?: unknown
          longitude?: number
          occurred_at?: string
          region?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          created_at: string
          delivery_error: string | null
          delivery_status: string
          expo_push_token: string
          expo_ticket_id: string | null
          id: string
          notification_id: string
          push_token_id: string | null
          sent_at: string | null
        }
        Insert: {
          created_at?: string
          delivery_error?: string | null
          delivery_status?: string
          expo_push_token: string
          expo_ticket_id?: string | null
          id?: string
          notification_id: string
          push_token_id?: string | null
          sent_at?: string | null
        }
        Update: {
          created_at?: string
          delivery_error?: string | null
          delivery_status?: string
          expo_push_token?: string
          expo_ticket_id?: string | null
          id?: string
          notification_id?: string
          push_token_id?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_deliveries_push_token_id_fkey"
            columns: ["push_token_id"]
            isOneToOne: false
            referencedRelation: "push_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string
          created_at: string
          data: Json
          delivery_error: string | null
          delivery_status: string
          id: string
          recipient_id: string
          sent_at: string | null
          title: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          body: string
          created_at?: string
          data?: Json
          delivery_error?: string | null
          delivery_status?: string
          id?: string
          recipient_id: string
          sent_at?: string | null
          title: string
          type: string
        }
        Update: {
          actor_id?: string | null
          body?: string
          created_at?: string
          data?: Json
          delivery_error?: string | null
          delivery_status?: string
          id?: string
          recipient_id?: string
          sent_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          post_id: string
          reaction_type: Database["public"]["Enums"]["post_reaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          reaction_type: Database["public"]["Enums"]["post_reaction_type"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          post_id?: string
          reaction_type?: Database["public"]["Enums"]["post_reaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          address: string | null
          author_id: string
          caption: string | null
          captured_at: string
          city: string | null
          country: string | null
          created_at: string
          id: string
          location: unknown
          privacy_scope: Database["public"]["Enums"]["post_privacy_scope"]
          region: string | null
          storage_bucket_id: string
          storage_object_path: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          author_id?: string
          caption?: string | null
          captured_at: string
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          location?: unknown
          privacy_scope?: Database["public"]["Enums"]["post_privacy_scope"]
          region?: string | null
          storage_bucket_id?: string
          storage_object_path: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          author_id?: string
          caption?: string | null
          captured_at?: string
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          location?: unknown
          privacy_scope?: Database["public"]["Enums"]["post_privacy_scope"]
          region?: string | null
          storage_bucket_id?: string
          storage_object_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_pinned_posts: {
        Row: {
          pinned_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          pinned_at?: string
          post_id: string
          user_id?: string
        }
        Update: {
          pinned_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_pinned_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_pinned_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          device_id: string | null
          expo_push_token: string
          id: string
          last_seen_at: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          expo_push_token: string
          id?: string
          last_seen_at?: string
          platform: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          expo_push_token?: string
          id?: string
          last_seen_at?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          id?: string
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_friends: {
        Args: { p_other_id: string; p_user_id: string }
        Returns: boolean
      }
      can_view_post: {
        Args: {
          p_author_id: string
          p_privacy_scope: Database["public"]["Enums"]["post_privacy_scope"]
          p_viewer_id: string
        }
        Returns: boolean
      }
      cancel_friend_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      get_post: {
        Args: { p_post_id: string }
        Returns: {
          address: string
          author_id: string
          badges: Json
          caption: string
          captured_at: string
          city: string
          country: string
          created_at: string
          display_name: string
          id: string
          is_pinned_by_current_user: boolean
          latitude: number
          longitude: number
          privacy_scope: Database["public"]["Enums"]["post_privacy_scope"]
          region: string
          storage_bucket_id: string
          storage_object_path: string
          user_reaction: Database["public"]["Enums"]["post_reaction_type"]
          username: string
        }[]
      }
      get_relationship_status: {
        Args: { p_other_id: string; p_user_id: string }
        Returns: string
      }
      list_feed_posts: {
        Args: {
          p_at: string
          p_latitude: number
          p_limit?: number
          p_longitude: number
          p_max_distance_meters?: number
          p_max_time_delta_seconds?: number
        }
        Returns: {
          address: string
          author_id: string
          badges: Json
          caption: string
          captured_at: string
          city: string
          country: string
          created_at: string
          display_name: string
          distance_meters: number
          feed_score: number
          id: string
          is_pinned_by_current_user: boolean
          latitude: number
          longitude: number
          privacy_scope: Database["public"]["Enums"]["post_privacy_scope"]
          region: string
          storage_bucket_id: string
          storage_object_path: string
          time_delta_seconds: number
          user_reaction: Database["public"]["Enums"]["post_reaction_type"]
          username: string
        }[]
      }
      list_friends: {
        Args: never
        Returns: {
          display_name: string
          friends_since: string
          id: string
          username: string
        }[]
      }
      list_friends_posts: {
        Args: {
          p_before_created_at?: string
          p_before_post_id?: string
          p_limit?: number
        }
        Returns: {
          address: string
          author_id: string
          badges: Json
          caption: string
          captured_at: string
          city: string
          country: string
          created_at: string
          display_name: string
          id: string
          is_pinned_by_current_user: boolean
          latitude: number
          longitude: number
          privacy_scope: Database["public"]["Enums"]["post_privacy_scope"]
          region: string
          storage_bucket_id: string
          storage_object_path: string
          user_reaction: Database["public"]["Enums"]["post_reaction_type"]
          username: string
        }[]
      }
      list_incoming_friend_requests: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          id: string
          request_id: string
          username: string
        }[]
      }
      list_outgoing_friend_requests: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          id: string
          request_id: string
          username: string
        }[]
      }
      list_profile_feed_posts: {
        Args: {
          p_before_created_at?: string
          p_before_post_id?: string
          p_limit?: number
          p_profile_user_id?: string
        }
        Returns: {
          address: string
          author_id: string
          badges: Json
          caption: string
          captured_at: string
          city: string
          country: string
          created_at: string
          display_name: string
          id: string
          is_authored: boolean
          is_pinned_by_current_user: boolean
          is_pinned_to_current_profile: boolean
          latitude: number
          longitude: number
          pinned_at: string
          privacy_scope: Database["public"]["Enums"]["post_privacy_scope"]
          profile_user_id: string
          region: string
          storage_bucket_id: string
          storage_object_path: string
          user_reaction: Database["public"]["Enums"]["post_reaction_type"]
          username: string
        }[]
      }
      list_user_badges: {
        Args: { p_user_id?: string }
        Returns: {
          award_number: number
          awarded_at: string
          badge_id: string
          badge_name: string
          description: string
          metadata: Json
          post_id: string
          total_awarded: number
        }[]
      }
      list_visible_posts: {
        Args: { p_before?: string; p_limit?: number }
        Returns: {
          address: string
          author_id: string
          badges: Json
          caption: string
          captured_at: string
          city: string
          country: string
          created_at: string
          display_name: string
          id: string
          is_pinned_by_current_user: boolean
          latitude: number
          longitude: number
          privacy_scope: Database["public"]["Enums"]["post_privacy_scope"]
          region: string
          storage_bucket_id: string
          storage_object_path: string
          user_reaction: Database["public"]["Enums"]["post_reaction_type"]
          username: string
        }[]
      }
      pin_post: {
        Args: { p_post_id: string }
        Returns: {
          pinned_at: string
          post_id: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "profile_pinned_posts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      respond_to_friend_request: {
        Args: { p_accept: boolean; p_request_id: string }
        Returns: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["friendship_status"]
        }
        SetofOptions: {
          from: "*"
          to: "friendship_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      search_profiles: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          display_name: string
          id: string
          relationship_status: string
          username: string
        }[]
      }
      send_friend_request: {
        Args: { p_addressee_id: string }
        Returns: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["friendship_status"]
        }
        SetofOptions: {
          from: "*"
          to: "friendship_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unpin_post: { Args: { p_post_id: string }; Returns: undefined }
    }
    Enums: {
      friendship_status: "pending" | "accepted" | "rejected"
      post_privacy_scope: "public" | "private" | "friends_only"
      post_reaction_type: "like" | "love" | "laugh" | "wow" | "sad"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      friendship_status: ["pending", "accepted", "rejected"],
      post_privacy_scope: ["public", "private", "friends_only"],
      post_reaction_type: ["like", "love", "laugh", "wow", "sad"],
    },
  },
} as const

