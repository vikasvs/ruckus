import { getSupabase } from './supabase';

export const formatPhoneAsEmail = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  return `${digits}@ruckus.app`;
};

export const signUp = async (phone: string, password: string) => {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: formatPhoneAsEmail(phone),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const signIn = async (phone: string, password: string) => {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: formatPhoneAsEmail(phone),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const signOut = async () => {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
};

export const getCurrentUser = () => {
  const supabase = getSupabase();
  return supabase.auth.getUser();
};

export const getSession = () => {
  const supabase = getSupabase();
  return supabase.auth.getSession();
};
