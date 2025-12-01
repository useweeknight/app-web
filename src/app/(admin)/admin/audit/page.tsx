/**
 * Admin 审计日志页面
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AuditLog {
  id: string;
  entity: string;
  entity_id: string | null;
  action: string;
  before_value: unknown;
  after_value: unknown;
  created_at: string;
  actor?: {
    id: string;
    email: string;
    display_name: string | null;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.useweeknight.com';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const supabase = createClient();

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        days: '30',
        ...(entityFilter && { entity: entityFilter }),
        ...(actionFilter && { action: actionFilter }),
      });

      const res = await fetch(`${API_BASE}/admin/audit?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const result = await res.json();
      if (result.ok) {
        setLogs(result.data);
        setTotal(result.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败');
    } finally {
      setLoading(false);
    }
  }, [supabase, page, entityFilter, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* 工具栏 */}
      <div className="admin-toolbar">
        <select
          className="admin-filter-select"
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
        >
          <option value="">全部实体</option>
          <option value="users">用户</option>
          <option value="recipe">菜谱</option>
          <option value="substitutions">替代</option>
          <option value="pantry_items">库存</option>
          <option value="leftovers">剩菜</option>
        </select>
        <select
          className="admin-filter-select"
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
        >
          <option value="">全部操作</option>
          <option value="create">创建</option>
          <option value="update">更新</option>
          <option value="delete">删除</option>
          <option value="update_role">修改角色</option>
          <option value="update_status">修改状态</option>
          <option value="calibrate">校准</option>
        </select>
      </div>

      {/* 表格 */}
      <div className="admin-card">
        {loading ? (
          <div className="admin-loading">
            <div className="admin-loading-spinner" />
          </div>
        ) : error ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">😕</div>
            <div className="admin-empty-title">{error}</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">📝</div>
            <div className="admin-empty-title">暂无审计日志</div>
          </div>
        ) : (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>操作者</th>
                    <th>实体</th>
                    <th>操作</th>
                    <th>实体ID</th>
                    <th>详情</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(log.created_at).toLocaleString('zh-CN')}
                      </td>
                      <td>
                        {log.actor?.email || log.actor?.display_name || '-'}
                      </td>
                      <td>
                        <span className="admin-badge admin-badge-info">
                          {log.entity}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-badge ${
                          log.action === 'create' ? 'admin-badge-success' :
                          log.action === 'delete' ? 'admin-badge-error' :
                          'admin-badge-warning'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {log.entity_id?.slice(0, 8) || '-'}
                      </td>
                      <td>
                        <button 
                          className="admin-pagination-btn"
                          onClick={() => {
                            const detail = JSON.stringify({
                              before: log.before_value,
                              after: log.after_value
                            }, null, 2);
                            alert(detail);
                          }}
                        >
                          查看
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            <div className="admin-pagination">
              <div className="admin-pagination-info">
                共 {total} 条，第 {page} / {totalPages} 页
              </div>
              <div className="admin-pagination-buttons">
                <button
                  className="admin-pagination-btn"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  上一页
                </button>
                <button
                  className="admin-pagination-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

