/**
 * Admin 库存管理页面
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface PantryItem {
  id: string;
  name: string;
  qty_est_lower: number;
  qty_est_upper: number;
  unit: string | null;
  category: string | null;
  expire_on: string | null;
  source: string;
  households?: { id: string; name: string };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.useweeknight.com';

export default function AdminPantryPage() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expiredOnly, setExpiredOnly] = useState(false);
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
        ...(search && { search }),
        ...(expiredOnly && { expired_only: 'true' }),
      });

      const res = await fetch(`${API_BASE}/admin/pantry?${params}`, {
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
  }, [supabase, page, search, expiredOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / limit);
  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-search">
          <input
            type="text"
            className="admin-search-input"
            placeholder="搜索食材..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ paddingLeft: '1rem' }}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={expiredOnly}
            onChange={(e) => { setExpiredOnly(e.target.checked); setPage(1); }}
          />
          仅显示过期
        </label>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="admin-loading"><div className="admin-loading-spinner" /></div>
        ) : items.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">🥫</div>
            <div className="admin-empty-title">暂无库存记录</div>
          </div>
        ) : (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>食材名称</th>
                    <th>数量</th>
                    <th>分类</th>
                    <th>过期日期</th>
                    <th>来源</th>
                    <th>所属家庭</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>
                        {item.qty_est_lower === item.qty_est_upper
                          ? item.qty_est_lower
                          : `${item.qty_est_lower}-${item.qty_est_upper}`}
                        {item.unit && ` ${item.unit}`}
                      </td>
                      <td>{item.category || '-'}</td>
                      <td>
                        {item.expire_on ? (
                          <span className={item.expire_on < today ? 'admin-badge admin-badge-error' : ''}>
                            {item.expire_on}
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        <span className="admin-badge admin-badge-default">{item.source}</span>
                      </td>
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

