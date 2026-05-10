import React from 'react';

// boxes: array of { x, y, width, height } in pixels or normalized (0..1)
export function OverlayBoxes({ boxes = [], imageWidth = 0, imageHeight = 0, color = 'rgba(255,0,0,0.35)' }) {
  if (!boxes || boxes.length === 0) return null;

  const isNormalized = (b) => Math.max(b.x, b.y, b.width, b.height) <= 1;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {boxes.map((b, i) => {
        const norm = isNormalized(b);
        const left = norm ? b.x * imageWidth : b.x;
        const top = norm ? b.y * imageHeight : b.y;
        const width = norm ? b.width * imageWidth : b.width;
        const height = norm ? b.height * imageHeight : b.height;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${left}px`,
              top: `${top}px`,
              width: `${width}px`,
              height: `${height}px`,
              border: `2px solid ${color}`,
              background: color,
              mixBlendMode: 'multiply'
            }}
          />
        );
      })}
    </div>
  );
}

export default OverlayBoxes;
