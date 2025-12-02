/**
 * Admin 布局
 *
 * 所有 Admin 页面的共享布局
 * UI 语言：中文
 */

import { ReactNode } from 'react';
import AdminSidebar from './_components/AdminSidebar';
import AdminHeader from './_components/AdminHeader';
import './admin.css';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminHeader />
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}

