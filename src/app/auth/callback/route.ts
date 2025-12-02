/**
 * Supabase Auth 回调处理
 *
 * 处理 OAuth 登录回调（Apple / Google）
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/tonight';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // 检查是否是新用户，需要进入冷启动流程
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // 检查是否已完成冷启动
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single();

        if (!profile || !profile.onboarding_completed) {
          // 新用户或未完成冷启动，跳转到冷启动流程
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 登录失败，返回登录页并显示错误
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}

