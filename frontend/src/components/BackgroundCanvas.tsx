import { useEffect, useRef, useState } from 'react';
import allosoLogo from '../assets/Alloso_LOGO_Basic (1).jpg';

// Fallback images (used when API is unavailable)
const FALLBACK_SLIDES = [
  'https://cdn.alloso.co.kr/AllosoUpload/contents/20251210/_34691fc6-6124-4523-8821-93e43e1e6059.jpg',
  'https://cdn.alloso.co.kr/AllosoUpload/contents/20251210/_8681a295-e64f-4d3b-8945-38a7c368a750.jpg',
  'https://cdn.alloso.co.kr/AllosoUpload/contents/20240725/_7a16dfb3-88f1-45e6-8d96-993354815469.jpg',
];

const FLOATERS = [
  { cls: 'logo-float-a', top: '8%',  left: '6%',  size: 52, delay: '0s',   opacity: 0.10 },
  { cls: 'logo-float-b', top: '18%', left: '78%', size: 44, delay: '-6s',  opacity: 0.08 },
  { cls: 'logo-float-c', top: '55%', left: '12%', size: 60, delay: '-10s', opacity: 0.09 },
  { cls: 'logo-float-d', top: '70%', left: '72%', size: 48, delay: '-4s',  opacity: 0.09 },
  { cls: 'logo-float-e', top: '38%', left: '88%', size: 36, delay: '-14s', opacity: 0.07 },
  { cls: 'logo-float-a', top: '85%', left: '35%', size: 40, delay: '-8s',  opacity: 0.08 },
  { cls: 'logo-float-c', top: '28%', left: '48%', size: 32, delay: '-18s', opacity: 0.06 },
];

const GEO_SHAPES = [
  { type: 'hex',     top: '4%',  left: '2%',  size: 120, color: 'rgba(139,124,248,0.10)', spin: 'geo-spin-slow', dur: '40s', delay: '0s' },
  { type: 'diamond', top: '2%',  left: '88%', size: 90,  color: 'rgba(248,200,212,0.14)', spin: 'geo-spin-rev',  dur: '35s', delay: '-5s' },
  { type: 'ring',    top: '80%', left: '1%',  size: 100, color: 'rgba(184,240,224,0.16)', spin: 'geo-spin-slow', dur: '50s', delay: '-12s' },
  { type: 'tri',     top: '82%', left: '90%', size: 80,  color: 'rgba(184,212,248,0.14)', spin: 'geo-spin-rev',  dur: '45s', delay: '-8s' },
  { type: 'cross',   top: '45%', left: '3%',  size: 60,  color: 'rgba(139,124,248,0.08)', spin: 'geo-spin-slow', dur: '30s', delay: '-20s' },
];

