import { Session, User as SupabaseUser } from '@supabase/supabase-js';

declare module '@supabase/supabase-js' {
  interface User extends SupabaseUser {
    role?: 'user' | 'admin';
    username?: string;
  }
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_SUPABASE_URL: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
      // Add other environment variables as needed
    }
  }
}
