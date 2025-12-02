/**
 * Next.js Middleware
 *
 * 基于 Supabase Auth 的路由保护
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// 需要登录才能访问的路由
const PROTECTED_ROUTES = ['/tonight', '/cook', '/grocery', '/appliances', '/profile'];
// Admin 路由
const ADMIN_ROUTES = ['/admin'];
// 允许的 Admin 角色
const ADMIN_ROLES = ['admin', 'operator', 'support'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 获取当前用户 session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 检查是否访问受保护路由
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const isAdminRoute = ADMIN_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // 未登录用户访问受保护路由，重定向到登录页
  if ((isProtectedRoute || isAdminRoute) && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Admin 路由额外检查角色
  if (isAdminRoute && user) {
    // 从 user metadata 或数据库获取角色
    const userRole = user.user_metadata?.role || 'user';
    if (!ADMIN_ROLES.includes(userRole)) {
      // 无权限，重定向到主页
      return NextResponse.redirect(new URL('/tonight', request.url));
    }
  }

  // 已登录用户访问登录/注册页，重定向到 Tonight
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/tonight', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，排除：
     * - _next/static（静态资源）
     * - _next/image（图片优化）
     * - favicon.ico（网站图标）
     * - public 文件夹下的文件
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

