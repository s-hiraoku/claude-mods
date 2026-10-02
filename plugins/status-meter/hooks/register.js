// The meters line of the terminal statusline (~/.claude/statusline.sh), for the band above the prompt
// in the apps (Desktop, mobile, VS Code), whether the session runs locally or in the cloud: context,
// 5-hour and 7-day usage, each drawn as an SVG gauge beside its value.

// The meter pattern in use: options.pattern at load, then each /config change
let selected = 'bar';
let context = null;
let rateLimits = [];
// The redraw timer, kept so a re-fired session.start can stop it
let ticker = null;
// How many times each surface asked for the band, for /meter debug
const asks = {};

// How often to redraw, so the reset markers move on and a passed reset shows 0%
const TICK_MS = 60_000;
// The pattern last chosen with /meter or /config, which wins over options.pattern
const PATTERN_KEY = 'pattern';
const DAY_MS = 24 * 3_600_000;
const LIMITS = [
  { kind: 'five_hour', name: '5h' },
  { kind: 'seven_day', name: '7d' },
];
// Neutral gray with alpha, so the unfilled part reads on light and dark themes alike
const TRACK = 'rgba(128,128,128,0.3)';

// Each pattern draws a gauge for `used` (0 to 100) in `color`, sized to sit on one text line
const PATTERNS = {
  ring: gauge(12, 12, (used, color) =>
    `<circle cx="6" cy="6" r="4.5" fill="none" stroke="${TRACK}" stroke-width="2"/>` +
    `<circle cx="6" cy="6" r="4.5" fill="none" stroke="${color}" stroke-width="2" pathLength="100" stroke-dasharray="${Math.round(used)} 100" transform="rotate(-90 6 6)"/>`),
  dots: gauge(10, 10, (used, color) => `<circle cx="5" cy="5" r="4" fill="${color}"/>`),
  // Eight bars of rising height, lit from the left
  sparkline: gauge(31, 12, (used, color) =>
    times(8, (i) => {
      const h = Math.round(1.5 * (i + 1));
      return `<rect x="${i * 4}" y="${12 - h}" width="3" height="${h}" rx="0.5" fill="${i < used / 12.5 ? color : TRACK}"/>`;
    })),
  // Ten cells, the last one lit filled only in part
  bar: gauge(59, 8, (used, color) =>
    times(10, (i) => {
      const fill = Math.min(Math.max(used / 10 - i, 0), 1) * 5;
      const lit = fill > 0 ? `<rect x="${i * 6}" width="${fill.toFixed(1)}" height="8" rx="1" fill="${color}"/>` : '';
      return `<rect x="${i * 6}" width="5" height="8" rx="1" fill="${TRACK}"/>` + lit;
    })),
  // Four braille cells of 2x4 dots, lit column by column from the bottom up, as ⡀⡄⡆⡇⣇⣧⣷⣿ fill
  braille: gauge(30, 12, (used, color) =>
    times(32, (k) => {
      const col = Math.floor(k / 4);
      const x = 1.5 + col * 3 + Math.floor(col / 2) * 2;
      const y = 1.5 + (3 - (k % 4)) * 3;
      return `<circle cx="${x}" cy="${y}" r="1" fill="${k < used * 0.32 ? color : TRACK}"/>`;
    })),
};

