/**
 * Admin Dashboard 页面
 *
 * 管理后台首页 - 显示概览数据
 */
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface DashboardData {
  today: {
    active_users: number;
    suggestions: number;
    cook_completes: number;
    leftover_marks: number;
  };
  week: {
    leftover_consumption_rate_72h: string;
    total_leftovers: number;
  };
  admin_user: {
    id: string;
    email: string;
    role: string;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.useweeknight.com';

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('未登录');
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE}/admin`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || '获取数据失败');
        }

        const result = await res.json();
        if (result.ok) {
          setData(result.data);
        } else {
          throw new Error(result.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-empty">
        <div className="admin-empty-icon">😕</div>
        <div className="admin-empty-title">加载失败</div>
        <div className="admin-empty-description">{error}</div>
      </div>
    );
  }

  return (
    <div>
      {/* 今日数据 */}
      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">📅 今日数据</h2>
        </div>
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-label">活跃用户</div>
            <div className="admin-stat-value">{data?.today.active_users || 0}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">建议次数</div>
            <div className="admin-stat-value">{data?.today.suggestions || 0}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">完成烹饪</div>
            <div className="admin-stat-value">{data?.today.cook_completes || 0}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">剩菜标记</div>
            <div className="admin-stat-value">{data?.today.leftover_marks || 0}</div>
          </div>
        </div>
      </div>

      {/* 本周统计 */}
      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">📊 本周统计</h2>
        </div>
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-label">剩菜消耗率 (72h)</div>
            <div className="admin-stat-value">{data?.week.leftover_consumption_rate_72h || 'N/A'}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">总剩菜数</div>
            <div className="admin-stat-value">{data?.week.total_leftovers || 0}</div>
          </div>
        </div>
      </div>

      {/* 当前用户信息 */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">👤 当前管理员</h2>
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          <p><strong>邮箱：</strong>{data?.admin_user.email}</p>
          <p><strong>角色：</strong>{data?.admin_user.role === 'admin' ? '管理员' : 
            data?.admin_user.role === 'operator' ? '运营人员' : '客服人员'}</p>
        </div>
      </div>
    </div>
  );
}

