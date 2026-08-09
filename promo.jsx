const { Easing, interpolate, clamp, SceneStage, useScene, useTimeline,
        useTweaks, TweaksPanel, TweakSection, TweakToggle, TweakColor,
        TweakText, IOSDevice } = window;

const W = 1920, H = 1080;
const TB = 64;
const WT = 104, WH = 830;

const P = {
  red: '#ec3013',
  glass: 'rgba(22,24,32,.72)', glassLine: 'rgba(255,255,255,.12)',
  mBg: '#ffffff', mLine: '#e8e8ee', mText: '#0f1115', mMuted: '#8b909a',
  mOut: '#dbeeff', mBlue: '#2f8ee0',
  eBg: '#1a1b22', eBar: '#22232c', eLine: '#2e2f3a', eText: '#d7d9e2',
  eKey: '#8ab4ff', eStr: '#e0a06a', eCom: '#5d6272', eFn: '#cd9df0', eNum: '#7fd6a8',
};
const FH = '"Archivo","Golos Text",system-ui,sans-serif';
const FU = '"Golos Text","Archivo",system-ui,sans-serif';
const FM = '"JetBrains Mono",ui-monospace,monospace';

const WALL_CHAT = `radial-gradient(circle at 1px 1px, rgba(0,0,0,.045) 1px, transparent 0),
                   linear-gradient(155deg, #f1eee6 0%, #e4e0d5 100%)`;
const WIN_SHADOW = '0 50px 100px -24px rgba(0,0,0,.8), 0 0 0 1px rgba(255,255,255,.09)';

const Ctx = React.createContext({ a: '#ec3013', handle: '@MinatsukiYue', deadlines: true });
const useCfg = () => React.useContext(Ctx);

/* картинки из images.js — там меняются ссылки */
const IMG = (key) => {
  const src = (window.PROMO_IMAGES || {})[key];
  return src ? String(src).trim() || undefined : undefined;
};
const FIT = (key) => {
  const f = (window.PROMO_IMAGES || {}).fit;
  const v = f && (f[key] || f.all);
  return v === 'contain' || v === 'cover' ? v : 'cover';
};

function iconData(name) {
  const L = window.lucide && window.lucide.icons;
  if (!L) return null;
  if (L[name]) return L[name];
  const p = name.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join('');
  return L[p] || null;
}
function Icon({ n, size = 20, sw = 2, color = 'currentColor', style }) {
  const d = iconData(n);
  if (!d) return <span style={{ display: 'block', width: size, height: size,
    flex: '0 0 auto', ...style }} />;
  return React.createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color,
    strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round',
    style: { display: 'block', flex: '0 0 auto', ...style },
  }, d.map((c, i) => React.createElement(c[0], Object.assign({ key: i }, c[1]))));
}

const MOTION = {
  in:   (lt, t0, d = 0.42) => Easing.easeOutCubic(clamp((lt - t0) / d, 0, 1)),
  draw: (lt, t0, d = 1)    => Easing.easeInOutCubic(clamp((lt - t0) / d, 0, 1)),
  pop:  (lt, t0, d = 0.52) => Easing.easeOutBack(clamp((lt - t0) / d, 0, 1)),
};
const track = (lt, keys, i, ease) =>
  interpolate(keys.map(k => k[0]), keys.map(k => k[i]), ease || Easing.easeInOutCubic)(lt);

function Cam({ lt, keys, children }) {
  return (
    <div style={{ position: 'absolute', inset: 0,
      transform: `translate(${track(lt, keys, 1)}px,${track(lt, keys, 2)}px) scale(${track(lt, keys, 3)})`,
      transformOrigin: '50% 50%' }}>{children}</div>
  );
}

function Cursor({ lt, path, clicks = [] }) {
  if (!path || !path.length) return null;
  const x = track(lt, path, 1, Easing.easeInOutQuart);
  const y = track(lt, path, 2, Easing.easeInOutQuart);
  const hit = clicks.filter(c => lt >= c && lt < c + 0.7);
  const press = clicks.some(c => lt >= c && lt < c + 0.11) ? 0.86 : 1;
  return (
    <div style={{ position: 'absolute', left: x, top: y, zIndex: 40,
      pointerEvents: 'none' }}>
      {hit.map(c => {
        const p = MOTION.draw(lt, c, 0.65);
        return (
          <div key={c} style={{ position: 'absolute', left: -60, top: -60, width: 120,
            height: 120, borderRadius: 999, border: '3px solid rgba(255,255,255,.7)',
            transform: `scale(${0.15 + p * 0.85})`, opacity: 1 - p }} />
        );
      })}
      <div style={{ transform: `scale(${press})`, transformOrigin: '4px 2px',
        filter: 'drop-shadow(0 5px 10px rgba(0,0,0,.6))' }}>
        <svg width="34" height="42" viewBox="0 0 24 30" style={{ display: 'block' }}>
          <path d="M4 1.5 L4 24 L10 18.5 L14 27.5 L17.5 26 L13.5 17 L21 16.5 Z"
            fill="#fff" stroke="rgba(0,0,0,.55)" strokeWidth="1.4" />
        </svg>
      </div>
    </div>
  );
}

const APPS = [
  { id: 'files', icon: 'folder', label: 'Проводник' },
  { id: 'browser', icon: 'app-window', label: 'Браузер' },
  { id: 'code', icon: 'code', label: 'Редактор' },
  { id: 'term', icon: 'terminal', label: 'Терминал' },
  { id: 'chat', icon: 'send', label: 'Мессенджер' },
  { id: 'figma', icon: 'palette', label: 'Макеты' },
];
const TB_X = 720;
const TB_STEP = 74;
const appX = (id) => {
  const i = APPS.findIndex(a => a.id === id);
  return TB_X + 40 + (i < 0 ? 0 : i + 1) * TB_STEP + 22;
};

function Taskbar({ lt, active = [], focus, badge, clock = '14:02', date = 'вт, 12 авг' }) {
  const { a } = useCfg();
  return (
    <div style={{ position: 'absolute', left: 0, bottom: 0, width: W, height: TB,
      background: 'rgba(14,15,20,.78)', backdropFilter: 'blur(26px)',
      borderTop: '1px solid rgba(255,255,255,.09)', display: 'flex',
      alignItems: 'center', zIndex: 30 }}>
      <div style={{ position: 'absolute', left: TB_X, display: 'flex', alignItems: 'center',
        gap: TB_STEP - 44 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, display: 'grid',
          placeItems: 'center', background: 'rgba(255,255,255,.06)' }}>
          <Icon n="layout-grid" size={22} color="rgba(255,255,255,.9)" />
        </div>
        {APPS.map(app => {
          const on = active.indexOf(app.id) >= 0;
          const isFocus = focus === app.id;
          return (
            <div key={app.id} style={{ position: 'relative', width: 44, height: 44,
              borderRadius: 10, display: 'grid', placeItems: 'center',
              background: isFocus ? 'rgba(255,255,255,.13)' : 'transparent' }}>
              <Icon n={app.icon} size={23}
                color={on ? 'rgba(255,255,255,.94)' : 'rgba(255,255,255,.5)'} />
              {on && (
                <div style={{ position: 'absolute', bottom: -6, left: '50%',
                  marginLeft: isFocus ? -11 : -4, width: isFocus ? 22 : 8, height: 3,
                  borderRadius: 3, background: isFocus ? a : 'rgba(255,255,255,.45)' }} />
              )}
              {app.id === 'chat' && badge > 0 && (
                <div style={{ position: 'absolute', right: -4, top: -4, minWidth: 20,
                  height: 20, borderRadius: 999, background: a, color: '#fff', fontSize: 12,
                  fontWeight: 700, display: 'grid', placeItems: 'center', padding: '0 5px',
                  boxShadow: '0 0 0 2px rgba(14,15,20,.9)' }}>{badge}</div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 20,
        paddingRight: 26, color: 'rgba(255,255,255,.75)' }}>
        <Icon n="wifi" size={19} color="rgba(255,255,255,.7)" />
        <Icon n="volume-2" size={19} color="rgba(255,255,255,.7)" />
        <Icon n="battery-full" size={21} color="rgba(255,255,255,.7)" />
        <div style={{ textAlign: 'right', lineHeight: 1.25, fontFamily: FU }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#fff' }}>{clock}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)' }}>{date}</div>
        </div>
        <Icon n="bell" size={19} color="rgba(255,255,255,.7)" />
      </div>
    </div>
  );
}

function Desktop({ children }) {
  const { scene, localTime } = useScene();
  const { time } = useTimeline();
  const { a, handle } = useCfg();
  const lt = localTime;
  const ref = React.useRef(null);
  const sec = Math.floor(time);
  React.useEffect(() => {
    const el = ref.current && ref.current.closest('[data-om-exportable-video-with-duration-secs]');
    if (el) el.setAttribute('data-screen-label', '00:' + String(sec).padStart(2, '0'));
  }, [sec]);

  const inv = !!scene.invert;
  const flash = 1 - clamp(lt / 0.16, 0, 1);
  const drift = Math.sin(lt * 0.45) * 12;
  const done = scene.step || 0;
  const fillAt = typeof scene.fillAt === 'number' ? scene.fillAt : -1;
  const lastBar = fillAt >= 0 ? MOTION.draw(lt, fillAt, 0.45) : 1;

  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, overflow: 'hidden',
      fontFamily: FU, color: '#fff', background: inv ? a : '#05060a' }}>

      {!inv && (
        <React.Fragment>
          <div style={{ position: 'absolute', inset: 0,
            background: 'linear-gradient(168deg, #131722 0%, #0a0c12 55%, #05060a 100%)' }} />
          <div style={{ position: 'absolute', left: 120 + drift, top: -180, width: 1500,
            height: 1100, background: `radial-gradient(closest-side, ${a}26, transparent 70%)` }} />
          <div style={{ position: 'absolute', right: -200, bottom: -260, width: 1200,
            height: 900, background: 'radial-gradient(closest-side, rgba(70,120,220,.20), transparent 72%)' }} />
          <div style={{ position: 'absolute', inset: 0,
            background: 'linear-gradient(115deg, rgba(255,255,255,.055) 0%, transparent 34%)' }} />
        </React.Fragment>
      )}

      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>

      {!inv && <Taskbar lt={lt} active={scene.apps || []} focus={scene.focus}
        badge={scene.badge || 0} clock={scene.clock || '14:02'} date={scene.date} />}

      {!inv && (scene.caption || scene.kicker) && (
        <div style={{ position: 'absolute', left: 56, bottom: TB + 34, zIndex: 34,
          padding: '20px 30px', borderRadius: 20, background: 'rgba(10,11,16,.62)',
          backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,.1)',
          maxWidth: 900 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.24em',
            color: a }}>{scene.kicker || ''}</div>
          <div style={{ marginTop: 9, fontSize: 40, fontWeight: 700, letterSpacing: '-.02em',
            lineHeight: 1.05, fontFamily: FH }}>{scene.caption || ''}</div>
        </div>
      )}

      {!inv && (
        <div style={{ position: 'absolute', right: 56, bottom: TB + 44, display: 'flex',
          gap: 9, zIndex: 34 }}>
          {[0, 1, 2].map(i => {
            const f = i < done - 1 ? 1 : i === done - 1 ? lastBar : 0;
            return (
              <div key={i} style={{ width: 74, height: 5, borderRadius: 5,
                background: 'rgba(255,255,255,.22)', overflow: 'hidden' }}>
                <div style={{ height: 5, borderRadius: 5, background: a,
                  transform: `scaleX(${f})`, transformOrigin: 'left' }} />
              </div>
            );
          })}
        </div>
      )}

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(125% 105% at 50% 45%, transparent 52%, rgba(0,0,0,.55) 100%)' }} />
      {flash > 0 && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: '#fff', opacity: flash * 0.16 }} />}
    </div>
  );
}

