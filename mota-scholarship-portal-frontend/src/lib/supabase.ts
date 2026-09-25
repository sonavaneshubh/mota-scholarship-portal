import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;

export const DEMO_MODE = !isSupabaseConfigured;

export interface DemoUser {
  email: string;
  password: string;
  fullName: string;
  mobile: string;
  state: string;
  district: string;
  category: string;
  course: string;
  institution: string;
}

export const DEMO_USERS: DemoUser[] = [
  {
    email: 'demo@applicant.test',
    password: 'demo123',
    fullName: 'Demo Applicant',
    mobile: '9876543210',
    state: 'Maharashtra',
    district: 'Mumbai',
    category: 'ST',
    course: 'B.Tech Computer Science',
    institution: 'IIT Mumbai',
  },
  {
    email: 'student@test.com',
    password: 'student123',
    fullName: 'Test Student',
    mobile: '9123456789',
    state: 'Delhi',
    district: 'New Delhi',
    category: 'SC',
    course: 'MBBS',
    institution: 'AIIMS Delhi',
  },
];
