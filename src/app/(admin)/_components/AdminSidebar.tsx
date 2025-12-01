/**
 * Admin 侧边栏
 *
 * 导航菜单
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  {
    section: '概览',
    items: [
      { href: '/admin', label: '仪表盘', icon: '📊' },
    ]
  },
  {
    section: '数据管理',
    items: [
      { href: '/admin/users', label: '用户管理', icon: '👥' },
      { href: '/admin/recipes', label: '菜谱库', icon: '📖' },
      { href: '/admin/substitutions', label: '替代库', icon: '🔄' },
    ]
  },
  {
    section: '用户数据',
    items: [
      { href: '/admin/pantry', label: '库存管理', icon: '🥫' },
      { href: '/admin/leftovers', label: '剩菜管理', icon: '🥡' },
      { href: '/admin/suggestions', label: '建议日志', icon: '💡' },
    ]
  },
  {
    section: '运营配置',
    items: [
      { href: '/admin/flags', label: '内容标签', icon: '🏷️' },
    ]
  },
  {
    section: '系统',
    items: [
      { href: '/admin/metrics', label: '关键指标', icon: '📈' },
      { href: '/admin/system', label: '系统配置', icon: '⚙️' },
      { href: '/admin/audit', label: '审计日志', icon: '📝' },
    ]
  }
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header">
        <div className="admin-sidebar-logo">Weeknight</div>
        <div className="admin-sidebar-subtitle">管理后台</div>
      </div>

      <nav className="admin-sidebar-nav">
        {NAV_ITEMS.map((section) => (
          <div key={section.section} className="admin-nav-section">
            <div className="admin-nav-section-title">{section.section}</div>
            {section.items.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/admin' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-nav-link ${isActive ? 'active' : ''}`}
                >
                  <span className="admin-nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <Link href="/tonight" className="admin-nav-link">
          <span className="admin-nav-icon">🏠</span>
          <span>返回主站</span>
        </Link>
      </div>
    </aside>
  );
}