function Window({ lt, at = -1, title, icon, tabs, activeTab = 0, accentTab, dim,
                 minimizeAt, children, style, bodyBg = '#fff' }) {
  const { a } = useCfg();
  const open = at < 0 ? 1 : clamp(MOTION.pop(lt, at, 0.5), 0, 1.06);
  if (open <= 0) return null;
  const min = minimizeAt >= 0 ? MOTION.draw(lt, minimizeAt, 0.35) : 0;
  const scale = (0.94 + 0.06 * clamp(open, 0, 1)) * (1 - min * 0.14);
  return (
    <div style={{ position: 'absolute', borderRadius: 14, overflow: 'hidden',
      display: 'flex', flexDirection: 'column', background: P.eBg,
      boxShadow: WIN_SHADOW, opacity: clamp(open * 1.6, 0, 1) * (1 - min),
      transform: `translateY(${(1 - clamp(open, 0, 1)) * 24 + min * 300}px) scale(${scale})`,
      filter: dim ? 'saturate(.75) brightness(.72)' : 'none', ...style }}>
      <div style={{ height: 46, background: P.eBar, borderBottom: `1px solid ${P.eLine}`,
        display: 'flex', alignItems: 'stretch', flex: '0 0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px',
          flex: '0 0 auto' }}>
          <Icon n={icon} size={17} color={a} />
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,.72)' }}>{title}</span>
        </div>
        {tabs && (
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 2, flex: '1 1 auto',
            minWidth: 0, paddingLeft: 8 }}>
            {tabs.map((t, i) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 9,
                padding: '0 18px', maxWidth: 240,
                background: i === activeTab ? P.eBg : 'transparent',
                borderTop: `2px solid ${i === activeTab ? (accentTab ? a : 'transparent') : 'transparent'}`,
                borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
                <span style={{ fontSize: 14, fontFamily: FM, whiteSpace: 'nowrap',
                  color: i === activeTab ? '#fff' : 'rgba(255,255,255,.45)' }}>{t}</span>
                {i === activeTab && <Icon n="x" size={13} color="rgba(255,255,255,.4)" />}
              </div>
            ))}
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center',
          flex: '0 0 auto' }}>
          {['minus', 'square', 'x'].map((ic, i) => (
            <div key={ic} style={{ width: 46, height: 46, display: 'grid',
              placeItems: 'center', background: i === 2 ? 'transparent' : 'transparent' }}>
              <Icon n={ic} size={i === 1 ? 13 : 15} color="rgba(255,255,255,.6)" />
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: '1 1 auto', position: 'relative', minHeight: 0,
        background: bodyBg }}>{children}</div>
    </div>
  );
}

function Toast({ lt, at, out, icon, from, text, tint }) {
  const { a } = useCfg();
  const p = MOTION.pop(lt, at, 0.45);
  const o = out >= 0 ? MOTION.draw(lt, out, 0.3) : 0;
  if (p <= 0 || o >= 1) return null;
  return (
    <div style={{ position: 'absolute', right: 30, bottom: TB + 96, width: 460, zIndex: 32,
      transform: `translateX(${(1 - clamp(p, 0, 1)) * 500}px)`, opacity: 1 - o }}>
      <div style={{ background: 'rgba(24,26,34,.9)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,.12)', borderRadius: 16, padding: '18px 20px',
        display: 'flex', gap: 14, alignItems: 'center',
        boxShadow: '0 30px 60px -20px rgba(0,0,0,.85)' }}>
        <div style={{ width: 46, height: 46, borderRadius: 999, flex: '0 0 auto',
          background: tint || a, display: 'grid', placeItems: 'center' }}>
          <Icon n={icon} size={22} color="#fff" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', fontWeight: 600 }}>
            {from}
          </div>
          <div style={{ fontSize: 19, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</div>
        </div>
      </div>
    </div>
  );
}

function AltTab({ lt, at, items, active }) {
  const p = MOTION.in(lt, at, 0.12);
  const o = MOTION.draw(lt, at + 0.42, 0.16);
  if (p <= 0 || o >= 1) return null;
  const { a } = useCfg();
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 36, display: 'grid',
      placeItems: 'center', opacity: p * (1 - o), pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,5,9,.5)',
        backdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'relative', display: 'flex', gap: 18, padding: 26,
        borderRadius: 24, background: 'rgba(24,26,34,.86)',
        border: '1px solid rgba(255,255,255,.14)',
        boxShadow: '0 40px 80px -20px rgba(0,0,0,.8)' }}>
        {items.map((it, i) => (
          <div key={it[0]} style={{ width: 220, borderRadius: 14, padding: 16,
            background: i === active ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.04)',
            border: `2px solid ${i === active ? a : 'transparent'}`, display: 'flex',
            flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <Icon n={it[1]} size={34} color={i === active ? '#fff' : 'rgba(255,255,255,.55)'} />
            <div style={{ fontSize: 15, color: i === active ? '#fff' : 'rgba(255,255,255,.55)',
              whiteSpace: 'nowrap' }}>{it[0]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Badge({ lt, at, title, sub, icon, style }) {
  const { a } = useCfg();
  const p = MOTION.pop(lt, at, 0.5);
  if (p <= 0) return null;
  return (
    <div style={{ position: 'absolute', zIndex: 35,
      transform: `translateY(${(1 - clamp(p, 0, 1)) * 26}px) scale(${0.88 + 0.12 * clamp(p, 0, 1.1)})`,
      opacity: clamp(p * 2.2, 0, 1), ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, background: a,
        color: '#fff', padding: '18px 28px', borderRadius: 18,
        boxShadow: `0 30px 60px -18px ${a}99, 0 0 0 1px rgba(255,255,255,.18)` }}>
        <div style={{ width: 48, height: 48, borderRadius: 999, display: 'grid',
          placeItems: 'center', background: 'rgba(255,255,255,.2)' }}>
          <Icon n={icon || 'check'} size={26} sw={2.6} color="#fff" />
        </div>
        <div>
          {sub && <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.2em',
            opacity: .85 }}>{sub}</div>}
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.01em',
            fontFamily: FH, marginTop: sub ? 2 : 0 }}>{title}</div>
        </div>
      </div>
    </div>
  );
}

function Deadline({ lt, at, text }) {
  const { deadlines } = useCfg();
  if (!deadlines) return null;
  const p = MOTION.in(lt, at, 0.4);
  return (
    <div style={{ position: 'absolute', right: 56, top: 34, display: 'flex',
      alignItems: 'center', gap: 12, padding: '13px 22px', borderRadius: 999,
      background: 'rgba(14,15,20,.72)', border: '1px solid rgba(255,255,255,.14)',
      backdropFilter: 'blur(10px)', opacity: p, zIndex: 35,
      transform: `translateY(${(1 - p) * -18}px)` }}>
      <Icon n="clock" size={19} color="rgba(255,255,255,.75)" />
      <div style={{ fontSize: 19, fontWeight: 600 }}>{text}</div>
    </div>
  );
}

function Avatar({ letter, size = 46, from = '#5aa9f0', to = '#2f6ee0' }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size, flex: '0 0 auto',
      background: `linear-gradient(150deg, ${from}, ${to})`, color: '#fff',
      display: 'grid', placeItems: 'center', fontWeight: 600,
      fontSize: size * 0.42 }}>{letter}</div>
  );
}

const msgH = (m, maxW, fs) => {
  if (m.kind === 'file') return 250;
  const cpl = Math.max(8, Math.floor((maxW - 44) / (fs * 0.49)));
  return Math.ceil(m.text.length / cpl) * Math.round(fs * 1.4) + 44;
};

function FileCard({ m, fs }) {
  return (
    <div style={{ width: 380 }}>
      <div style={{ height: 168, borderRadius: 14, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(140deg,#2b2f3a,#161922)' }}>
        {m.slot ? <image-slot id={m.slot} shape="rect" src={IMG(m.imgKey)} fit={FIT(m.imgKey)}
          placeholder={m.slotLabel}></image-slot> : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
        <Icon n={m.icon || 'globe'} size={18} color={P.mBlue} />
        <div style={{ fontSize: fs, fontWeight: 600, color: P.mText }}>{m.text}</div>
      </div>
      <div style={{ fontSize: fs - 5, color: P.mMuted, marginTop: 3 }}>{m.meta}</div>
    </div>
  );
}

function Bubble({ m, maxW, fs }) {
  const mine = !!m.mine;
  return (
    <div style={{ maxWidth: maxW, alignSelf: mine ? 'flex-end' : 'flex-start',
      background: mine ? P.mOut : P.mBg, color: P.mText,
      borderRadius: mine ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
      padding: m.kind === 'file' ? '10px 10px 12px' : '12px 16px 10px',
      boxShadow: '0 1px 2px rgba(16,24,40,.1)', boxSizing: 'border-box' }}>
      {m.kind === 'file'
        ? <FileCard m={m} fs={fs - 2} />
        : <div style={{ fontSize: fs, lineHeight: 1.36, fontWeight: 450 }}>{m.text}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
        gap: 5, marginTop: 4, fontSize: fs - 8, color: P.mMuted }}>
        <span>{m.at2}</span>
        {mine && <Icon n="check-check" size={fs - 5} color={P.mBlue} />}
      </div>
    </div>
  );
}

function Thread({ lt, messages, maxW, fs, pad }) {
  const rows = messages.map((m, i) => {
    const at = m.at == null ? -1 : m.at;
    const p = at < 0 ? 1 : MOTION.in(lt, at, 0.34);
    if (p <= 0) return null;
    const h = msgH(m, maxW, fs);
    const settled = p >= 1;
    return (
      <div key={i} style={{ display: 'flex', flexDirection: 'column',
        marginTop: i === 0 ? 0 : 12 * p, flex: '0 0 auto',
        height: settled ? 'auto' : h * p, overflow: settled ? 'visible' : 'hidden',
        opacity: clamp(p * 1.6, 0, 1) }}>
        <div style={{ display: 'flex', flexDirection: 'column',
          transform: `translateY(${(1 - p) * 16}px)` }}>
          <Bubble m={m} maxW={maxW} fs={fs} />
        </div>
      </div>
    );
  }).filter(Boolean);
  return (
    <div style={{ position: 'absolute', inset: 0, padding: pad, boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column-reverse', overflow: 'hidden' }}>
      {rows.reverse()}
      <div style={{ alignSelf: 'center', marginBottom: 16, flex: '0 0 auto',
        background: 'rgba(0,0,0,.10)', color: 'rgba(0,0,0,.55)', padding: '4px 14px',
        borderRadius: 999, fontSize: fs - 7, fontWeight: 600 }}>сегодня</div>
    </div>
  );
}

function TypingBubble({ lt }) {
  return (
    <div style={{ position: 'absolute', left: 22, bottom: 18, background: P.mBg,
      borderRadius: '20px 20px 20px 6px', padding: '16px 20px', display: 'flex', gap: 7,
      boxShadow: '0 1px 2px rgba(16,24,40,.1)' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: 9, height: 9, borderRadius: 9, background: P.mMuted,
          opacity: 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(lt * 7 - i * 0.9)) }} />
      ))}
    </div>
  );
}

function ChatHeader({ name, sub, letter, compact, from, to }) {
  return (
    <div style={{ height: 74, background: 'rgba(255,255,255,.94)',
      borderBottom: `1px solid ${P.mLine}`, display: 'flex', alignItems: 'center',
      gap: 14, padding: '0 20px', flex: '0 0 auto', color: P.mText }}>
      {compact && <Icon n="chevron-left" size={26} sw={2.2} color={P.mBlue} />}
      <Avatar letter={letter} size={44} from={from} to={to} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 19, fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 14, color: P.mMuted }}>{sub}</div>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 20, color: P.mMuted }}>
        <Icon n={compact ? 'phone' : 'search'} size={22} />
        <Icon n="more-vertical" size={22} />
      </div>
    </div>
  );
}

