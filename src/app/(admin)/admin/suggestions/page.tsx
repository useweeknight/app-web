/**
 * Admin 建议日志页面
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Suggestion {
  id: string;
  recipe_id: string;
  created_at: string;
  meta: unknown;
  users?: { id: string; email: string; display_name: string | null };
  recipe?: { id: string; title: string; title_zh: string | null };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.useweeknight.com';

export default function AdminSuggestionsPage() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('7');
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
        days,
      });

      const res = await fetch(`${API_BASE}/admin/suggestions?${params}`, {
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
  }, [supabase, page, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="admin-toolbar">
        <select
          className="admin-filter-select"
          value={days}
          onChange={(e) => { setDays(e.target.value); setPage(1); }}
        >
          <option value="7">近 7 天</option>
          <option value="14">近 14 天</option>
          <option value="30">近 30 天</option>
        </select>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="admin-loading"><div className="admin-loading-spinner" /></div>
        ) : items.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">💡</div>
            <div className="admin-empty-title">暂无建议记录</div>
          </div>
        ) : (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>用户</th>
                    <th>推荐菜谱</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{new Date(item.created_at).toLocaleString('zh-CN')}</td>
                      <td>{item.users?.email || item.users?.display_name || '-'}</td>
                      <td>
                        {item.recipe?.title || '-'}
                        {item.recipe?.title_zh && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginLeft: '0.5rem' }}>
                            ({item.recipe.title_zh})
                          </span>
                        )}
                      </td>
                      <td>
                        <button 
                          className="admin-pagination-btn"
                          onClick={() => {
                            const detail = JSON.stringify(item.meta, null, 2);
                            alert(detail);
                          }}
                        >
                          详情
                        </button>
                      </td>
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