export function register(on, options) {
  // An unset or unknown option falls back to the default pattern
  if (options.pattern in PATTERNS) selected = options.pattern;

  // Fires again on an enable or a worker respawn, which may keep this module's variables
  on('session.start', async ($, e, next) => {
    ticker?.cancel();
    await $.command.register({
      name: 'meter',
      description: 'Switch the meter pattern (ring, dots, sparkline, bar or braille)',
      argumentHint: '<pattern>',
    });
    const saved = await $.store.get(PATTERN_KEY);
    if (saved in PATTERNS) selected = saved;
    const usage = await $.session.usage();
    context = usage.context;
    rateLimits = usage.rateLimits;
    // A session can start before any response reported the limits, and a later response need
    // not raise session.measure for them, so each tick reads them again
    ticker = $.clock.every(TICK_MS, async () => {
      const latest = (await $.session.usage()).rateLimits;
      if (latest.length > 0) rateLimits = latest;
      $.ui.invalidate('ui.render');
    });
    $.ui.invalidate('ui.render');
    return next(e);
  });

  // /clear, /resume, /branch (fork) and compaction change the context, which session.measure
  // reports only after the next turn
  on('classic.SessionStart', { source: ['clear', 'resume', 'fork', 'compact'] }, async ($, e, next) => {
    context = (await $.session.usage()).context;
    $.ui.invalidate('ui.render');
    return next(e);
  });

  // Fires after each turn, and when a rate-limit window moves a whole point
  on('session.measure', async ($, e, next) => {
    context = e.context;
    // e.rateLimits is always the latest reading; changed alone marks a window that went away
    if (e.rateLimits.length > 0 || e.changed.includes('rateLimits')) rateLimits = e.rateLimits;
    $.ui.invalidate('ui.render');
    return next(e);
  });

  // Switches the pattern live; a change another hook denied leaves the drawing as it was
  on('config.set', { key: 'status-meter.pattern' }, async ($, e, next) => {
    const result = await next(e);
    if (result.deny === undefined) await choose($, result.value);
    return result;
  });

  // The Desktop app's /config opens the app's own settings, not this row, and a mod has no
  // /config row of its own to set ($.config.set refuses the key), so /meter is how a Desktop
  // user switches
  on('command.run', { command: 'meter' }, async ($, e) => {
    const name = e.args.trim();
    // Which surfaces the session draws on and which of them asked for the band, to tell an app that
    // never asks from one that asks and does not show it
    if (name === 'debug') {
      const surfaces = await $.session.surfaces();
      return { text: 'Surfaces: ' + JSON.stringify(surfaces) + ', band asks: ' + JSON.stringify(asks) };
    }
    if (!(name in PATTERNS)) {
      return { text: 'Patterns: ' + Object.keys(PATTERNS).join(', ') + ' (now: ' + selected + ')' };
    }
    await choose($, name);
    return { text: 'Meter pattern: ' + name };
  });

  // The terminal keeps its own statusLine, so only the app surfaces get this band. A cloud session
  // has no terminal of its own: the app that attached to it draws as desktop or mobile, all with Svg
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    asks[e.surface] = (asks[e.surface] ?? 0) + 1;
    if (e.surface === 'terminal') return next(e);
    const elements = $.ui.resolve(e);
    const { Box, Text } = elements;
    const now = await $.clock.now();
    const meters = [contextMeter(), ...LIMITS.map((limit) => limitMeter(limit, now))];
    // The statusline's dim separator between meters
    const children = meters.flatMap((m, i) => [
      ...(i === 0 ? [] : [Text({ dimColor: true, children: ['│'] })]),
      meter(elements, m),
    ]);
    const line = Box({ flexDirection: 'row', columnGap: 1, alignItems: 'center', children });
    // Keep what the mods after this one draw in the band
    const rest = await next(e);
    return rest ? Box({ flexDirection: 'column', children: [line, rest] }) : line;
  });
}

// Saved in $.store, which every session on the machine shares, so the next session starts with it
async function choose($, name) {
  selected = name;
  await $.store.set(PATTERN_KEY, name);
  $.ui.invalidate('ui.render');
}

function contextMeter() {
  const label = context?.window > 0 ? 'ctx ' + Math.floor(context.window / 1000) + 'k' : 'ctx';
  return { name: 'ctx', label, used: context?.percent, marker: null };
}

function limitMeter({ kind, name }, now) {
  const limit = rateLimits.find((l) => l.kind === kind);
  const resetsAt = limit?.resetsAt == null ? null : Date.parse(limit.resetsAt);
  // A window that has reset since the reading starts again from zero
  if (resetsAt != null && resetsAt <= now) return { name, label: name, used: 0, marker: null };
  return { name, label: name, used: limit?.percentUsed, marker: resetsAt == null ? null : resetMarker(resetsAt, now) };
}

// The reset's local time of day when it is within a day, else its date
function resetMarker(ms, now) {
  const d = new Date(ms);
  if (ms - now < DAY_MS) {
    return '↻' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  return '↻' + (d.getMonth() + 1) + '/' + d.getDate();
}

// An unknown figure (no reading yet) draws an empty gauge in the track color beside a dash
function meter({ Box, Text, Svg }, { name, label, used, marker }) {
  const known = typeof used === 'number';
  const value = known ? Math.round(used) + '%' : '—';
  const color = known ? gradient(used) : TRACK;
  const shape = PATTERNS[selected] ?? PATTERNS.ring;
  const children = [
    Text({ dimColor: true, children: [label] }),
    Svg({ source: shape.draw(known ? used : 0, color), alt: label + ' ' + value, width: shape.width, height: shape.height }),
    Text({ ...(known ? { color } : { dimColor: true }), children: [value] }),
  ];
  if (marker) children.push(Text({ dimColor: true, children: [marker] }));
  return Box({ key: 'meter-' + name, flexDirection: 'row', columnGap: 1, alignItems: 'center', children });
}

// The statusline's green to yellow to red ramp, ported as is (Python's int() truncates)
function gradient(pct) {
  const rgb = pct < 50 ? [Math.trunc(pct * 5.1), 200, 80] : [255, Math.max(Math.trunc(200 - (pct - 50) * 4), 0), 60];
  return '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
}

function gauge(width, height, body) {
  return {
    width,
    height,
    draw: (used, color) =>
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body(used, color)}</svg>`,
  };
}

function times(n, fn) {
  return Array.from({ length: n }, (_, i) => fn(i)).join('');
}
