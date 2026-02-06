import { useEffect, useRef } from 'react';

interface LogoProps {
  variant?: 'squircle' | 'circle' | 'text' | 'simple';
  size?: number;
  className?: string;
  theme?: 'light' | 'dark';
}

export function Logo({ variant = 'squircle', size = 32, className = '', theme = 'light' }: LogoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    const computedStyle = getComputedStyle(document.documentElement);
    const bgColor = computedStyle.getPropertyValue('--primary').trim() || (theme === 'dark' ? '#818cf8' : '#6366f1');
    const iconColor = computedStyle.getPropertyValue('--primary-foreground').trim() || (theme === 'dark' ? '#0f172a' : '#ffffff');

    ctx.clearRect(0, 0, w, h);

    if (variant === 'squircle') {
      ctx.fillStyle = bgColor;
      const r = w * 0.35;
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, r);
      ctx.fill();
    } else if (variant === 'circle') {
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.arc(cx, cy, w / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    const iconSize = w * 0.6;
    ctx.strokeStyle = iconColor;
    ctx.lineWidth = iconSize * 0.12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const checkStart = { x: cx - (iconSize * 0.2), y: cy + (iconSize * 0.05) };
    const checkPivot = { x: cx - (iconSize * 0.05), y: cy + (iconSize * 0.25) };
    const checkEnd = { x: cx + (iconSize * 0.25), y: cy - (iconSize * 0.25) };

    ctx.beginPath();
    ctx.moveTo(checkStart.x, checkStart.y);
    ctx.lineTo(checkPivot.x, checkPivot.y);
    ctx.lineTo(checkEnd.x, checkEnd.y);
    ctx.stroke();

    ctx.globalAlpha = 0.3;
    ctx.lineWidth = iconSize * 0.05;
    ctx.beginPath();
    ctx.arc(cx, cy, iconSize * 0.35, Math.PI * 1.2, Math.PI * 2.2);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }, [variant, theme]);

  if (variant === 'simple') {
    return (
      <div className={`bg-primary rounded-lg flex items-center justify-center shadow-sm relative overflow-hidden ${className}`} style={{ width: size, height: size }}>
        <div className="w-1.5 h-3 border-r-2 border-b-2 border-primary-foreground transform rotate-45 mb-1 ml-0.5"></div>
        <div className="absolute inset-0 border-2 border-border rounded-lg"></div>
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <canvas ref={canvasRef} width={size} height={size} className="drop-shadow-sm" />
        <span className="font-bold text-foreground tracking-tight font-logo" style={{ fontSize: size * 0.6 }}>
          Action<span className="font-normal text-muted-foreground">Minutes</span>
        </span>
      </div>
    );
  }

  return <canvas ref={canvasRef} width={size} height={size} className={className} />;
}

export function LogoWordmark({ size = 'base', className = '' }: { size?: 'sm' | 'base' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'text-base',
    base: 'text-xl',
    lg: 'text-3xl'
  };

  return (
    <span className={`font-bold text-foreground tracking-tight font-logo ${sizeClasses[size]} ${className}`}>
      Action<span className="font-normal text-muted-foreground">Minutes</span>
    </span>
  );
}
