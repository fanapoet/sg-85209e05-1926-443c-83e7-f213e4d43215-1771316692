import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: any;
  created_at?: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

// Dynamic URL Helper
const getURL = () => {
  let url = process?.env?.NEXT_PUBLIC_VERCEL_URL ?? 
           process?.env?.NEXT_PUBLIC_SITE_URL ?? 
           'http://localhost:3000'
  
  // Handle undefined or null url
  if (!url) {
    url = 'http://localhost:3000';
  }
  
  // Ensure url has protocol
  url = url.startsWith('http') ? url : `https://${url}`
  
  // Ensure url ends with slash
  url = url.endsWith('/') ? url : `${url}/`
  
  return url
}

// Named exports for individual usage
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user ? {
    id: user.id,
    email: user.email || "",
    user_metadata: user.user_metadata,
    created_at: user.created_at
  } : null;
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function signUp(email: string, password: string): Promise<{ user: AuthUser | null; error: AuthError | null }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getURL()}auth/confirm-email`
      }
    });

    if (error) {
      return { user: null, error: { message: error.message, code: error.status?.toString() } };
    }

    const authUser = data.user ? {
      id: data.user.id,
      email: data.user.email || "",
      user_metadata: data.user.user_metadata,
      created_at: data.user.created_at
    } : null;

    return { user: authUser, error: null };
  } catch (error) {
    return { 
      user: null, 
      error: { message: "An unexpected error occurred during sign up" } 
    };
  }
}

export async function signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: AuthError | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, error: { message: error.message, code: error.status?.toString() } };
    }

    const authUser = data.user ? {
      id: data.user.id,
      email: data.user.email || "",
      user_metadata: data.user.user_metadata,
      created_at: data.user.created_at
    } : null;

    return { user: authUser, error: null };
  } catch (error) {
    return { 
      user: null, 
      error: { message: "An unexpected error occurred during sign in" } 
    };
  }
}

export async function signOut(): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { error: { message: error.message } };
    }

    return { error: null };
  } catch (error) {
    return { 
      error: { message: "An unexpected error occurred during sign out" } 
    };
  }
}

export async function resetPassword(email: string): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getURL()}auth/reset-password`,
    });

    if (error) {
      return { error: { message: error.message } };
    }

    return { error: null };
  } catch (error) {
    return { 
      error: { message: "An unexpected error occurred during password reset" } 
    };
  }
}

export async function confirmEmail(token: string, type: 'signup' | 'recovery' | 'email_change' = 'signup'): Promise<{ user: AuthUser | null; error: AuthError | null }> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type
    });

    if (error) {
      return { user: null, error: { message: error.message, code: error.status?.toString() } };
    }

    const authUser = data.user ? {
      id: data.user.id,
      email: data.user.email || "",
      user_metadata: data.user.user_metadata,
      created_at: data.user.created_at
    } : null;

    return { user: authUser, error: null };
  } catch (error) {
    return { 
      user: null, 
      error: { message: "An unexpected error occurred during email confirmation" } 
    };
  }
}

export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

export function getCurrentTelegramUser() {
  if (typeof window !== "undefined" && (window as any).Telegram?.WebApp?.initDataUnsafe?.user) {
    return (window as any).Telegram.WebApp.initDataUnsafe.user;
  }
  return null;
}

export async function initializeUser(telegramUser: any) {
  if (!telegramUser?.id) return { success: false, error: "No Telegram user" };

  try {
    // Check if profile exists
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("telegram_id", telegramUser.id)
      .maybeSingle();

    if (profile) {
      return { success: true, user: profile };
    }

    // If not, create one (basic initialization)
    return { success: false, error: "Profile not found" };
  } catch (error) {
    return { success: false, error: "Initialization failed" };
  }
}

// Default export object for backward compatibility
export const authService = {
  getCurrentUser,
  getCurrentSession,
  signUp,
  signIn,
  signOut,
  resetPassword,
  confirmEmail,
  onAuthStateChange,
  getCurrentTelegramUser,
  initializeUser
};