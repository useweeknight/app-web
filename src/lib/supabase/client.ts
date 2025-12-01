/**
 * Supabase 浏览器客户端
 *
 * 用于客户端组件中访问 Supabase Auth 和数据
 */
import { createBrowserClient } from '@supabase/ssr';

// 构建时或开发环境缺少环境变量时的占位值
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export function createClient() {
  // 检查是否在服务端且缺少环境变量（构建时场景）
  if (typeof window === 'undefined' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL, using placeholder');
  }
  
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}

