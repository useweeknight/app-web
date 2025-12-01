/**
 * Admin 菜谱库页面
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Recipe {
  id: string;
  slug: string;
  title: string;
  title_zh: string | null;
  cook_type: string[];
  time_total_min: number;
  servings: number;
  status: string;
  kid_friendly: boolean;
  updated_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.useweeknight.com';

export default function AdminRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const supabase = createClient();

  const fetchRecipes = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });

      const res = await fetch(`${API_BASE}/admin/recipes?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const result = await res.json();
      if (result.ok) {
        setRecipes(result.data);
        setTotal(result.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败');
    } finally {
      setLoading(false);
    }
  }, [supabase, page, search, statusFilter]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

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
            placeholder="搜索菜名..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="admin-filter-select"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
          <option value="archived">已归档</option>
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
        ) : recipes.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">📖</div>
            <div className="admin-empty-title">暂无菜谱</div>
          </div>
        ) : (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>菜名</th>
                    <th>烹饪方式</th>
                    <th>时长</th>
                    <th>份数</th>
                    <th>状态</th>
                    <th>适合儿童</th>
                    <th>更新时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {recipes.map((recipe) => (
                    <tr key={recipe.id}>
                      <td>
                        <div>
                          <div style={{ fontWeight: 500 }}>{recipe.title}</div>
                          {recipe.title_zh && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                              {recipe.title_zh}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {recipe.cook_type?.slice(0, 2).map((t, i) => (
                          <span key={i} className="admin-badge admin-badge-default" style={{ marginRight: '0.25rem' }}>
                            {t}
                          </span>
                        ))}
                      </td>
                      <td>{recipe.time_total_min} 分钟</td>
                      <td>{recipe.servings} 人份</td>
                      <td>
                        <span className={`admin-badge ${
                          recipe.status === 'published' ? 'admin-badge-success' :
                          recipe.status === 'draft' ? 'admin-badge-warning' :
                          'admin-badge-default'
                        }`}>
                          {recipe.status === 'published' ? '已发布' :
                           recipe.status === 'draft' ? '草稿' : '已归档'}
                        </span>
                      </td>
                      <td>{recipe.kid_friendly ? '✅' : '❌'}</td>
                      <td>{new Date(recipe.updated_at).toLocaleDateString('zh-CN')}</td>
                      <td>
                        <button 
                          className="admin-pagination-btn"
                          onClick={() => window.location.href = `/admin/recipes/${recipe.id}`}
                        >
                          编辑
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

