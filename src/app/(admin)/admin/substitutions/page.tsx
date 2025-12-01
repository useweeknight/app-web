/**
 * Admin 替代库页面
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Substitution {
  id: string;
  original: string;
  substitute: string;
  risk_level: string;
  ratio: number;
  notes: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.useweeknight.com';

export default function AdminSubstitutionsPage() {
  const [items, setItems] = useState<Substitution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
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
        ...(riskFilter && { risk_level: riskFilter }),
      });

      const res = await fetch(`${API_BASE}/admin/substitutions?${params}`, {
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
  }, [supabase, page, search, riskFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-search">
          <input
            type="text"
            className="admin-search-input"
            placeholder="搜索配料..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ paddingLeft: '1rem' }}
          />
        </div>
        <select
          className="admin-filter-select"
          value={riskFilter}
          onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
        >
          <option value="">全部风险级别</option>
          <option value="low">低风险</option>
          <option value="medium">中风险</option>
          <option value="high">高风险</option>
          <option value="baking">烘焙敏感</option>
        </select>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="admin-loading"><div className="admin-loading-spinner" /></div>
        ) : items.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">🔄</div>
            <div className="admin-empty-title">暂无替代记录</div>
          </div>
        ) : (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>原配料</th>
                    <th>替代品</th>
                    <th>风险级别</th>
                    <th>替代比例</th>
                    <th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.original}</td>
                      <td>{item.substitute}</td>
                      <td>
                        <span className={`admin-badge ${
                          item.risk_level === 'low' ? 'admin-badge-success' :
                          item.risk_level === 'medium' ? 'admin-badge-warning' :
                          'admin-badge-error'
                        }`}>
                          {item.risk_level === 'low' ? '低风险' :
                           item.risk_level === 'medium' ? '中风险' :
                           item.risk_level === 'high' ? '高风险' : '烘焙敏感'}
                        </span>
                      </td>
                      <td>{item.ratio}x</td>
                      <td>{item.notes || '-'}</td>
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

