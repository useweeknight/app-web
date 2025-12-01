/**
 * Supabase 服务端客户端
 *
 * 用于服务端组件和 API 路由中访问 Supabase
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// 构建时或开发环境缺少环境变量时的占位值
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 在服务端组件中调用时可能会失败，这是预期行为
          }
        },
      },
    }
  );
}

