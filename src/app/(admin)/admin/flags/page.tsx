/**
 * Admin Flags 页面 - 内容标签/风险标签管理
 *
 * 用于给菜谱打上「烘焙高风险 / 生食敏感 / 孩子不爱」等运营标签
 * 注意：这与 feature_flags（功能开关）不同！
 *
 * - feature_flags：功能开关，在 /admin/system 中查看
 * - content_flags：内容标签，在此页面管理
 */
'use client';

import { useState, useEffect, useCallback } from 'react';

interface ContentFlag {
  id: string;
  key: string;
  name: string;
  name_en: string;
  description: string;
  scope: string;
  severity: 'low' | 'medium' | 'high';
  enabled: boolean;
  requires_confirmation: boolean;
  created_at: string;
  updated_at: string;
}

interface FlagsResponse {
  ok: boolean;
  data: ContentFlag[];
  total: number;
  trace_id?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.useweeknight.com';

// 中文文案
const zh = {
  title: '内容标签管理',
  subtitle: '管理菜谱的风险标签和内容标注（区别于功能开关 feature_flags）',
  loading: '加载中...',
  error: '加载失败',
  retry: '重试',
  add_new: '新增标签',
  name: '标签名称',
  name_en: '英文名称',
  description: '描述',
  scope: '适用范围',
  severity: '严重程度',
  enabled: '启用状态',
  requires_confirmation: '需要二次确认',
  actions: '操作',
  edit: '编辑',
  delete: '删除',
  save: '保存',
  cancel: '取消',
  confirm_delete: '确定要删除此标签吗？',
  created: '创建成功',
  updated: '更新成功',
  deleted: '删除成功',
  severity_low: '低',
  severity_medium: '中',
  severity_high: '高',
  scope_recipe: '菜谱',
  scope_step: '步骤',
  scope_ingredient: '配料',
  yes: '是',
  no: '否',
  filter_all: '全部',
  filter_enabled: '已启用',
  filter_disabled: '已禁用',
  info_box: '💡 提示：内容标签用于标注菜谱的风险特征（如烘焙敏感、生食警告），服务于推荐策略和用户提示。功能开关（feature_flags）请在「系统配置」页面查看。'
};

// 严重程度样式
const severityStyles: Record<string, string> = {
  low: 'severity-low',
  medium: 'severity-medium',
  high: 'severity-high'
};

// 严重程度标签
const severityLabels: Record<string, string> = {
  low: zh.severity_low,
  medium: zh.severity_medium,
  high: zh.severity_high
};

export default function AdminFlagsPage() {
  const [flags, setFlags] = useState<ContentFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingFlag, setEditingFlag] = useState<ContentFlag | null>(null);
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    name_en: '',
    description: '',
    scope: 'recipe',
    severity: 'medium' as 'low' | 'medium' | 'high',
    enabled: true,
    requires_confirmation: false
  });

  // 获取标签列表
  const fetchFlags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/flags`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data: FlagsResponse = await res.json();
      if (data.ok) {
        setFlags(data.data);
      } else {
        setError('获取标签列表失败');
      }
    } catch (err) {
      setError('网络错误，请重试');
      console.error('[Flags] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  // 过滤标签
  const filteredFlags = flags.filter(flag => {
    if (filter === 'enabled') return flag.enabled;
    if (filter === 'disabled') return !flag.enabled;
    return true;
  });

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingFlag(null);
    setFormData({
      key: '',
      name: '',
      name_en: '',
      description: '',
      scope: 'recipe',
      severity: 'medium',
      enabled: true,
      requires_confirmation: false
    });
    setShowModal(true);
  };

  // 打开编辑弹窗
  const handleEdit = (flag: ContentFlag) => {
    setEditingFlag(flag);
    setFormData({
      key: flag.key,
      name: flag.name,
      name_en: flag.name_en,
      description: flag.description,
      scope: flag.scope,
      severity: flag.severity,
      enabled: flag.enabled,
      requires_confirmation: flag.requires_confirmation
    });
    setShowModal(true);
  };

  // 保存标签
  const handleSave = async () => {
    try {
      const url = editingFlag
        ? `${API_BASE_URL}/admin/flags/${editingFlag.id}`
        : `${API_BASE_URL}/admin/flags`;
      const method = editingFlag ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (data.ok) {
        setShowModal(false);
        fetchFlags();
      } else {
        alert(data.message || '保存失败');
      }
    } catch (err) {
      alert('保存失败，请重试');
      console.error('[Flags] Save error:', err);
    }
  };

  // 删除标签
  const handleDelete = async (flag: ContentFlag) => {
    if (!confirm(zh.confirm_delete)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/flags/${flag.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await res.json();
      if (data.ok) {
        fetchFlags();
      } else {
        alert(data.message || '删除失败');
      }
    } catch (err) {
      alert('删除失败，请重试');
      console.error('[Flags] Delete error:', err);
    }
  };

  // 切换启用状态
  const handleToggle = async (flag: ContentFlag) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/flags/${flag.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: !flag.enabled })
      });

      const data = await res.json();
      if (data.ok) {
        fetchFlags();
      }
    } catch (err) {
      console.error('[Flags] Toggle error:', err);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{zh.title}</h1>
          <p className="admin-page-subtitle">{zh.subtitle}</p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={handleAdd}>
          + {zh.add_new}
        </button>
      </div>

      {/* 提示框 */}
      <div className="admin-info-box" style={{ 
        background: 'rgba(255, 193, 7, 0.1)', 
        border: '1px solid rgba(255, 193, 7, 0.3)',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '24px',
        fontSize: '14px',
        color: 'var(--admin-text-secondary)'
      }}>
        {zh.info_box}
      </div>

      {/* 筛选器 */}
      <div className="admin-filters" style={{ marginBottom: '16px' }}>
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value as 'all' | 'enabled' | 'disabled')}
          className="admin-select"
        >
          <option value="all">{zh.filter_all}</option>
          <option value="enabled">{zh.filter_enabled}</option>
          <option value="disabled">{zh.filter_disabled}</option>
        </select>
      </div>

      {/* 内容 */}
      {loading ? (
        <div className="admin-loading">{zh.loading}</div>
      ) : error ? (
        <div className="admin-error">
          <p>{error}</p>
          <button className="admin-btn" onClick={fetchFlags}>{zh.retry}</button>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{zh.name}</th>
                <th>{zh.description}</th>
                <th>{zh.scope}</th>
                <th>{zh.severity}</th>
                <th>{zh.requires_confirmation}</th>
                <th>{zh.enabled}</th>
                <th>{zh.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredFlags.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>
                    暂无数据
                  </td>
                </tr>
              ) : (
                filteredFlags.map((flag) => (
                  <tr key={flag.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{flag.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--admin-text-secondary)' }}>
                        {flag.name_en}
                      </div>
                    </td>
                    <td>{flag.description}</td>
                    <td>
                      <span className="admin-badge">
                        {flag.scope === 'recipe' ? zh.scope_recipe : 
                         flag.scope === 'step' ? zh.scope_step : 
                         flag.scope === 'ingredient' ? zh.scope_ingredient : flag.scope}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge ${severityStyles[flag.severity]}`}>
                        {severityLabels[flag.severity] || flag.severity}
                      </span>
                    </td>
                    <td>{flag.requires_confirmation ? zh.yes : zh.no}</td>
                    <td>
                      <button
                        className={`admin-toggle ${flag.enabled ? 'active' : ''}`}
                        onClick={() => handleToggle(flag)}
                        title={flag.enabled ? '点击禁用' : '点击启用'}
                      >
                        <span className="admin-toggle-slider" />
                      </button>
                    </td>
                    <td>
                      <div className="admin-actions">
                        <button 
                          className="admin-btn admin-btn-sm"
                          onClick={() => handleEdit(flag)}
                        >
                          {zh.edit}
                        </button>
                        <button 
                          className="admin-btn admin-btn-sm admin-btn-danger"
                          onClick={() => handleDelete(flag)}
                        >
                          {zh.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 编辑弹窗 */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{editingFlag ? '编辑标签' : '新增标签'}</h2>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="admin-modal-body">
              {!editingFlag && (
                <div className="admin-form-group">
                  <label>标签 Key（唯一标识）</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={formData.key}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                    placeholder="例如: spicy_warning"
                  />
                </div>
              )}
              <div className="admin-form-group">
                <label>{zh.name}</label>
                <input
                  type="text"
                  className="admin-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如: 辣度警告"
                />
              </div>
              <div className="admin-form-group">
                <label>{zh.name_en}</label>
                <input
                  type="text"
                  className="admin-input"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  placeholder="例如: Spicy Warning"
                />
              </div>
              <div className="admin-form-group">
                <label>{zh.description}</label>
                <textarea
                  className="admin-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="描述这个标签的用途"
                  rows={3}
                />
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>{zh.scope}</label>
                  <select
                    className="admin-select"
                    value={formData.scope}
                    onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                  >
                    <option value="recipe">{zh.scope_recipe}</option>
                    <option value="step">{zh.scope_step}</option>
                    <option value="ingredient">{zh.scope_ingredient}</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>{zh.severity}</label>
                  <select
                    className="admin-select"
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value as 'low' | 'medium' | 'high' })}
                  >
                    <option value="low">{zh.severity_low}</option>
                    <option value="medium">{zh.severity_medium}</option>
                    <option value="high">{zh.severity_high}</option>
                  </select>
                </div>
              </div>
              <div className="admin-form-group">
                <label className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.requires_confirmation}
                    onChange={(e) => setFormData({ ...formData, requires_confirmation: e.target.checked })}
                  />
                  <span>{zh.requires_confirmation}（用户需要确认后才能继续）</span>
                </label>
              </div>
              <div className="admin-form-group">
                <label className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  />
                  <span>启用此标签</span>
                </label>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn" onClick={() => setShowModal(false)}>
                {zh.cancel}
              </button>
              <button className="admin-btn admin-btn-primary" onClick={handleSave}>
                {zh.save}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .admin-checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        .admin-checkbox-label input {
          width: 16px;
          height: 16px;
        }
        .admin-toggle {
          position: relative;
          width: 44px;
          height: 24px;
          background: var(--admin-border);
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .admin-toggle.active {
          background: var(--admin-primary);
        }
        .admin-toggle-slider {
          position: absolute;
          left: 2px;
          top: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.2s;
        }
        .admin-toggle.active .admin-toggle-slider {
          transform: translateX(20px);
        }
        .severity-low {
          background: rgba(76, 175, 80, 0.2);
          color: #4caf50;
        }
        .severity-medium {
          background: rgba(255, 152, 0, 0.2);
          color: #ff9800;
        }
        .severity-high {
          background: rgba(244, 67, 54, 0.2);
          color: #f44336;
        }
        .admin-btn-danger {
          background: rgba(244, 67, 54, 0.1);
          color: #f44336;
        }
        .admin-btn-danger:hover {
          background: rgba(244, 67, 54, 0.2);
        }
        .admin-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .admin-modal {
          background: var(--admin-bg-secondary);
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow: auto;
        }
        .admin-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--admin-border);
        }
        .admin-modal-header h2 {
          margin: 0;
          font-size: 18px;
        }
        .admin-modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: var(--admin-text-secondary);
        }
        .admin-modal-body {
          padding: 20px;
        }
        .admin-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid var(--admin-border);
        }
        .admin-form-group {
          margin-bottom: 16px;
        }
        .admin-form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 500;
        }
        .admin-input, .admin-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          background: var(--admin-bg);
          color: var(--admin-text);
          font-size: 14px;
        }
        .admin-input:focus, .admin-select:focus {
          outline: none;
          border-color: var(--admin-primary);
        }
        textarea.admin-input {
          resize: vertical;
        }
      `}</style>
    </div>
  );
}