function HexSvg({ size, color }: { size: number; color: string }) {
  const r = size / 2;
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${r + r * 0.85 * Math.cos(a)},${r + r * 0.85 * Math.sin(a)}`;
  }).join(' ');
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}><polygon points={pts} fill="none" stroke={color} strokeWidth="1.5" /></svg>;
}
function DiamondSvg({ size, color }: { size: number; color: string }) {
  const h = size / 2;
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}><polygon points={`${h},4 ${size-4},${h} ${h},${size-4} 4,${h}`} fill="none" stroke={color} strokeWidth="1.5" /></svg>;
}
function RingSvg({ size, color }: { size: number; color: string }) {
  const r = size / 2;
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}><circle cx={r} cy={r} r={r*0.80} fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="6 4" /><circle cx={r} cy={r} r={r*0.55} fill="none" stroke={color} strokeWidth="1" opacity="0.6" /></svg>;
}
function TriSvg({ size, color }: { size: number; color: string }) {
  const h = size / 2;
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}><polygon points={`${h},4 ${size-4},${size-4} 4,${size-4}`} fill="none" stroke={color} strokeWidth="1.5" /></svg>;
}
function CrossSvg({ size, color }: { size: number; color: string }) {
  const h = size / 2; const t = size * 0.15;
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}><line x1={h} y1={t} x2={h} y2={size-t} stroke={color} strokeWidth="1.5" /><line x1={t} y1={h} x2={size-t} y2={h} stroke={color} strokeWidth="1.5" /></svg>;
}

const SLIDE_DURATION = 6000;
const FADE_DURATION  = 1200;
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export default function BackgroundCanvas() {
  const [slides, setSlides] = useState<string[]>(FALLBACK_SLIDES);
  const [current, setCurrent] = useState(0);
  const [next, setNext]       = useState<number | null>(null);
  const [fading, setFading]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch live banner images — 앱 로드 시 + 30분마다 갱신
  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetch(`${API_BASE}/banner/images`)
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled && Array.isArray(data.images) && data.images.length > 0) {
            setSlides(data.images);
            setCurrent(0);
          }
        })
        .catch(() => { /* silently use fallback */ });
    };

    load();
    // 30분마다 자동 갱신 (홈페이지 이미지 변경 반영)
    const interval = setInterval(load, 30 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => {
    function advance() {
      const n = (current + 1) % slides.length;
      // Mount next slide at opacity 0 first, then trigger fade-in on next frame
      setNext(n);
      setFading(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setFading(true);
        });
      });
      // After fade completes, swap current → next
      timerRef.current = setTimeout(() => {
        setCurrent(n);
        setNext(null);
        setFading(false);
      }, FADE_DURATION);
    }
    timerRef.current = setTimeout(advance, SLIDE_DURATION);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, slides]);

  return (
    <div id="logo-canvas" aria-hidden="true">
      {/* ── Fullscreen image slider ── */}
      <div className="bg-slider">
        {/* Current slide — stays fully visible until next is fully faded in */}
        <div
          className="bg-slide bg-slide-current"
          style={{
            backgroundImage: `url(${slides[current]})`,
            animation: `kenburns-${current % 3} ${SLIDE_DURATION + FADE_DURATION}ms ease-in-out forwards`,
            opacity: 1,
          }}
        />
        {/* Next slide fades IN on top; current stays underneath at opacity 1 */}
        {next !== null && (
          <div
            className="bg-slide bg-slide-next"
            style={{
              backgroundImage: `url(${slides[next]})`,
              animation: `kenburns-${next % 3} ${SLIDE_DURATION + FADE_DURATION}ms ease-in-out forwards`,
              opacity: fading ? 1 : 0,
              transition: fading ? `opacity ${FADE_DURATION}ms ease-in-out` : 'none',
            }}
          />
        )}
        <div className="bg-overlay" />
      </div>

      {/* ── Floating logos ── */}
      {FLOATERS.map((f, i) => (
        <div key={i} className={`logo-float ${f.cls}`} style={{ top: f.top, left: f.left, animationDelay: f.delay, opacity: f.opacity }}>
          <img src={allosoLogo} alt="" style={{ width: f.size, height: 'auto', mixBlendMode: 'multiply', objectFit: 'contain', display: 'block' }} />
        </div>
      ))}

      {/* ── Geometric shapes ── */}
      {GEO_SHAPES.map((g, i) => (
        <div key={`geo-${i}`} style={{ position: 'absolute', top: g.top, left: g.left, animation: `${g.spin} ${g.dur} linear infinite`, animationDelay: g.delay }}>
          {g.type === 'hex'     && <HexSvg     size={g.size} color={g.color} />}
          {g.type === 'diamond' && <DiamondSvg size={g.size} color={g.color} />}
          {g.type === 'ring'    && <RingSvg    size={g.size} color={g.color} />}
          {g.type === 'tri'     && <TriSvg     size={g.size} color={g.color} />}
          {g.type === 'cross'   && <CrossSvg   size={g.size} color={g.color} />}
        </div>
      ))}
    </div>
  );
}
