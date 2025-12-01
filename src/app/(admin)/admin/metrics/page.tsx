/**
 * Admin 关键指标页面
 */
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface MetricsData {
  period_days: number;
  overview: {
    active_users: number;
    total_suggestions: number;
    daily_suggestions_avg: string;
  };
  cooking: {
    cook_starts: number;
    cook_completes: number;
    completion_rate: string;
  };
  leftovers: {
    total: number;
    consumed: number;
    consumption_rate: string;
  };
  performance: {
    decision_p50_ms: string;
    decision_p90_ms: string;
    hands_free_rate: string;
    substitution_success_rate: string;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.useweeknight.com';

export default function AdminMetricsPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState('7');

  const supabase = createClient();

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch(`${API_BASE}/admin/metrics?days=${days}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        const result = await res.json();
        if (result.ok) {
          setData(result.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [supabase, days]);

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
        <div className="admin-empty-title">{error}</div>
      </div>
    );
  }

  return (
    <div>
      {/* 周期选择 */}
      <div className="admin-toolbar">
        <select
          className="admin-filter-select"
          value={days}
          onChange={(e) => setDays(e.target.value)}
        >
          <option value="7">近 7 天</option>
          <option value="14">近 14 天</option>
          <option value="30">近 30 天</option>
        </select>
      </div>

      {/* 概览 */}
      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">📊 概览指标</h2>
        </div>
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-label">活跃用户</div>
            <div className="admin-stat-value">{data?.overview.active_users || 0}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">总建议次数</div>
            <div className="admin-stat-value">{data?.overview.total_suggestions || 0}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">日均建议</div>
            <div className="admin-stat-value">{data?.overview.daily_suggestions_avg || 0}</div>
          </div>
        </div>
      </div>

      {/* 烹饪数据 */}
      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">🍳 烹饪数据</h2>
        </div>
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-label">开始烹饪</div>
            <div className="admin-stat-value">{data?.cooking.cook_starts || 0}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">完成烹饪</div>
            <div className="admin-stat-value">{data?.cooking.cook_completes || 0}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">完成率</div>
            <div className="admin-stat-value">{data?.cooking.completion_rate || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* 剩菜数据 */}
      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">🥡 剩菜数据</h2>
        </div>
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-label">总剩菜数</div>
            <div className="admin-stat-value">{data?.leftovers.total || 0}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">已消费</div>
            <div className="admin-stat-value">{data?.leftovers.consumed || 0}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">消耗率</div>
            <div className="admin-stat-value">{data?.leftovers.consumption_rate || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* 性能指标 */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">⚡ 性能指标</h2>
        </div>
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-label">决策时间 P50</div>
            <div className="admin-stat-value">{data?.performance.decision_p50_ms || 'N/A'}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">决策时间 P90</div>
            <div className="admin-stat-value">{data?.performance.decision_p90_ms || 'N/A'}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Hands-free 率</div>
            <div className="admin-stat-value">{data?.performance.hands_free_rate || 'N/A'}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">替代成功率</div>
            <div className="admin-stat-value">{data?.performance.substitution_success_rate || 'N/A'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