function Composer({ big }) {
  const s = big ? 1 : 0.92;
  return (
    <div style={{ height: big ? 72 : 66, background: 'rgba(255,255,255,.96)',
      borderTop: `1px solid ${P.mLine}`, display: 'flex', alignItems: 'center',
      gap: 16, padding: '0 20px', flex: '0 0 auto' }}>
      <Icon n="paperclip" size={24 * s} color={P.mMuted} />
      <div style={{ flex: 1, fontSize: 18 * s, color: P.mMuted }}>Сообщение</div>
      <Icon n="smile" size={24 * s} color={P.mMuted} />
      <div style={{ width: 42 * s, height: 42 * s, borderRadius: 999, background: P.mBlue,
        display: 'grid', placeItems: 'center' }}>
        <Icon n="send-horizontal" size={21 * s} color="#fff" />
      </div>
    </div>
  );
}

const CHATS = [
  ['А', 'Артём', 'Кофейня — сайт', '#f0a35a', '#e0662f'],
  ['М', 'Марина', 'Приложение FitTrack', '#7ad3a1', '#2f9e63'],
  ['Д', 'Денис', 'Бот для барбершопа', '#a99cf0', '#6a54d6'],
];

function ChatBody({ lt, messages, active, sub, typing }) {
  const c = CHATS[active];
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
      <div style={{ width: 330, borderRight: `1px solid ${P.mLine}`, flex: '0 0 auto',
        display: 'flex', flexDirection: 'column', background: '#fbfbfc' }}>
        <div style={{ padding: '14px 16px', flex: '0 0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#eeeef1',
            borderRadius: 999, padding: '10px 16px', color: P.mMuted, fontSize: 16 }}>
            <Icon n="search" size={18} /> Поиск
          </div>
        </div>
        {CHATS.map((ch, i) => (
          <div key={i} style={{ display: 'flex', gap: 13, padding: '13px 16px',
            alignItems: 'center', flex: '0 0 auto', margin: '0 8px', borderRadius: 12,
            background: i === active ? P.mBlue : 'transparent',
            color: i === active ? '#fff' : P.mText }}>
            <Avatar letter={ch[0]} size={44} from={ch[3]} to={ch[4]} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 600 }}>{ch[1]}</div>
              <div style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: i === active ? 'rgba(255,255,255,.8)' : P.mMuted }}>{ch[2]}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <ChatHeader name={c[1]} sub={sub} letter={c[0]} from={c[3]} to={c[4]} />
        <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0,
          background: WALL_CHAT, backgroundSize: '22px 22px, cover' }}>
          <Thread lt={lt} messages={messages} maxW={560} fs={21} pad={24} />
          {typing && <TypingBubble lt={lt} />}
        </div>
        <Composer big />
      </div>
    </div>
  );
}

function PhoneChat({ lt, messages, typing, notify, name = 'Артём', letter = 'А',
                    from = '#f0a35a', to = '#e0662f', time = '14:02', style }) {
  const n = notify ? MOTION.pop(lt, notify[0], 0.45) : 0;
  const nOut = notify ? MOTION.draw(lt, notify[1], 0.3) : 0;
  return (
    <div style={{ position: 'absolute', ...style }}>
      <IOSDevice width={360} height={730} time={time}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex',
          flexDirection: 'column', background: P.mBg }}>
          <div style={{ height: 54, flex: '0 0 auto', background: 'rgba(255,255,255,.94)' }} />
          <ChatHeader name={name} sub={typing ? 'печатает…' : 'в сети'} letter={letter}
            compact from={from} to={to} />
          <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0,
            background: WALL_CHAT, backgroundSize: '22px 22px, cover' }}>
            <Thread lt={lt} messages={messages} maxW={276} fs={18} pad={14} />
            {typing && <TypingBubble lt={lt} />}
          </div>
          <Composer />
          <div style={{ height: 26, flex: '0 0 auto', background: 'rgba(255,255,255,.96)' }} />
        </div>
      </IOSDevice>
      {notify && n > 0 && nOut < 1 && (
        <div style={{ position: 'absolute', left: 16, right: 16, top: 62, zIndex: 60,
          transform: `translateY(${(1 - clamp(n, 0, 1)) * -130}px)`, opacity: 1 - nOut }}>
          <div style={{ background: 'rgba(28,28,32,.85)', backdropFilter: 'blur(24px)',
            borderRadius: 22, padding: '14px 16px', display: 'flex', gap: 12,
            alignItems: 'center', boxShadow: '0 20px 40px -12px rgba(0,0,0,.6)' }}>
            <Avatar letter={letter} size={40} from={from} to={to} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.14em',
                color: 'rgba(255,255,255,.55)' }}>СЕЙЧАС</div>
              <div style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>
                {name}: новый заказ
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TOKEN_RE = /("[^"]*"|'[^']*'|\/\/[^\n]*|#[^\n]*|\b(?:export|default|function|return|const|let|async|await|import|from|class|def|extends|if|else|for|in|new|None|True)\b|\b[a-zA-Z_][\w]*(?=\()|\d+(?:px|s|%|ms)?)/g;

function tokenize(s) {
  const out = []; let last = 0, m; TOKEN_RE.lastIndex = 0;
  const KW = /^(export|default|function|return|const|let|async|await|import|from|class|def|extends|if|else|for|in|new|None|True)$/;
  while ((m = TOKEN_RE.exec(s)) !== null) {
    if (m.index > last) out.push(<span key={out.length}>{s.slice(last, m.index)}</span>);
    const t = m[0];
    let col = P.eKey;
    if (t[0] === '"' || t[0] === "'") col = P.eStr;
    else if (t.startsWith('//') || t.startsWith('#')) col = P.eCom;
    else if (/^\d/.test(t)) col = P.eNum;
    else if (/^[a-z_]/i.test(t) && !KW.test(t)) col = P.eFn;
    out.push(<span key={out.length} style={{ color: col }}>{t}</span>);
    last = m.index + t.length;
  }
  if (last < s.length) out.push(<span key={out.length}>{s.slice(last)}</span>);
  return out;
}

function CodeBody({ lt, from, dur, lines }) {
  const total = lines.reduce((n, l) => n + l.length + 1, 0);
  const prog = MOTION.draw(lt, from, dur);
  let left = Math.floor(prog * total);
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '18px 16px', fontFamily: FM,
      fontSize: 19, lineHeight: '32px', color: P.eText, overflow: 'hidden' }}>
      {lines.map((ln, i) => {
        const take = clamp(left, 0, ln.length);
        left -= ln.length + 1;
        return (
          <div key={i} style={{ height: 32, whiteSpace: 'pre', display: 'flex' }}>
            <span style={{ width: 42, color: '#40434f', flex: '0 0 auto' }}>{i + 1}</span>
            <span>{tokenize(ln.slice(0, take))}</span>
            {take > 0 && take < ln.length && Math.floor(lt * 6) % 2 === 0 &&
              <span style={{ background: '#8ab4ff', width: 2, height: 23,
                display: 'inline-block', marginTop: 5 }} />}
          </div>
        );
      })}
    </div>
  );
}

function TermBody({ lt, at, lines }) {
  const { a } = useCfg();
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '16px 18px', fontFamily: FM,
      fontSize: 17, lineHeight: '30px', color: '#c9ccd6', overflow: 'hidden' }}>
      {lines.map((l, i) => {
        const p = MOTION.in(lt, at + i * 0.42, 0.18);
        if (p <= 0) return null;
        const ok = l[0] === '+';
        return (
          <div key={i} style={{ opacity: p, display: 'flex', gap: 10,
            color: ok ? '#7fd6a8' : '#c9ccd6' }}>
            <span style={{ color: ok ? '#7fd6a8' : a }}>{ok ? '✓' : '$'}</span>
            <span>{l.slice(1)}</span>
          </div>
        );
      })}
      <div style={{ display: 'flex', gap: 10, marginTop: 4,
        opacity: Math.floor(lt * 6) % 2 ? 1 : 0.15 }}>
        <span style={{ color: a }}>$</span>
        <span style={{ background: '#c9ccd6', width: 10, height: 20, display: 'inline-block',
          marginTop: 5 }} />
      </div>
    </div>
  );
}

function Block({ lt, at, children, style, innerStyle, radius = 14, skel = '#eceef2' }) {
  const p = MOTION.in(lt, at, 0.42);
  return (
    <div style={{ position: 'relative', ...style }}>
      <div style={{ position: 'absolute', inset: 0, background: skel,
        borderRadius: radius, opacity: 1 - p }} />
      <div style={{ position: 'relative', opacity: p,
        transform: `translateY(${(1 - p) * 16}px)`, ...innerStyle }}>{children}</div>
    </div>
  );
}

function UrlBar({ url, tabs, activeTab }) {
  return (
    <div style={{ height: 52, background: '#f3f3f5', borderBottom: '1px solid #e4e4e9',
      display: 'flex', alignItems: 'center', padding: '0 18px', gap: 14, flex: '0 0 auto' }}>
      <Icon n="arrow-left" size={19} color="#8a8e97" />
      <Icon n="rotate-cw" size={17} color="#8a8e97" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#e7e7ec',
        borderRadius: 999, padding: '8px 18px', flex: 1 }}>
        <Icon n="lock" size={14} color="#7b7f89" />
        <span style={{ fontSize: 15, color: '#4a4e57' }}>{url}</span>
      </div>
      <Icon n="star" size={17} color="#8a8e97" />
    </div>
  );
}

const MENU = [
  ['Эспрессо', '190 ₽', 'Бразилия · шоколад, орех', 'flame', '#3b2a1e'],
  ['Капучино', '240 ₽', 'на фермерском молоке', 'droplet', '#2a3327'],
  ['Раф лаванда', '290 ₽', 'на альтернативном молоке', 'milk', '#2e2838'],
];
const SLOTS = ['09:30', '11:00', '12:30', '14:00', '16:30', '18:00'];

