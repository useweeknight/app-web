/**
 * Admin 剩菜管理页面
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Leftover {
  id: string;
  name: string;
  servings: number;
  safe_until: string;
  is_consumed: boolean;
  created_at: string;
  households?: { id: string; name: string };
  recipe?: { id: string; title: string };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.useweeknight.com';

export default function AdminLeftoversPage() {
  const [items, setItems] = useState<Leftover[]>([]);
  const [loading, setLoading] = useState(true);
  const [expiredOnly, setExpiredOnly] = useState(false);
  const [consumedFilter, setConsumedFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(expiredOnly && { expired_only: 'true' }),
        ...(consumedFilter && { consumed: consumedFilter }),
      });

      const res = await fetch(`${API_BASE}/admin/leftovers?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const result = await res.json();
      if (result.ok) {
        setItems(result.data);
        setTotal(result.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [supabase, page, expiredOnly, consumedFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / limit);
  const now = new Date().toISOString();

  return (
    <div>
      <div className="admin-toolbar">
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={expiredOnly}
            onChange={(e) => { setExpiredOnly(e.target.checked); setPage(1); }}
          />
          仅显示过期
        </label>
        <select
          className="admin-filter-select"
          value={consumedFilter}
          onChange={(e) => { setConsumedFilter(e.target.value); setPage(1); }}
        >
          <option value="">全部状态</option>
          <option value="true">已消费</option>
          <option value="false">未消费</option>
        </select>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="admin-loading"><div className="admin-loading-spinner" /></div>
        ) : items.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">🥡</div>
            <div className="admin-empty-title">暂无剩菜记录</div>
          </div>
        ) : (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>份数</th>
                    <th>安全期限</th>
                    <th>状态</th>
                    <th>创建时间</th>
                    <th>所属家庭</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.recipe?.title || item.name || '-'}</td>
                      <td>{item.servings} 份</td>
                      <td>
                        <span className={item.safe_until < now && !item.is_consumed ? 'admin-badge admin-badge-error' : ''}>
                          {new Date(item.safe_until).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-badge ${item.is_consumed ? 'admin-badge-success' : 'admin-badge-warning'}`}>
                          {item.is_consumed ? '已消费' : '未消费'}
                        </span>
                      </td>
                      <td>{new Date(item.created_at).toLocaleDateString('zh-CN')}</td>
                      <td>{item.households?.name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-pagination">
              <div className="admin-pagination-info">共 {total} 条，第 {page} / {totalPages} 页</div>
              <div className="admin-pagination-buttons">
                <button className="admin-pagination-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
                <button className="admin-pagination-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

