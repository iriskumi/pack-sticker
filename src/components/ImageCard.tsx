import type { UploadedImage } from '../types';

interface Props {
  image: UploadedImage;
  fillMode: 'fill' | 'balanced' | 'manual';
  packedCount: number;
  recommendedCount: number;
  onUpdate: (id: string, changes: Partial<UploadedImage>) => void;
  onRemove: (id: string) => void;
  onRemoveBg: (id: string) => void;
}

export function ImageCard({ image, fillMode, packedCount, recommendedCount, onUpdate, onRemove, onRemoveBg }: Props) {
  const aspect = image.naturalHeight / image.naturalWidth;
  const heightCm = (image.targetWidthCm * aspect).toFixed(2);

  const effectiveBalanced = image.balancedCopies > 0 ? image.balancedCopies : recommendedCount;
  const isOverridden = image.balancedCopies > 0;

  return (
    <div className={`image-card${image.isProcessing ? ' processing' : ''}`}>
      <div className="image-card-thumb">
        <img src={image.processedDataUrl} alt={image.file.name} />
        {image.isProcessing && (
          <div className="processing-overlay">
            <span className="spinner" />
          </div>
        )}
      </div>

      <div className="image-card-body">
        <p className="image-card-name" title={image.file.name}>{image.file.name}</p>
        <p className="image-card-dims">
          {image.naturalWidth} × {image.naturalHeight}px
          {image.hasTransparency && <span className="badge-trans">透明</span>}
        </p>

        <div className="field-row">
          <label>宽度</label>
          <input
            type="number"
            min="0.5"
            max="50"
            step="0.1"
            value={image.targetWidthCm}
            onChange={(e) => onUpdate(image.id, { targetWidthCm: parseFloat(e.target.value) || 1 })}
          />
          <span className="field-hint">{image.targetWidthCm} × {heightCm} cm</span>
        </div>

        {fillMode === 'balanced' && (
          <div className="balanced-copies-row">
            <div className="balanced-copies-label">
              <span>数量</span>
              {!isOverridden && (
                <span className="auto-tag">自动</span>
              )}
            </div>
            <div className="balanced-copies-input-group">
              <input
                type="number"
                min="1"
                max="200"
                step="1"
                value={effectiveBalanced || ''}
                placeholder={recommendedCount ? String(recommendedCount) : '…'}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  onUpdate(image.id, { balancedCopies: isNaN(v) || v < 1 ? 0 : v });
                }}
              />
              {isOverridden && (
                <button
                  className="reset-btn"
                  title={`恢复自动推荐（${recommendedCount} 张）`}
                  onClick={() => onUpdate(image.id, { balancedCopies: 0 })}
                >
                  ↺
                </button>
              )}
            </div>
            <div className="packed-info-inline">
              {packedCount > 0 ? (
                <span className="packed-inline-num">实际 {packedCount} 张</span>
              ) : (
                <span className="packed-inline-zero">放不下</span>
              )}
            </div>
          </div>
        )}

        {fillMode === 'fill' && (
          <div className="packed-info-row">
            {packedCount > 0 ? (
              <div className="packed-result">
                <span className="packed-num">{packedCount}</span>
                <span className="packed-label">张</span>
              </div>
            ) : (
              <span className="packed-badge zero">放不下 — 请缩小尺寸</span>
            )}
          </div>
        )}

        {fillMode === 'manual' && (
          <div className="field-row">
            <label>数量</label>
            <input
              type="number"
              min="1"
              max="200"
              step="1"
              value={image.copies}
              onChange={(e) => onUpdate(image.id, { copies: Math.max(1, parseInt(e.target.value) || 1) })}
            />
            {packedCount > 0 && (
              <span className="field-hint">已排 {packedCount} 张</span>
            )}
          </div>
        )}

        <div className="image-card-actions">
          {!image.hasTransparency && (
            <button
              className="btn-sm btn-secondary"
              onClick={() => onRemoveBg(image.id)}
              disabled={image.isProcessing}
            >
              {image.isProcessing ? '处理中…' : '去除背景'}
            </button>
          )}
          <button className="btn-sm btn-danger" onClick={() => onRemove(image.id)}>
            ✕ 删除
          </button>
        </div>
      </div>
    </div>
  );
}
