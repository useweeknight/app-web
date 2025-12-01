/**
 * Admin 用户管理页面
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface User {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.useweeknight.com';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const supabase = createClient();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
      });

      const res = await fetch(`${API_BASE}/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const result = await res.json();
      if (result.ok) {
        setUsers(result.data);
        setTotal(result.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败');
    } finally {
      setLoading(false);
    }
  }, [supabase, page, search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* 工具栏 */}
      <div className="admin-toolbar">
        <div className="admin-search">
          <svg className="admin-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            className="admin-search-input"
            placeholder="搜索邮箱或昵称..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="admin-filter-select"
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
        >
          <option value="">全部角色</option>
          <option value="user">普通用户</option>
          <option value="admin">管理员</option>
          <option value="operator">运营人员</option>
          <option value="support">客服人员</option>
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
        ) : users.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">👥</div>
            <div className="admin-empty-title">暂无用户</div>
          </div>
        ) : (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>邮箱</th>
                    <th>昵称</th>
                    <th>角色</th>
                    <th>注册时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>{user.display_name || '-'}</td>
                      <td>
                        <span className={`admin-badge ${
                          user.role === 'admin' ? 'admin-badge-error' :
                          user.role === 'operator' ? 'admin-badge-warning' :
                          user.role === 'support' ? 'admin-badge-info' :
                          'admin-badge-default'
                        }`}>
                          {user.role === 'admin' ? '管理员' :
                           user.role === 'operator' ? '运营人员' :
                           user.role === 'support' ? '客服人员' : '普通用户'}
                        </span>
                      </td>
                      <td>{new Date(user.created_at).toLocaleDateString('zh-CN')}</td>
                      <td>
                        <button 
                          className="admin-pagination-btn"
                          onClick={() => window.location.href = `/admin/users/${user.id}`}
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