function SiteContent({ lt }) {
  const { a } = useCfg();
  const scroll = interpolate([4.3, 5.9], [0, 330], Easing.easeInOutCubic)(lt);
  const words = ['Свежее', 'зерно', 'каждое', 'утро'];
  const cups = Math.round(MOTION.draw(lt, 5.4, 0.9) * 1284);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      background: '#0e0d0c' }}>
      <UrlBar url="coffee-lab.ru" />
      <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, overflow: 'hidden',
        color: '#f4f1ec', fontFamily: FU }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0,
          transform: `translateY(${-scroll}px)` }}>

          <Block lt={lt} at={0.35} radius={0} style={{ height: 62 }}
            skel="rgba(255,255,255,.05)" innerStyle={{ height: 62 }}>
            <div style={{ height: 62, display: 'flex', alignItems: 'center', gap: 22,
              padding: '0 28px', boxSizing: 'border-box',
              borderBottom: '1px solid rgba(255,255,255,.09)' }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: a,
                display: 'grid', placeItems: 'center' }}>
                <Icon n="coffee" size={17} color="#fff" />
              </div>
              <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.01em',
                fontFamily: FH }}>Coffee Lab</span>
              <div style={{ marginLeft: 28, display: 'flex', gap: 22, fontSize: 15,
                color: 'rgba(244,241,236,.6)' }}>
                <span>Меню</span><span>Обжарка</span><span>Команда</span><span>Контакты</span>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center',
                gap: 16 }}>
                <span style={{ fontSize: 15, color: 'rgba(244,241,236,.6)' }}>+7 900 120-45-45</span>
                <div style={{ background: a, color: '#fff', padding: '10px 18px',
                  borderRadius: 999, fontSize: 14, fontWeight: 600 }}>Забронировать</div>
              </div>
            </div>
          </Block>

          <div style={{ position: 'relative', height: 330, overflow: 'hidden',
            background: 'linear-gradient(140deg,#3a3128,#181410)' }}>
            <div style={{ position: 'absolute', inset: 0,
              opacity: MOTION.in(lt, 0.75, 0.6),
              transform: `scale(${1.08 - 0.08 * MOTION.draw(lt, 0.75, 3.2)})` }}>
              <image-slot id="site-hero" shape="rect" src={IMG('siteHero')} fit={FIT('siteHero')}
                placeholder="Фото кофейни"></image-slot>
            </div>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(90deg, rgba(8,7,6,.92) 0%, rgba(8,7,6,.45) 58%, rgba(8,7,6,.15) 100%)' }} />
            <div style={{ position: 'absolute', left: 34, top: 44, pointerEvents: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10,
                opacity: MOTION.in(lt, 0.9, 0.4) }}>
                <div style={{ width: 6, height: 6, borderRadius: 6, background: a }} />
                <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.2em',
                  color: 'rgba(244,241,236,.7)' }}>ОБЖАРКА ПО ВТОРНИКАМ</span>
              </div>
              <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', maxWidth: 520,
                gap: '0 16px' }}>
                {words.map((w, i) => {
                  const p = MOTION.in(lt, 1.0 + i * 0.11, 0.42);
                  return (
                    <div key={w} style={{ overflow: 'hidden', height: 58 }}>
                      <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.1,
                        letterSpacing: '-.035em', fontFamily: FH,
                        transform: `translateY(${(1 - p) * 62}px)` }}>{w}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 12, fontSize: 16, maxWidth: 400, lineHeight: 1.45,
                color: 'rgba(244,241,236,.68)', opacity: MOTION.in(lt, 1.5, 0.4) }}>
                Малые партии, своя обжарка и бронь столика за 15 секунд.
              </div>
              <div style={{ marginTop: 20, display: 'flex', gap: 12,
                opacity: MOTION.in(lt, 1.75, 0.4),
                transform: `translateY(${(1 - MOTION.in(lt, 1.75, 0.4)) * 14}px)` }}>
                <div style={{ background: a, color: '#fff', padding: '13px 24px',
                  borderRadius: 999, fontSize: 15, fontWeight: 600, display: 'flex',
                  alignItems: 'center', gap: 10 }}>
                  Забронировать стол <Icon n="arrow-right" size={17} color="#fff" />
                </div>
                <div style={{ border: '1px solid rgba(255,255,255,.3)', color: '#fff',
                  padding: '13px 24px', borderRadius: 999, fontSize: 15, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon n="play" size={15} color="#fff" /> Как мы жарим
                </div>
              </div>
            </div>
            <div style={{ position: 'absolute', right: 30, top: 40, display: 'flex',
              alignItems: 'center', gap: 12, padding: '12px 18px', borderRadius: 16,
              background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.18)',
              backdropFilter: 'blur(10px)',
              opacity: clamp(MOTION.pop(lt, 2.0, 0.5) * 2, 0, 1),
              transform: `scale(${0.9 + 0.1 * clamp(MOTION.pop(lt, 2.0, 0.5), 0, 1)})` }}>
              <Icon n="star" size={18} color="#ffc75a" />
              <div>
                <div style={{ fontSize: 19, fontWeight: 700, fontFamily: FH }}>4,9</div>
                <div style={{ fontSize: 12, color: 'rgba(244,241,236,.6)' }}>312 отзывов</div>
              </div>
            </div>
            <div style={{ position: 'absolute', right: 30, bottom: 26, display: 'flex',
              alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 999,
              background: 'rgba(12,11,10,.72)', border: '1px solid rgba(255,255,255,.14)',
              opacity: MOTION.in(lt, 2.3, 0.4) }}>
              <div style={{ width: 8, height: 8, borderRadius: 8, background: '#4ad07f',
                opacity: 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(lt * 3.4)) }} />
              <span style={{ fontSize: 14, color: 'rgba(244,241,236,.85)' }}>
                Свободно 6 столиков
              </span>
            </div>
          </div>

          <div style={{ padding: '26px 28px 0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16,
              opacity: MOTION.in(lt, 2.5, 0.4) }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.22em',
                  color: a }}>МЕНЮ НЕДЕЛИ</div>
                <div style={{ marginTop: 8, fontSize: 30, fontWeight: 700,
                  letterSpacing: '-.025em', fontFamily: FH }}>Что в чашке сегодня</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 14, color: 'rgba(244,241,236,.6)' }}>
                Всё меню <Icon n="arrow-right" size={16} color="rgba(244,241,236,.6)" />
              </div>
            </div>
            <div style={{ marginTop: 18, display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {MENU.map(([n, pr, note, ic, bg], i) => {
                const p = clamp(MOTION.pop(lt, 2.7 + i * 0.16, 0.46), 0, 1.12);
                return (
                  <div key={n} style={{ borderRadius: 18, overflow: 'hidden',
                    background: 'rgba(255,255,255,.045)',
                    border: '1px solid rgba(255,255,255,.09)',
                    opacity: clamp(p * 1.8, 0, 1),
                    transform: `translateY(${(1 - clamp(p, 0, 1)) * 26}px)` }}>
                    <div style={{ height: 76, background: `linear-gradient(135deg, ${bg}, #14120f)`,
                      display: 'flex', alignItems: 'center', padding: '0 18px' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 999,
                        background: 'rgba(255,255,255,.12)', display: 'grid',
                        placeItems: 'center' }}>
                        <Icon n={ic} size={20} color="#fff" />
                      </div>
                      <div style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600,
                        letterSpacing: '.16em', color: 'rgba(244,241,236,.5)' }}>250 Г</div>
                    </div>
                    <div style={{ padding: '16px 18px 18px' }}>
                      <div style={{ fontSize: 20, fontWeight: 600 }}>{n}</div>
                      <div style={{ marginTop: 5, fontSize: 13, lineHeight: 1.4,
                        color: 'rgba(244,241,236,.55)' }}>{note}</div>
                      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center' }}>
                        <div style={{ fontSize: 26, fontWeight: 700,
                          letterSpacing: '-.02em', fontFamily: FH }}>{pr}</div>
                        <div style={{ marginLeft: 'auto', width: 34, height: 34,
                          borderRadius: 999, background: a, display: 'grid',
                          placeItems: 'center' }}>
                          <Icon n="plus" size={17} color="#fff" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ padding: '30px 28px 0' }}>
            <div style={{ borderRadius: 22, padding: 24,
              background: 'linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.03))',
              border: '1px solid rgba(255,255,255,.1)', display: 'flex', gap: 26,
              opacity: MOTION.in(lt, 4.6, 0.5) }}>
              <div style={{ flex: '0 0 300px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.22em',
                  color: a }}>БРОНЬ СТОЛИКА</div>
                <div style={{ marginTop: 10, fontSize: 27, fontWeight: 700,
                  letterSpacing: '-.025em', lineHeight: 1.15, fontFamily: FH }}>
                  Занять место<br />за 15 секунд
                </div>
                <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5,
                  color: 'rgba(244,241,236,.55)' }}>
                  Без звонков — подтверждение придёт в смс.
                </div>
              </div>
              <div style={{ flex: '1 1 auto' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['вт 12', 'ср 13', 'чт 14', 'пт 15'].map((d, i) => (
                    <div key={d} style={{ padding: '9px 16px', borderRadius: 999,
                      fontSize: 14, fontWeight: 600,
                      background: i === 0 ? '#f4f1ec' : 'rgba(255,255,255,.07)',
                      color: i === 0 ? '#14120f' : 'rgba(244,241,236,.7)' }}>{d}</div>
                  ))}
                </div>
                <div style={{ marginTop: 14, display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {SLOTS.map((t, i) => {
                    const p = clamp(MOTION.pop(lt, 4.9 + i * 0.07, 0.4), 0, 1.12);
                    const picked = i === 3 && lt > 5.7;
                    return (
                      <div key={t} style={{ padding: '12px 0', textAlign: 'center',
                        borderRadius: 12, fontSize: 16, fontWeight: 600,
                        background: picked ? a : 'rgba(255,255,255,.07)',
                        border: `1px solid ${picked ? a : 'rgba(255,255,255,.1)'}`,
                        color: picked ? '#fff' : 'rgba(244,241,236,.8)',
                        opacity: clamp(p * 1.8, 0, 1),
                        transform: `scale(${0.94 + 0.06 * clamp(p, 0, 1)})` }}>{t}</div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: '26px 28px 30px', display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)', gap: 14,
            opacity: MOTION.in(lt, 5.3, 0.5) }}>
            {[[String(cups), 'чашек в месяц'], ['12', 'сортов в ротации'],
              ['15 сек', 'на бронь']].map(([v, l]) => (
              <div key={l} style={{ borderRadius: 16, padding: '18px 20px',
                background: 'rgba(255,255,255,.045)',
                border: '1px solid rgba(255,255,255,.08)' }}>
                <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.03em',
                  fontFamily: FH }}>{v}</div>
                <div style={{ marginTop: 4, fontSize: 13,
                  color: 'rgba(244,241,236,.55)' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const WEEK = [['Пн', 46], ['Вт', 72], ['Ср', 38], ['Чт', 88], ['Пт', 60],
              ['Сб', 96], ['Вс', 54]];

function Ring({ p, size, stroke, color, track }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ display: 'block',
      transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track}
        strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c}
        strokeDashoffset={c * (1 - p)} />
    </svg>
  );
}

function AppContent({ lt, t0, variant }) {
  const { a } = useCfg();
  const ring = MOTION.draw(lt, t0 + 0.5, 1.1);
  const kcal = Math.round(ring * 1820);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      background: '#0d0f14', color: '#f2f4f8', fontFamily: FU, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: -60, top: -40, width: 320, height: 320,
        background: `radial-gradient(closest-side, ${a}33, transparent 70%)` }} />
      <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, padding: '62px 18px 0',
        display: 'flex', flexDirection: 'column', gap: 14 }}>

        <Block lt={lt} at={t0} radius={16} skel="rgba(255,255,255,.05)">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 999, overflow: 'hidden',
              background: 'linear-gradient(150deg,#4f6b8f,#22303f)', flex: '0 0 auto' }}>
              <image-slot id={'app-hero-' + variant} shape="circle"
                src={IMG(variant === 1 ? 'appHero2' : variant === 2 ? 'appHero3' : 'appHero')}
                fit={FIT(variant === 1 ? 'appHero2' : variant === 2 ? 'appHero3' : 'appHero')}
                placeholder="Фото"></image-slot>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(242,244,248,.5)' }}>Вторник, 12 августа</div>
              <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-.01em' }}>
                {variant === 1 ? 'Статистика' : variant === 2 ? 'Тренировка' : 'Привет, Марина'}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 999, background: 'rgba(255,255,255,.07)' }}>
              <Icon n="flame" size={14} color="#ff9a4d" />
              <span style={{ fontSize: 13, fontWeight: 600 }}>7</span>
            </div>
          </div>
        </Block>

        {variant === 2 ? (
          <React.Fragment>
            <Block lt={lt} at={t0 + 0.4} radius={22} skel="rgba(255,255,255,.05)"
              style={{ flex: '0 0 auto' }}>
              <div style={{ borderRadius: 22, padding: '26px 20px', textAlign: 'center',
                background: `linear-gradient(160deg, ${a}, #7a1a08)` }}>
                <div style={{ fontSize: 13, letterSpacing: '.18em', fontWeight: 600,
                  opacity: .8 }}>ИНТЕРВАЛЬНЫЙ БЕГ</div>
                <div style={{ marginTop: 8, fontSize: 56, fontWeight: 700,
                  letterSpacing: '-.03em', fontFamily: FM, lineHeight: 1 }}>
                  {String(24 + Math.floor(lt * 0) ).padStart(2, '0')}:41
                </div>
                <div style={{ marginTop: 6, fontSize: 14, opacity: .85 }}>4 из 6 интервалов</div>
              </div>
            </Block>
            <Block lt={lt} at={t0 + 0.8} radius={18} skel="rgba(255,255,255,.05)">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[['Пульс', '148', 'heart-pulse', '#ff5f6d'],
                  ['Темп', '5:12', 'gauge', '#5ad1a0']].map(([l, v, ic, col]) => (
                  <div key={l} style={{ borderRadius: 18, padding: 16,
                    background: 'rgba(255,255,255,.06)' }}>
                    <Icon n={ic} size={20} color={col} />
                    <div style={{ marginTop: 10, fontSize: 12,
                      color: 'rgba(242,244,248,.5)' }}>{l}</div>
                    <div style={{ fontSize: 26, fontWeight: 700,
                      letterSpacing: '-.02em' }}>{v}</div>
                  </div>
                ))}
              </div>
            </Block>
            <Block lt={lt} at={t0 + 1.2} radius={18} skel="rgba(255,255,255,.05)"
              style={{ flex: '1 1 auto', minHeight: 0 }}>
              <div style={{ borderRadius: 18, padding: 16, background: 'rgba(255,255,255,.06)',
                height: '100%', boxSizing: 'border-box' }}>
                <div style={{ fontSize: 12, color: 'rgba(242,244,248,.5)' }}>Темп по километрам</div>
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-end',
                  gap: 6, height: 92 }}>
                  {[62, 78, 55, 84, 70].map((h, i) => (
                    <div key={i} style={{ flex: 1, borderRadius: 6,
                      background: i === 3 ? a : 'rgba(255,255,255,.16)',
                      height: h * MOTION.draw(lt, t0 + 1.3 + i * 0.06, 0.34) }} />
                  ))}
                </div>
              </div>
            </Block>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <Block lt={lt} at={t0 + 0.4} radius={24} skel="rgba(255,255,255,.05)"
              style={{ flex: '0 0 auto' }}>
              <div style={{ borderRadius: 24, padding: '20px 18px', display: 'flex',
                alignItems: 'center', gap: 18,
                background: 'linear-gradient(150deg, rgba(255,255,255,.09), rgba(255,255,255,.03))',
                border: '1px solid rgba(255,255,255,.08)' }}>
                <div style={{ position: 'relative', width: 108, height: 108,
                  flex: '0 0 auto' }}>
                  <Ring p={ring * 0.78} size={108} stroke={11} color={a}
                    track="rgba(255,255,255,.09)" />
                  <div style={{ position: 'absolute', inset: 0, display: 'grid',
                    placeItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 25, fontWeight: 700, letterSpacing: '-.02em',
                        lineHeight: 1 }}>{variant === 1 ? '2 140' : kcal}</div>
                      <div style={{ fontSize: 11, color: 'rgba(242,244,248,.5)',
                        marginTop: 2 }}>ккал</div>
                    </div>
                  </div>
                </div>
                <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column',
                  gap: 10 }}>
                  {[['Шаги', '8 420', .84, '#5ad1a0'],
                    ['Вода', '1,6 л', .62, '#5aa9f0'],
                    ['Сон', '7 ч 20', .91, '#a99cf0']].map(([l, v, pv, col], i) => (
                    <div key={l}>
                      <div style={{ display: 'flex', fontSize: 12, marginBottom: 5 }}>
                        <span style={{ color: 'rgba(242,244,248,.55)' }}>{l}</span>
                        <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{v}</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 5,
                        background: 'rgba(255,255,255,.09)', overflow: 'hidden' }}>
                        <div style={{ height: 5, borderRadius: 5, background: col,
                          transform: `scaleX(${pv * MOTION.draw(lt, t0 + 0.7 + i * 0.12, 0.5)})`,
                          transformOrigin: 'left' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Block>

            <Block lt={lt} at={t0 + 0.95} radius={20} skel="rgba(255,255,255,.05)"
              style={{ flex: '0 0 auto' }}>
              <div style={{ borderRadius: 20, padding: 18, background: 'rgba(255,255,255,.05)',
                border: '1px solid rgba(255,255,255,.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'rgba(242,244,248,.55)' }}>Активность</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600,
                    color: '#5ad1a0', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon n="trending-up" size={14} color="#5ad1a0" />+12%
                  </span>
                </div>
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-end',
                  gap: 7, height: 104 }}>
                  {WEEK.map(([d, h], i) => {
                    const gp = MOTION.draw(lt, t0 + 1.0 + i * 0.06, 0.36);
                    const hot = i === 5;
                    return (
                      <div key={d} style={{ flex: 1, display: 'flex',
                        flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: '100%', height: h * 0.86 * gp, borderRadius: 7,
                          background: hot ? `linear-gradient(180deg, ${a}, ${a}66)`
                            : 'rgba(255,255,255,.13)' }} />
                        <span style={{ fontSize: 10,
                          color: hot ? '#f2f4f8' : 'rgba(242,244,248,.4)' }}>{d}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Block>

            <Block lt={lt} at={t0 + 1.55} radius={20} skel="rgba(255,255,255,.05)"
              style={{ flex: '1 1 auto', minHeight: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[['Бег · 5 км', '32 мин · 410 ккал', 'footprints', a],
                  ['Силовая', '40 мин · 320 ккал', 'dumbbell', '#5aa9f0']]
                  .map(([n, meta, ic, col], i) => (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 13,
                    padding: '13px 15px', borderRadius: 16,
                    background: 'rgba(255,255,255,.05)',
                    opacity: MOTION.in(lt, t0 + 1.6 + i * 0.14, 0.34) }}>
                    <div style={{ width: 38, height: 38, borderRadius: 999,
                      background: `${col}22`, display: 'grid', placeItems: 'center' }}>
                      <Icon n={ic} size={18} color={col} />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{n}</div>
                      <div style={{ fontSize: 12,
                        color: 'rgba(242,244,248,.5)' }}>{meta}</div>
                    </div>
                    <Icon n="chevron-right" size={17} color="rgba(242,244,248,.35)"
                      style={{ marginLeft: 'auto' }} />
                  </div>
                ))}
              </div>
            </Block>
          </React.Fragment>
        )}
      </div>

      <div style={{ height: 76, flex: '0 0 auto', display: 'flex', alignItems: 'center',
        justifyContent: 'space-around', paddingBottom: 14,
        background: 'rgba(13,15,20,.92)', borderTop: '1px solid rgba(255,255,255,.07)' }}>
        {['house', 'activity', 'calendar', 'user'].map((ic, i) => {
          const on = i === (variant === 1 ? 1 : variant === 2 ? 2 : 0);
          return (
            <div key={ic} style={{ position: 'relative', display: 'grid',
              placeItems: 'center', width: 46, height: 40 }}>
              {on && <div style={{ position: 'absolute', inset: 0, borderRadius: 12,
                background: `${a}22` }} />}
              <Icon n={ic} size={22} color={on ? a : 'rgba(242,244,248,.35)'}
                style={{ position: 'relative' }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const NODES = [['/start', 'вход', 'play'], ['Услуга', 'выбор', 'list'],
               ['Слот', 'запись', 'calendar-check'],
               ['Оплата', 'чек', 'credit-card'],
               ['Напомнить', 'за 2 ч', 'bell']];

function BotFlow({ lt, t0 }) {
  const { a } = useCfg();
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 22px' }}>
      {NODES.map((n, i) => {
        const p = clamp(MOTION.pop(lt, t0 + i * 0.26, 0.42), 0, 1.15);
        const line = MOTION.draw(lt, t0 + i * 0.26 + 0.16, 0.2);
        const on = p > 0.04;
        const dot = ((lt * 0.55) % 1);
        return (
          <React.Fragment key={n[0]}>
            {i > 0 && (
              <div style={{ flex: 1, height: 2, background: '#e6e7ec', position: 'relative',
                margin: '0 8px' }}>
                <div style={{ position: 'absolute', inset: 0, background: `${a}55`,
                  transform: `scaleX(${line})`, transformOrigin: 'left' }} />
                {line >= 1 && (
                  <div style={{ position: 'absolute', top: -2, left: `${dot * 100}%`,
                    width: 6, height: 6, borderRadius: 6, background: a,
                    opacity: 0.9 }} />
                )}
              </div>
            )}
            <div style={{ flex: '0 0 auto', minWidth: 128, borderRadius: 14,
              background: on ? '#fff' : '#f0f1f4',
              boxShadow: on ? '0 6px 18px rgba(16,24,40,.1)' : 'none',
              transform: `scale(${0.95 + 0.05 * clamp(p, 0, 1)})`, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ opacity: clamp(p * 1.8, 0, 1), display: 'flex',
                alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${a}18`,
                  display: 'grid', placeItems: 'center' }}>
                  <Icon n={n[2]} size={17} color={a} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.16em',
                    color: '#8b909a', textTransform: 'uppercase' }}>{n[1]}</div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: '#141519' }}>{n[0]}</div>
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function BotChat({ lt, t0 }) {
  const { a } = useCfg();
  const kb = ['10:00', '11:30', '13:00', '15:30'];
  const show = MOTION.in(lt, t0 - 0.3, 0.32);
  const p1 = MOTION.in(lt, t0 + 0.35, 0.32);
  const pPay = MOTION.in(lt, t0 + 1.95, 0.35);
  const p2 = MOTION.in(lt, t0 + 2.5, 0.35);
  if (show <= 0) return null;
  const booked = Math.round(MOTION.draw(lt, t0 + 0.6, 1.2) * 47);
  return (
    <div style={{ position: 'absolute', left: 24, right: 24, top: 178, bottom: 22,
      display: 'flex', gap: 16, opacity: show,
      transform: `translateY(${(1 - show) * 20}px)` }}>

      <div style={{ flex: '1 1 auto', borderRadius: 18, background: WALL_CHAT,
        backgroundSize: '22px 22px, cover', padding: 18, boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', gap: 11, color: P.mText,
        overflow: 'hidden', border: '1px solid #e6e7ec' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <Avatar letter="B" size={34} from="#a99cf0" to="#6a54d6" />
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>@barber_zapis_bot</div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,.45)' }}>бот · отвечает сразу</div>
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: '18px 18px 18px 6px',
          padding: '12px 16px', fontSize: 17, alignSelf: 'flex-start', maxWidth: 420,
          opacity: p1, boxShadow: '0 1px 2px rgba(16,24,40,.1)', lineHeight: 1.4,
          transform: `translateY(${(1 - p1) * 14}px)` }}>
          Привет! Мастер <b>Денис</b>, вторник. Выберите время:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
          maxWidth: 420 }}>
          {kb.map((k, i) => {
            const p = clamp(MOTION.pop(lt, t0 + 0.7 + i * 0.1, 0.36), 0, 1.15);
            const picked = i === 2 && lt > t0 + 1.7;
            return (
              <div key={k} style={{ opacity: clamp(p * 1.8, 0, 1),
                transform: `scale(${0.93 + 0.07 * clamp(p, 0, 1)})`, borderRadius: 10,
                background: picked ? a : '#fff', color: picked ? '#fff' : P.mBlue,
                padding: '11px 0', textAlign: 'center', fontSize: 16, fontWeight: 600,
                boxShadow: '0 1px 2px rgba(16,24,40,.1)' }}>{k}</div>
            );
          })}
        </div>
        <div style={{ alignSelf: 'flex-end', background: P.mOut,
          borderRadius: '18px 18px 6px 18px', padding: '10px 14px', fontSize: 16,
          opacity: MOTION.in(lt, t0 + 1.7, 0.3) }}>13:00</div>
        <div style={{ background: '#fff', borderRadius: 14, padding: 14, maxWidth: 420,
          alignSelf: 'flex-start', opacity: pPay, boxShadow: '0 1px 2px rgba(16,24,40,.1)',
          transform: `translateY(${(1 - pPay) * 12}px)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon n="credit-card" size={18} color={P.mBlue} />
            <span style={{ fontSize: 15, fontWeight: 600 }}>Предоплата 500 ₽</span>
            <span style={{ marginLeft: 'auto', fontSize: 13,
              color: '#2f9e63', fontWeight: 600 }}>оплачено</span>
          </div>
          <div style={{ marginTop: 10, height: 6, borderRadius: 6, background: '#eceef2',
            overflow: 'hidden' }}>
            <div style={{ height: 6, background: '#2f9e63',
              transform: `scaleX(${MOTION.draw(lt, t0 + 2.05, 0.4)})`,
              transformOrigin: 'left' }} />
          </div>
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', gap: 11, alignItems: 'center',
          background: '#fff', borderRadius: '18px 18px 18px 6px', padding: '12px 16px',
          alignSelf: 'flex-start', opacity: p2, boxShadow: '0 1px 2px rgba(16,24,40,.1)',
          transform: `translateY(${(1 - p2) * 14}px)` }}>
          <Icon n="check-circle" size={21} color="#2f9e63" />
          <div style={{ fontSize: 17 }}>Записал на 13:00. Напомню за 2 часа.</div>
        </div>
      </div>

      <div style={{ flex: '0 0 268px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ borderRadius: 18, padding: 18, background: '#141519', color: '#fff',
          opacity: MOTION.in(lt, t0 + 0.5, 0.4) }}>
          <div style={{ fontSize: 12, letterSpacing: '.18em', fontWeight: 600,
            color: 'rgba(255,255,255,.5)' }}>ЗАПИСЕЙ ЗА СУТКИ</div>
          <div style={{ marginTop: 6, fontSize: 44, fontWeight: 700, letterSpacing: '-.03em',
            fontFamily: FH, lineHeight: 1 }}>{booked}</div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'flex-end', gap: 5,
            height: 46 }}>
            {[38, 52, 30, 60, 44, 70, 58].map((h, i) => (
              <div key={i} style={{ flex: 1, borderRadius: 4,
                background: i === 5 ? a : 'rgba(255,255,255,.18)',
                height: h * 0.62 * MOTION.draw(lt, t0 + 0.7 + i * 0.05, 0.3) }} />
            ))}
          </div>
        </div>
        {[['Без звонков', '98% записей', 'phone-off'],
          ['Средний чек', '1 850 ₽', 'wallet'],
          ['Недоходы', '−3× меньше', 'bell-ring']].map(([l, v, ic], i) => (
          <div key={l} style={{ borderRadius: 16, padding: '14px 16px', background: '#f6f6f8',
            display: 'flex', alignItems: 'center', gap: 12, color: P.mText,
            opacity: MOTION.in(lt, t0 + 0.8 + i * 0.16, 0.36),
            transform: `translateX(${(1 - MOTION.in(lt, t0 + 0.8 + i * 0.16, 0.36)) * 24}px)` }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `${a}18`,
              display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
              <Icon n={ic} size={16} color={a} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#8b909a' }}>{l}</div>
              <div style={{ fontSize: 17, fontWeight: 600 }}>{v}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const M_PING = [
  { text: 'Здравствуйте! Вы делаете сайты?', at: -1, at2: '13:58' },
  { mine: true, text: 'Здравствуйте! Да, под ключ — дизайн, код, запуск.', at: -1, at2: '13:59' },
  { text: 'Нужен сайт для кофейни — меню, бронь столика, адаптив.', at: 1.9, at2: '14:02' },
];

function Ping({ localTime }) {
  const lt = localTime;
  const { a } = useCfg();
  return (
    <Desktop>
      <Cam lt={lt} keys={[[0, 0, 40, 1.06], [1.5, 0, 0, 1], [4, -24, -8, 1.04]]}>
        <Window lt={lt} at={1.15} title="Мессенджер — Артём" icon="send"
          bodyBg="#fff" style={{ left: 150, top: WT, width: 1180, height: WH }}>
          <ChatBody lt={lt} messages={M_PING} active={0} sub="в сети"
            typing={lt > 1.5 && lt < 1.9} />
        </Window>
        <PhoneChat lt={lt} messages={M_PING.slice(0, 2)} notify={[0.3, 1.2]} time="14:02"
          style={{ left: 1420, top: 150 }} />
      </Cam>
      <Toast lt={lt} at={0.15} out={1.0} icon="message-circle" from="Мессенджер"
        text="Артём: Вы делаете сайты?" />
      <Cursor lt={lt} path={[[0, 1240, 640], [0.72, appX('chat'), H - 32],
        [1.05, appX('chat'), H - 34], [1.7, 900, 700], [3.5, 820, 660]]} clicks={[1.05]} />
    </Desktop>
  );
}

const CHIPS1 = [['layout-template', 'Лендинг'], ['utensils', 'Меню'],
                ['calendar-check', 'Бронь'], ['smartphone', 'Адаптив']];

const M_ORDER1 = M_PING.map(m => Object.assign({}, m, { at: -1 }));

function Order1({ localTime }) {
  const lt = localTime;
  const { a } = useCfg();
  return (
    <Desktop>
      <Cam lt={lt} keys={[[0, -24, -8, 1.04], [1.1, 250, 26, 1.2], [3, 268, 22, 1.23]]}>
        <Window lt={lt} title="Мессенджер — Артём" icon="send" bodyBg="#fff"
          style={{ left: 150, top: WT, width: 1180, height: WH }}>
          <ChatBody lt={lt} messages={M_ORDER1} active={0} sub="в сети" />
        </Window>
        <Cursor lt={lt} path={[[0, 820, 660], [0.45, 700, 792], [0.75, 700, 796],
          [3, 900, 700]]} clicks={[0.55]} />
      </Cam>
      <div style={{ position: 'absolute', right: 70, top: 150, display: 'flex',
        flexDirection: 'column', gap: 13, alignItems: 'flex-end', zIndex: 33 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.24em',
          color: 'rgba(255,255,255,.55)', marginBottom: 8 }}>ТЕХЗАДАНИЕ</div>
        {CHIPS1.map(([ic, c], i) => {
          const p = MOTION.pop(lt, 0.3 + i * 0.14, 0.42);
          if (p <= 0) return null;
          return (
            <div key={c} style={{ transform: `translateX(${(1 - clamp(p, 0, 1)) * 70}px)`,
              opacity: clamp(p * 2, 0, 1), display: 'flex', alignItems: 'center', gap: 14,
              background: 'rgba(14,15,20,.72)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,.14)', borderRadius: 999,
              padding: '13px 24px 13px 18px' }}>
              <Icon n={ic} size={22} color={a} />
              <span style={{ fontSize: 26, fontWeight: 600 }}>{c}</span>
            </div>
          );
        })}
      </div>
      <Badge lt={lt} at={1.7} title="Принято в работу" sub="ЗАКАЗ 1 ИЗ 3" icon="check"
        style={{ right: 70, top: 560 }} />
    </Desktop>
  );
}

const CODE1A = [
  '// coffee-lab.ru',
  'export default function Hero() {',
  '  const slots = useBooking(12)',
  '  return (',
  '    <Section>',
  '      <Title>Свежее зерно</Title>',
  '      <Booking slots={slots} />',
  '    </Section>',
  '  )',
  '}',
];
const CODE1B = [
  '// booking.js — бронь столика',
  'export async function book(slot) {',
  '  const res = await api.post("/book", {',
  '    slot, guests: 2,',
  '  })',
  '  notify("Столик забронирован")',
  '  return res.id',
  '}',
];

function Build1({ localTime }) {
  const lt = localTime;
  const tab = lt > 3.3 ? 1 : 0;
  return (
    <Desktop>
      <Cam lt={lt} keys={[[0, 0, 0, 1], [4.3, -10, 0, 1.03], [4.7, -330, 30, 1.2],
        [8, -344, 34, 1.23]]}>
        <Window lt={lt} at={0.05} title="VS Code" icon="code" accentTab
          tabs={['hero.jsx', 'booking.js']} activeTab={tab}
          bodyBg={P.eBg} style={{ left: 80, top: WT, width: 700, height: WH }}>
          {tab === 0
            ? <CodeBody lt={lt} from={0.2} dur={3.0} lines={CODE1A} />
            : <CodeBody lt={lt} from={3.35} dur={2.1} lines={CODE1B} />}
        </Window>
        <Window lt={lt} at={0.3} title="Chrome" icon="chrome" bodyBg="#fff"
          style={{ left: 820, top: WT, width: 1020, height: WH }}>
          <SiteContent lt={lt} />
        </Window>
        <Cursor lt={lt} path={[[0, 540, 430], [3.0, 380, 130], [3.4, 380, 127],
          [4.9, 1000, 560], [5.7, 1299, 784], [8, 1340, 812]]} clicks={[3.4, 5.75]} />
      </Cam>
      <Toast lt={lt} at={5.9} out={7.4} icon="check" tint="#2f9e63" from="Сборка"
        text="npm run build — успешно, 1.2s" />
      <Deadline lt={lt} at={6.4} text="3 дня" />
    </Desktop>
  );
}

const M_D1 = [
  { text: 'Нужен сайт для кофейни — меню, бронь столика, адаптив.', at: -1, at2: '14:02' },
  { mine: true, kind: 'file', text: 'coffee-lab.ru', meta: 'Готово. Домен и хостинг настроил',
    icon: 'globe', slot: 'deliver-site', imgKey: 'deliverSite', slotLabel: 'Скрин сайта', at: 0.35, at2: '18:18' },
  { text: 'Это огонь. Беру!', at: 1.5, at2: '18:20' },
];

function Deliver1({ localTime }) {
  const lt = localTime;
  const { deadlines } = useCfg();
  return (
    <Desktop>
      <Cam lt={lt} keys={[[0, 0, 0, 1.02], [0.9, 0, 0, 1], [4, -18, -8, 1.06]]}>
        <Window lt={lt} title="Мессенджер — Артём" icon="send" bodyBg="#fff"
          style={{ left: 150, top: WT, width: 1180, height: WH }}>
          <ChatBody lt={lt} messages={M_D1} active={0} sub="был(а) недавно" />
        </Window>
        <Cursor lt={lt} path={[[0, 1150, 700], [0.24, 1289, 898], [0.5, 1289, 896],
          [4, 1050, 720]]} clicks={[0.3]} />
      </Cam>
      <AltTab lt={lt} at={0.05} active={2}
        items={[['VS Code', 'code'], ['Chrome', 'chrome'], ['Мессенджер', 'send']]} />
      <Toast lt={lt} at={1.7} out={3.4} icon="message-circle" from="Артём"
        text="Это огонь. Беру!" />
      <Badge lt={lt} at={2.2} title={deadlines ? 'Сдано за 3 дня' : 'Сдано'}
        sub="ЗАКАЗ 1 ИЗ 3" icon="check" style={{ right: 70, top: 150 }} />
    </Desktop>
  );
}

const M_O2 = [
  { text: 'Здравствуйте! Артём посоветовал вас — он в восторге от сайта.',
    at: -1, at2: '18:22' },
  { text: 'Нужно мобильное приложение: трекер тренировок, iOS и Android.',
    at: 0.8, at2: '18:24' },
];

function Order2({ localTime }) {
  const lt = localTime;
  return (
    <Desktop>
      <Cam lt={lt} keys={[[0, -18, -8, 1.06], [1.2, 60, -70, 1.18], [3, 68, -76, 1.2]]}>
        <Window lt={lt} title="Мессенджер — Марина" icon="send" bodyBg="#fff"
          style={{ left: 150, top: WT, width: 1180, height: WH }}>
          <ChatBody lt={lt} messages={M_O2} active={1} sub="печатает…"
            typing={lt < 0.8} />
        </Window>
        <Cursor lt={lt} path={[[0, 900, 640], [0.3, 300, 317], [0.6, 300, 320],
          [3, 760, 640]]} clicks={[0.35]} />
      </Cam>
      <Badge lt={lt} at={1.8} title="Принято в работу" sub="ЗАКАЗ 2 ИЗ 3" icon="check"
        style={{ right: 70, top: 200 }} />
    </Desktop>
  );
}

const CODE2 = [
  '// FitTrack — iOS + Android',
  'class WorkoutScreen extends Screen {',
  '  const stats = await api.get("/summary")',
  '  return Column(',
  '    Header(photo: user.cover),',
  '    BigStat(value: stats.kcal),',
  '    Chart(days: 7),',
  '    TabBar(active: 1),',
  '  )',
  '}',
];
const TERM2 = [
  ' flutter build ios --release',
  '+ Xcode build done  42.1s',
  ' flutter build appbundle',
  '+ app-release.aab  готово',
];

function Build2({ localTime }) {
  const lt = localTime;
  const s2 = MOTION.in(lt, 5.1, 0.5);
  return (
    <Desktop>
      <Cam lt={lt} keys={[[0, 0, 0, 1], [4.7, -10, 0, 1.03], [5.1, -280, 10, 1.0],
        [8, -292, 12, 1.02]]}>
        <Window lt={lt} at={0.05} title="VS Code" icon="code" accentTab
          tabs={['workout_screen.dart']} bodyBg={P.eBg}
          style={{ left: 80, top: WT, width: 680, height: 500 }}>
          <CodeBody lt={lt} from={0.2} dur={4.2} lines={CODE2} />
        </Window>
        <Window lt={lt} at={2.9} title="Терминал — flutter" icon="terminal" bodyBg="#12131a"
          style={{ left: 80, top: WT + 528, width: 680, height: 302 }}>
          <TermBody lt={lt} at={3.1} lines={TERM2} />
        </Window>
        <div style={{ position: 'absolute', left: 830, top: WT + 46,
          transform: `scale(${0.96 + 0.04 * MOTION.in(lt, 0.25, 0.5)})`,
          opacity: MOTION.in(lt, 0.25, 0.5) }}>
          <IOSDevice width={370} height={740} time="21:07">
            <AppContent lt={lt} t0={0.6} variant={0} />
          </IOSDevice>
        </div>
        <div style={{ position: 'absolute', left: 1270, top: WT + 46,
          transform: `translateX(${(1 - s2) * 300}px)`, opacity: s2 }}>
          <IOSDevice width={370} height={740} time="21:07">
            <AppContent lt={lt} t0={-3} variant={1} />
          </IOSDevice>
        </div>
        <div style={{ position: 'absolute', left: 1710, top: WT + 46,
          transform: `translateX(${(1 - MOTION.in(lt, 5.35, 0.5)) * 300}px)`,
          opacity: MOTION.in(lt, 5.35, 0.5) }}>
          <IOSDevice width={370} height={740} time="21:07">
            <AppContent lt={lt} t0={-3} variant={2} />
          </IOSDevice>
        </div>
      </Cam>
      <Toast lt={lt} at={6.0} out={7.5} icon="check" tint="#2f9e63" from="Сборка"
        text="iOS и Android собраны" />
      <Deadline lt={lt} at={6.4} text="5 дней" />
      <Cursor lt={lt} path={[[0, 520, 400], [2.55, appX('term'), H - 32],
        [2.85, appX('term'), H - 34], [5.2, 760, 560], [8, 700, 600]]} clicks={[2.85]} />
    </Desktop>
  );
}

const M_D2 = [
  { text: 'Нужно мобильное приложение: трекер тренировок, iOS и Android.',
    at: -1, at2: '18:24' },
  { mine: true, kind: 'file', text: 'FitTrack 1.0', meta: 'Собрал под iOS и Android, в сторах',
    icon: 'smartphone', slot: 'deliver-app', imgKey: 'deliverApp', slotLabel: 'Скрин приложения',
    at: 0.4, at2: '21:50' },
  { text: 'Космос. Спасибо!', at: 1.6, at2: '21:52' },
];

function Deliver2({ localTime }) {
  const lt = localTime;
  const { deadlines } = useCfg();
  return (
    <Desktop>
      <Cam lt={lt} keys={[[0, 0, 0, 1.02], [0.9, 0, 0, 1], [4, -18, -8, 1.06]]}>
        <Window lt={lt} title="Мессенджер — Марина" icon="send" bodyBg="#fff"
          style={{ left: 150, top: WT, width: 1180, height: WH }}>
          <ChatBody lt={lt} messages={M_D2} active={1} sub="был(а) недавно" />
        </Window>
        <Cursor lt={lt} path={[[0, 1150, 700], [0.26, 1289, 898], [0.55, 1289, 896],
          [4, 1040, 730]]} clicks={[0.32]} />
      </Cam>
      <AltTab lt={lt} at={0.05} active={2}
        items={[['VS Code', 'code'], ['Терминал', 'terminal'], ['Мессенджер', 'send']]} />
      <Toast lt={lt} at={1.8} out={3.4} icon="message-circle" from="Марина"
        text="Космос. Спасибо!" />
      <Badge lt={lt} at={2.3} title={deadlines ? 'Сдано за 5 дней' : 'Сдано'}
        sub="ЗАКАЗ 2 ИЗ 3" icon="check" style={{ right: 70, top: 150 }} />
    </Desktop>
  );
}

const M_O3 = [
  { text: 'Привет! Марина сказала, ты делаешь ботов.', at: -1, at2: '22:01' },
  { text: 'Барбершоп: запись, напоминания, оплата.', at: 0.9, at2: '22:03' },
];

function Order3({ localTime }) {
  const lt = localTime;
  const { a } = useCfg();
  const t1 = MOTION.in(lt, 0.45, 0.5);
  return (
    <Desktop>
      <Cam lt={lt} keys={[[0, 0, 0, 1.04], [1.3, -108, 0, 1.12], [3, -118, 0, 1.14]]}>
        <Window lt={lt} title="Мессенджер — Денис" icon="send" bodyBg="#fff"
          style={{ left: 170, top: WT, width: 1060, height: WH }}>
          <ChatBody lt={lt} messages={M_O3} active={2} sub="печатает…" typing={lt < 0.9} />
        </Window>
        <Cursor lt={lt} path={[[0, 880, 620], [0.32, 320, 387], [0.62, 320, 390],
          [3, 700, 620]]} clicks={[0.38]} />
      </Cam>
      <div style={{ position: 'absolute', right: 80, top: 200, zIndex: 33,
        textAlign: 'right' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          gap: 14, marginBottom: 20, opacity: MOTION.in(lt, 0.25, 0.3) }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.24em', color: a }}>
            ТРЕТИЙ ЗАКАЗ ПОДРЯД
          </div>
          <Icon n="bot" size={22} color={a} />
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontSize: 92, fontWeight: 700, lineHeight: .96,
            letterSpacing: '-.045em', fontFamily: FH,
            textShadow: '0 24px 60px rgba(0,0,0,.75)',
            transform: `translateY(${(1 - t1) * 130}px)` }}>Бот для<br />записи</div>
        </div>
      </div>
      <Badge lt={lt} at={2.0} title="Принято в работу" sub="ЗАКАЗ 3 ИЗ 3" icon="check"
        style={{ right: 80, top: 560 }} />
    </Desktop>
  );
}

const CODE3 = [
  '# @barber_zapis_bot',
  'from aiogram import Bot, Dispatcher',
  '',
  '@dp.message(Command("start"))',
  'async def start(msg):',
  '    await msg.answer(',
  '        "Привет! Записать вас?",',
  '        reply_markup=slots_kb()',
  '    )',
];
const TERM3 = [
  ' python bot.py',
  '+ webhook установлен',
  '+ платежи подключены',
];

function Build3({ localTime }) {
  const lt = localTime;
  return (
    <Desktop>
      <Cam lt={lt} keys={[[0, 0, 0, 1], [4.1, -10, 0, 1.03], [4.5, -340, 26, 1.2],
        [7.5, -352, 30, 1.23]]}>
        <Window lt={lt} at={0.05} title="VS Code" icon="code" accentTab tabs={['bot.py']}
          bodyBg={P.eBg} style={{ left: 80, top: WT, width: 680, height: 520 }}>
          <CodeBody lt={lt} from={0.2} dur={3.6} lines={CODE3} />
        </Window>
        <Window lt={lt} at={3.4} title="Терминал — python" icon="terminal" bodyBg="#12131a"
          style={{ left: 80, top: WT + 548, width: 680, height: 282 }}>
          <TermBody lt={lt} at={3.6} lines={TERM3} />
        </Window>
        <Window lt={lt} at={0.4} title="Логика бота" icon="workflow" bodyBg="#fff"
          style={{ left: 820, top: WT, width: 1020, height: WH }}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <div style={{ height: 56, borderBottom: '1px solid #eaebef', display: 'flex',
              alignItems: 'center', padding: '0 24px', gap: 12, color: '#141519' }}>
              <Icon n="git-branch" size={19} color="#8b909a" />
              <div style={{ fontSize: 16, fontWeight: 600 }}>Сценарий записи</div>
              <div style={{ marginLeft: 'auto', fontSize: 14, color: '#8b909a',
                fontFamily: FM }}>aiogram 3</div>
            </div>
            <div style={{ paddingTop: 30 }}><BotFlow lt={lt} t0={0.7} /></div>
            <BotChat lt={lt} t0={2.4} />
          </div>
        </Window>
      </Cam>
      <Toast lt={lt} at={5.6} out={7.0} icon="check" tint="#2f9e63" from="Деплой"
        text="Бот запущен на сервере" />
      <Deadline lt={lt} at={5.9} text="2 дня" />
      <Cursor lt={lt} path={[[0, 460, 360], [3.05, appX('term'), H - 32],
        [3.35, appX('term'), H - 34], [4.9, 1180, 620], [7.5, 1120, 660]]} clicks={[3.35]} />
    </Desktop>
  );
}

const M_D3 = [
  { text: 'Барбершоп: запись, напоминания, оплата.', at: -1, at2: '22:03' },
  { mine: true, kind: 'file', text: '@barber_zapis_bot', meta: 'Запись, напоминания, оплата',
    icon: 'bot', slot: 'deliver-bot', imgKey: 'deliverBot', slotLabel: 'Скрин бота', at: 0.4, at2: '23:46' },
  { text: 'Работает идеально!', at: 1.5, at2: '23:47' },
  { text: 'Уже рекомендую тебя всем знакомым.', at: 2.6, at2: '23:48' },
];

function Deliver3({ localTime }) {
  const lt = localTime;
  const { deadlines } = useCfg();
  return (
    <Desktop>
      <Cam lt={lt} keys={[[0, 0, 0, 1.02], [0.9, 0, 0, 1], [4, -20, -10, 1.07]]}>
        <Window lt={lt} title="Мессенджер — Денис" icon="send" bodyBg="#fff"
          style={{ left: 150, top: WT, width: 1180, height: WH }}>
          <ChatBody lt={lt} messages={M_D3} active={2} sub="был(а) недавно" />
        </Window>
        <Cursor lt={lt} path={[[0, 1150, 700], [0.26, 1289, 898], [0.55, 1289, 896],
          [4, 1020, 740]]} clicks={[0.32]} />
      </Cam>
      <AltTab lt={lt} at={0.05} active={2}
        items={[['VS Code', 'code'], ['Логика бота', 'workflow'], ['Мессенджер', 'send']]} />
      <Toast lt={lt} at={1.7} out={3.2} icon="message-circle" from="Денис"
        text="Работает идеально!" />
      <Badge lt={lt} at={3.0} title={deadlines ? 'Сдано за 2 дня' : 'Сдано'}
        sub="ЗАКАЗ 3 ИЗ 3" icon="check" style={{ right: 70, top: 150 }} />
    </Desktop>
  );
}

const WORK = [['Сайты и лендинги', 'Дизайн, вёрстка, запуск', '3 дней', 'globe'],
              ['Мобильные приложения', 'iOS и Android', '5 дней', 'smartphone'],
              ['Telegram-боты', 'Заказы, запись, оплата', '2 дней', 'bot']];

const TRUST = [
  ['Фиксирую срок и цену', 'До старта работы — дальше не меняются', 'shield-check'],
  ['Показываю каждый день', 'Рабочая сборка, а не обещания', 'eye'],
  ['Отдаю всё: код и доступы', 'Проект остаётся вашим полностью', 'key-round'],
  ['2 недели поддержки', 'Правки после сдачи — бесплатно', 'life-buoy'],
];

function Outro({ localTime }) {
  const lt = localTime;
  const { handle } = useCfg();
  const k = MOTION.in(lt, 0.05, 0.35);
  const nm = MOTION.in(lt, 0.15, 0.6);
  const cta = MOTION.in(lt, 3.4, 0.45);
  const n1 = Math.round(MOTION.draw(lt, 1.0, 0.9) * 3);
  const n2 = Math.round(MOTION.draw(lt, 1.15, 0.9) * 10);
  const pulse = 1 + 0.02 * Math.sin(lt * 3.2);
  return (
    <Desktop>
      <div style={{ position: 'absolute', left: -260, top: -220, width: 900, height: 900,
        borderRadius: 999, border: '2px solid rgba(255,255,255,.14)',
        transform: `scale(${0.9 + 0.12 * MOTION.draw(lt, 0.1, 2.4)})` }} />
      <div style={{ position: 'absolute', right: -300, bottom: -320, width: 1000, height: 1000,
        borderRadius: 999, background: 'rgba(255,255,255,.05)',
        transform: `scale(${0.85 + 0.15 * MOTION.draw(lt, 0.3, 2.8)})` }} />

      <div style={{ position: 'absolute', inset: 0, padding: '92px 104px 86px',
        boxSizing: 'border-box', display: 'flex', color: '#fff', fontFamily: FU, gap: 56 }}>

        <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column',
          minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: k }}>
            <div style={{ width: 10, height: 10, borderRadius: 10, background: '#fff' }} />
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '.26em' }}>
              РАЗРАБОТКА ПОД КЛЮЧ · ОДИН ИСПОЛНИТЕЛЬ
            </div>
          </div>

          <div style={{ marginTop: 20, overflow: 'hidden' }}>
            <div style={{ fontSize: 132, fontWeight: 700, letterSpacing: '-.05em',
              lineHeight: 1, whiteSpace: 'nowrap', fontFamily: FH,
              transform: `translateY(${(1 - nm) * 160}px)` }}>{handle}</div>
          </div>

          <div style={{ marginTop: 22, fontSize: 30, fontWeight: 500, lineHeight: 1.32,
            maxWidth: 640, opacity: MOTION.in(lt, 0.65, 0.45),
            transform: `translateY(${(1 - MOTION.in(lt, 0.65, 0.45)) * 20}px)` }}>
            Сайты, приложения и Telegram-боты.<br />
            От первого сообщения до запуска — один человек.
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 22,
            flexWrap: 'wrap' }}>
            <a href="https://t.me/MinatsukiYue" target="_blank" rel="noopener"
              style={{ textDecoration: 'none', opacity: cta,
                transform: `scale(${(0.92 + 0.08 * clamp(MOTION.pop(lt, 3.4, 0.55), 0, 1)) * pulse})`,
                transformOrigin: 'left center',
                pointerEvents: cta > 0.6 ? 'auto' : 'none' }}>
              <div style={{ background: '#fff', color: '#141519', padding: '24px 38px',
                borderRadius: 999, display: 'flex', alignItems: 'center', gap: 18,
                fontSize: 30, fontWeight: 600,
                boxShadow: '0 26px 55px -14px rgba(0,0,0,.6)' }}>
                <Icon n="send-horizontal" size={28} color="#141519" />
                <span>Написать в Telegram</span>
              </div>
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, fontSize: 20,
              padding: '18px 26px', borderRadius: 999,
              border: '1px solid rgba(255,255,255,.4)',
              opacity: MOTION.in(lt, 3.8, 0.4) }}>
              <div style={{ width: 9, height: 9, borderRadius: 9, background: '#8bf0b4',
                opacity: 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(lt * 3.6)) }} />
              Отвечаю в течение часа
            </div>
          </div>
        </div>

        <div style={{ flex: '0 0 620px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14,
            opacity: MOTION.in(lt, 0.85, 0.45),
            transform: `translateY(${(1 - MOTION.in(lt, 0.85, 0.45)) * 26}px)` }}>
            {[[String(n1), 'проекта сдано'], [String(n2), 'дней на всё'],
              ['100%', 'в срок']].map(([v, l]) => (
              <div key={l} style={{ borderRadius: 20, padding: '20px 22px',
                background: 'rgba(255,255,255,.14)',
                border: '1px solid rgba(255,255,255,.22)' }}>
                <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: '-.035em',
                  lineHeight: 1, fontFamily: FH }}>{v}</div>
                <div style={{ marginTop: 7, fontSize: 15, opacity: .8 }}>{l}</div>
              </div>
            ))}
          </div>

          {TRUST.map(([t, sub, ic], i) => {
            const p = MOTION.in(lt, 1.5 + i * 0.22, 0.45);
            return (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 18,
                borderRadius: 20, padding: '18px 22px', background: 'rgba(255,255,255,.12)',
                border: '1px solid rgba(255,255,255,.2)', opacity: p, flex: '1 1 auto',
                transform: `translateX(${(1 - p) * 60}px)` }}>
                <div style={{ width: 52, height: 52, borderRadius: 999, flex: '0 0 auto',
                  background: 'rgba(255,255,255,.2)', display: 'grid',
                  placeItems: 'center' }}>
                  <Icon n={ic} size={25} color="#fff" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.015em',
                    fontFamily: FH }}>{t}</div>
                  <div style={{ marginTop: 3, fontSize: 17, opacity: .82 }}>{sub}</div>
                </div>
                <Icon n="check" size={22} color="#fff"
                  style={{ marginLeft: 'auto', opacity: clamp((p - 0.6) * 3, 0, 1) }} />
              </div>
            );
          })}
        </div>
      </div>
    </Desktop>
  );
}

