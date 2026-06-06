import type { CanvasConfig, PaperSize } from '../types';
import { PAPER_SIZES } from '../types';

interface Props {
  config: CanvasConfig;
  onChange: (c: CanvasConfig) => void;
}

const FILL_MODES = [
  {
    id: 'balanced' as const,
    label: '均衡排版',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="9" width="4" height="6" rx="1"/>
        <rect x="6" y="5" width="4" height="10" rx="1"/>
        <rect x="11" y="2" width="4" height="13" rx="1"/>
      </svg>
    ),
    desc: '按面积均分纸张——小贴纸多印、大贴纸少印，每种图片占据相近的版面',
  },
  {
    id: 'fill' as const,
    label: '塞满纸张',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="6" height="6" rx="1"/>
        <rect x="9" y="1" width="6" height="6" rx="1"/>
        <rect x="1" y="9" width="6" height="6" rx="1"/>
        <rect x="9" y="9" width="6" height="6" rx="1"/>
      </svg>
    ),
    desc: '尽可能多地排列贴纸，最大化总数量',
  },
  {
    id: 'manual' as const,
    label: '手动设置',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 1v14M1 8h14"/>
      </svg>
    ),
    desc: '自行指定每张图片的印刷数量',
  },
];

export function CanvasSettings({ config, onChange }: Props) {
  const set = (patch: Partial<CanvasConfig>) => onChange({ ...config, ...patch });

  const setPaper = (size: PaperSize) => {
    if (size === 'custom') {
      set({ paperSize: 'custom' });
    } else {
      const p = PAPER_SIZES[size];
      set({ paperSize: size, widthMm: p.w, heightMm: p.h });
    }
  };

  const paperLabels: Record<string, string> = { A4: 'A4', A5: 'A5', A6: 'A6', custom: '自定义' };

  return (
    <div className="canvas-settings">
      <h3 className="settings-title">排版模式</h3>

      <div className="fill-mode-cards">
        {FILL_MODES.map((m) => (
          <button
            key={m.id}
            className={`fill-mode-card${config.fillMode === m.id ? ' active' : ''}`}
            onClick={() => set({ fillMode: m.id })}
          >
            <div className="fill-mode-top">
              <span className="fill-mode-icon">{m.icon}</span>
              <span className="fill-mode-label">{m.label}</span>
              {config.fillMode === m.id && <span className="fill-mode-check">✓</span>}
            </div>
            <p className="fill-mode-desc">{m.desc}</p>
          </button>
        ))}
      </div>

      <h3 className="settings-title" style={{ marginTop: 14 }}>纸张设置</h3>

      <div className="settings-grid">
        <div className="field-group" style={{ gridColumn: '1 / -1' }}>
          <label>纸张规格</label>
          <div className="paper-buttons">
            {(['A4', 'A5', 'A6', 'custom'] as PaperSize[]).map((s) => (
              <button
                key={s}
                className={`paper-btn${config.paperSize === s ? ' active' : ''}`}
                onClick={() => setPaper(s)}
              >
                {paperLabels[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="field-group">
          <label>宽度 (mm)</label>
          <input
            type="number"
            value={config.widthMm}
            min="50"
            max="1000"
            onChange={(e) => set({ paperSize: 'custom', widthMm: parseFloat(e.target.value) || 210 })}
          />
        </div>

        <div className="field-group">
          <label>高度 (mm)</label>
          <input
            type="number"
            value={config.heightMm}
            min="50"
            max="1000"
            onChange={(e) => set({ paperSize: 'custom', heightMm: parseFloat(e.target.value) || 297 })}
          />
        </div>

        <div className="field-group">
          <label>分辨率 DPI</label>
          <select value={config.dpi} onChange={(e) => set({ dpi: parseInt(e.target.value) })}>
            <option value={72}>72（屏幕）</option>
            <option value={150}>150</option>
            <option value={300}>300（印刷）</option>
            <option value={600}>600（高精）</option>
          </select>
        </div>

        <div className="field-group">
          <label>间距 (mm)</label>
          <input
            type="number"
            value={config.spacingMm}
            min="0"
            max="20"
            step="0.5"
            onChange={(e) => set({ spacingMm: parseFloat(e.target.value) || 0 })}
          />
        </div>

        <div className="field-group">
          <label>页边距 (mm)</label>
          <input
            type="number"
            value={config.paddingMm}
            min="0"
            max="30"
            step="0.5"
            onChange={(e) => set({ paddingMm: parseFloat(e.target.value) || 0 })}
          />
        </div>

        <div className="field-group toggle-group">
          <label>允许旋转</label>
          <button
            className={`toggle-btn${config.rotateAllowed ? ' on' : ''}`}
            onClick={() => set({ rotateAllowed: !config.rotateAllowed })}
          >
            {config.rotateAllowed ? '开' : '关'}
          </button>
        </div>
      </div>

      <div className="canvas-info">
        {Math.round((config.widthMm / 25.4) * config.dpi)} ×{' '}
        {Math.round((config.heightMm / 25.4) * config.dpi)} 像素 · {config.dpi} DPI
      </div>
    </div>
  );
}
