/**
 * Admin 系统配置页面（只读）
 */
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SystemData {
  environment: {
    node_version: string;
    node_env: string;
    revision: string;
    region: string;
  };
  cors: {
    allowed_origins: string[];
  };
  services: {
    supabase_url: string;
    openai: string;
  };
}

interface FlagsData {
  flags: Array<{
    key: string;
    is_enabled: boolean;
    description?: string;
  }>;
  source: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.useweeknight.com';

export default function AdminSystemPage() {
  const [systemData, setSystemData] = useState<SystemData | null>(null);
  const [flagsData, setFlagsData] = useState<FlagsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const headers = { Authorization: `Bearer ${session.access_token}` };

        const [systemRes, flagsRes] = await Promise.all([
          fetch(`${API_BASE}/admin/system`, { headers }),
          fetch(`${API_BASE}/admin/system/flags`, { headers }),
        ]);

        const systemResult = await systemRes.json();
        const flagsResult = await flagsRes.json();

        if (systemResult.ok) setSystemData(systemResult.data);
        if (flagsResult.ok) setFlagsData(flagsResult.data);
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
        <div className="admin-empty-title">{error}</div>
      </div>
    );
  }

  return (
    <div>
      {/* 运行环境 */}
      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">🖥️ 运行环境</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>Node 版本</div>
            <div style={{ fontFamily: 'monospace' }}>{systemData?.environment.node_version}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>环境模式</div>
            <div>
              <span className={`admin-badge ${
                systemData?.environment.node_env === 'production' ? 'admin-badge-success' : 'admin-badge-warning'
              }`}>
                {systemData?.environment.node_env}
              </span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>版本号</div>
            <div style={{ fontFamily: 'monospace' }}>{systemData?.environment.revision}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>部署区域</div>
            <div>{systemData?.environment.region}</div>
          </div>
        </div>
      </div>

      {/* 服务状态 */}
      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">🔌 服务状态</h2>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Supabase</div>
            <span className={`admin-badge ${
              systemData?.services.supabase_url === '已配置' ? 'admin-badge-success' : 'admin-badge-error'
            }`}>
              {systemData?.services.supabase_url}
            </span>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">OpenAI</div>
            <span className={`admin-badge ${
              systemData?.services.openai === '已配置' ? 'admin-badge-success' : 'admin-badge-error'
            }`}>
              {systemData?.services.openai}
            </span>
          </div>
        </div>
      </div>

      {/* CORS 白名单 */}
      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">🔒 CORS 白名单</h2>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {systemData?.cors.allowed_origins.map((origin, i) => (
            <span key={i} className="admin-badge admin-badge-info" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
              {origin}
            </span>
          ))}
        </div>
      </div>

      {/* Feature Flags */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">🚩 功能开关（只读）</h2>
          <span className="admin-badge admin-badge-default">{flagsData?.source}</span>
        </div>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>开关名称</th>
                <th>描述</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {flagsData?.flags.map((flag) => (
                <tr key={flag.key}>
                  <td style={{ fontFamily: 'monospace' }}>{flag.key}</td>
                  <td>{flag.description || '-'}</td>
                  <td>
                    <span className={`admin-badge ${flag.is_enabled ? 'admin-badge-success' : 'admin-badge-default'}`}>
                      {flag.is_enabled ? '已启用' : '已禁用'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