const SCENES = {
  Ping, Order1, Build1, Deliver1, Order2, Build2, Deliver2, Order3, Build3,
  Deliver3, Outro,
};

function PromoVideo() {
  const [t, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
  const [, bump] = React.useState(0);
  React.useEffect(() => {
    if (window.lucide) return;
    const id = setInterval(() => {
      if (window.lucide) { bump(x => x + 1); clearInterval(id); }
    }, 120);
    return () => clearInterval(id);
  }, []);
  const cfg = React.useMemo(() => ({
    a: t.accent || '#ec3013',
    handle: t.handle || '@MinatsukiYue',
    deadlines: t.showDeadlines !== false,
  }), [t.accent, t.handle, t.showDeadlines]);
  return (
    <Ctx.Provider value={cfg}>
      <div style={{ position: 'absolute', inset: 0, background: '#05060a' }}>
        <SceneStage width={W} height={H} scenes={window.OM_SCENES}
          playback={window.OM_PLAYBACK} bg="#05060a" transition="cut">
          {SCENES}
        </SceneStage>
        <TweaksPanel>
          <TweakSection label="Ролик" />
          <TweakText label="Telegram" value={t.handle}
            onChange={(v) => setTweak('handle', v)} />
          <TweakToggle label="Сроки в кадре" value={t.showDeadlines !== false}
            onChange={(v) => setTweak('showDeadlines', v)} />
          <TweakColor label="Акцент" value={t.accent}
            options={['#ec3013', '#2f8ee0', '#7a5ae0', '#1f8a5b']}
            onChange={(v) => setTweak('accent', v)} />
          <TweakSection label="Редактор" />
          <TweakToggle label="Motion editor" value={t.motionEditor !== false}
            onChange={(v) => setTweak('motionEditor', v)} />
        </TweaksPanel>
      </div>
    </Ctx.Provider>
  );
}

window.PromoVideo = PromoVideo;
