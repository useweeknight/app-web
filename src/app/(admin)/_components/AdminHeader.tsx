/**
 * Admin 头部
 *
 * 顶部导航栏
 */
'use client';

import { usePathname } from 'next/navigation';

const PAGE_TITLES: Record<string, string> = {
  '/admin': '仪表盘',
  '/admin/users': '用户管理',
  '/admin/recipes': '菜谱库',
  '/admin/substitutions': '替代库',
  '/admin/pantry': '库存管理',
  '/admin/leftovers': '剩菜管理',
  '/admin/suggestions': '建议日志',
  '/admin/metrics': '关键指标',
  '/admin/system': '系统配置',
  '/admin/audit': '审计日志',
};

export default function AdminHeader() {
  const pathname = usePathname();
  
  // 获取当前页面标题
  let title = '管理后台';
  for (const [path, pageTitle] of Object.entries(PAGE_TITLES)) {
    if (pathname === path || (path !== '/admin' && pathname.startsWith(path))) {
      title = pageTitle;
      break;
    }
  }

  return (
    <header className="admin-header">
      <h1 className="admin-header-title">{title}</h1>
      <div className="admin-header-actions">
        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          {new Date().toLocaleDateString('zh-CN', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
          })}
        </span>
      </div>
    </header>
  );
}

