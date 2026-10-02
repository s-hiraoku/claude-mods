import type { SessionContextUsage, SessionRateLimit } from 'claude-code';
import { expect, mock, test } from 'claude-code/testing';

const HOUR = 3_600_000;
// Local times, so the reset markers read the same in any time zone
const NOW = new Date(2026, 9, 1, 8, 0).getTime();
const FIVE_HOUR_RESET = new Date(2026, 9, 1, 9, 5).getTime();
const SEVEN_DAY_RESET = new Date(2026, 9, 6, 10, 0).getTime();

const BAND = {
  plugin: 'status-meter',
  component: 'AbovePrompt',
  requestId: 'above-prompt',
  viewport: { columns: 120, rows: 40 },
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 4,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 4 },
    view: {},
  },
} as const;
const DESKTOP = { ...BAND, surface: 'desktop' } as const;
const START = { surface: 'desktop', isInteractive: true, cwd: '/work' } as const;

const at = (ms: number) => new Date(ms).toISOString();
const LIMITS: SessionRateLimit[] = [
  { kind: 'five_hour', percentUsed: 43, resetsAt: at(FIVE_HOUR_RESET) },
  { kind: 'seven_day', percentUsed: 5, resetsAt: at(SEVEN_DAY_RESET) },
];
const CONTEXT: SessionContextUsage = { tokens: 40_000, window: 200_000, percent: 20 };

type On = Parameters<typeof mock.clock>[0];
const PRESENTATION = { isFullscreen: false, columns: 100 } as const;

function stubSession(on: On, rateLimits = LIMITS, context = () => CONTEXT, store = new Map<string, unknown>()) {
  on('store.get', ($, e) => ({ value: store.get(e.key) }));
  on('store.set', ($, e) => {
    store.set(e.key, e.value);
    return { value: undefined };
  });
  on('session.usage', () => ({ value: { startedAt: NOW, context: context(), rateLimits } }));
  on('session.start', () => ({ cwd: '/work' }));
  on('command.register', ($, e) => ({ value: { command: e.name } }));
  // What the mods after this one draw in the band
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['drawn by another mod'] }));
}

test('the Desktop app shows the three meters with their values and reset markers', async ($, on) => {
  mock.clock(on, { now: NOW });
  stubSession(on);
  await $.session.start(START);

  const ui = await $.ui.mount(DESKTOP);
  for (const text of ['ctx 200k', '20%', '43%', '↻09:05', '↻10/6']) {
    expect(await ui.find({ type: 'Text', text }), text).toBeDefined();
  }
  expect(await ui.find({ type: 'Text', text: /^5%$/ })).toMatchObject({ props: { color: '#19c850' } });
  const alts = (await ui.findAll({ type: 'Svg' })).map((svg) => svg.props.alt);
  expect(alts).toEqual(['ctx 200k 20%', '5h 43%', '7d 5%']);
  expect(await ui.find({ type: 'Text', text: 'drawn by another mod' })).toBeDefined();
});

// Any app surface that asks for the band gets the meters, not the Desktop app alone
for (const surface of ['mobile', 'vscode'] as const) {
  test(`the ${surface} surface shows the three meters too`, async ($, on) => {
    mock.clock(on, { now: NOW });
    stubSession(on);
    await $.session.start({ ...START, surface });

    const ui = await $.ui.mount({ ...BAND, surface });
    for (const text of ['ctx 200k', '20%', '43%', '↻09:05', '↻10/6']) {
      expect(await ui.find({ type: 'Text', text }), text).toBeDefined();
    }
    expect(await ui.findAll({ type: 'Svg' })).toHaveLength(3);
  });
}

test('the terminal keeps its statusLine, so nothing of this mod is drawn there', async ($, on) => {
  mock.clock(on, { now: NOW });
  stubSession(on);
  await $.session.start({ ...START, surface: 'terminal' });

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' });
  expect(await ui.find({ type: 'Text', text: 'ctx 200k' })).toBeUndefined();
  expect(await ui.findAll({ type: 'Svg' })).toHaveLength(0);
  expect(await ui.find({ type: 'Text', text: 'drawn by another mod' })).toBeDefined();
});

// The gradient's color at each usage; 10 rather than 0, since an empty gauge lights nothing
const RAMP = [
  [10, '#33c850'],
  [50, '#ffc83c'],
  [100, '#ff003c'],
] as const;
// Each pattern's own width, which tells which one drew
const WIDTHS = { ring: 12, dots: 10, sparkline: 31, bar: 59, braille: 30 } as const;

for (const [pattern, width] of Object.entries(WIDTHS)) {
  test(`the ${pattern} pattern draws an SVG in the gradient color`, { options: { pattern } }, async ($, on) => {
    mock.clock(on, { now: NOW });
    stubSession(on);
    on('session.measure', ($, e) => ({ changed: e.changed }));
    await $.session.start(START);

    for (const [percent, color] of RAMP) {
      await $.session.measure({ context: { window: 200_000, percent }, rateLimits: LIMITS, changed: ['context'] });
      const ui = await $.ui.mount(DESKTOP);
      const [ctx] = await ui.findAll({ type: 'Svg' });
      expect(ctx?.props).toMatchObject({ width, alt: `ctx 200k ${percent}%` });
      expect(String(ctx?.props.source)).toStartWith('<svg');
      expect(String(ctx?.props.source)).toContain(color);
      await ui.unmount();
    }
  });
}

test('/config switches the pattern live, unless the change was denied', async ($, on) => {
  mock.clock(on, { now: NOW });
  stubSession(on);
  let deny = false;
  on('config.set', ($, e) => (deny ? { deny: 'locked' } : { value: e.value }));
  await $.session.start(START);
  const change = (key: string, value: string) =>
    $.config.set({ key, value, previous: 'bar', provider: { plugin: 'status-meter', tier: 'user' }, origin: { kind: 'composer' } });

  const ui = await $.ui.mount(DESKTOP);
  const widths = async () => (await ui.findAll({ type: 'Svg' })).map((svg) => svg.props.width);
  expect(await widths()).toEqual([59, 59, 59]);

  await change('status-meter.pattern', 'braille');
  expect(await widths()).toEqual([30, 30, 30]);

  // Another row, and a denied change, leave the meters as they are
  await change('other-mod.pattern', 'dots');
  deny = true;
  await change('status-meter.pattern', 'dots');
  expect(await widths()).toEqual([30, 30, 30]);
});

test('/meter switches the pattern, the next session starts with it, and anything else lists them', async ($, on) => {
  mock.clock(on, { now: NOW });
  const store = new Map<string, unknown>();
  stubSession(on, LIMITS, () => CONTEXT, store);
  await $.session.start(START);
  const ui = await $.ui.mount(DESKTOP);
  const widths = async () => (await ui.findAll({ type: 'Svg' })).map((svg) => svg.props.width);
  const meter = (args: string) => $.command.run({ command: 'meter', args, origin: { kind: 'composer' }, presentation: PRESENTATION });

  expect((await meter(' ring ')).text).toBe('Meter pattern: ring');
  expect(await widths()).toEqual([12, 12, 12]);
  expect(store.get('pattern')).toBe('ring');

  expect((await meter('pie')).text).toBe(
    'ctx 200k ██░░░░░░░░ 20% │ 5h ████▎░░░░░ 43% ↻09:05 │ 7d ▌░░░░░░░░░ 5% ↻10/6\n' +
      'Patterns: ring, dots, sparkline, bar, braille (now: ring)',
  );
  expect(store.get('pattern')).toBe('ring');
});

// An app attached to a cloud session never asks for the band, so /meter alone prints the figures
test('/meter alone prints the meters as text, a dash before the first reading', async ($, on) => {
  mock.clock(on, { now: NOW });
  stubSession(on, []);
  await $.session.start(START);
  const meter = (args: string) => $.command.run({ command: 'meter', args, origin: { kind: 'composer' }, presentation: PRESENTATION });

  expect((await meter('')).text).toBe(
    'ctx 200k ██░░░░░░░░ 20% │ 5h ░░░░░░░░░░ — │ 7d ░░░░░░░░░░ —\n' + 'Patterns: ring, dots, sparkline, bar, braille (now: bar)',
  );
});

test('a session starts with the pattern saved in the store over options.pattern', { options: { pattern: 'dots' } }, async ($, on) => {
  mock.clock(on, { now: NOW });
  stubSession(on, LIMITS, () => CONTEXT, new Map([['pattern', 'braille']]));
  await $.session.start(START);
  const ui = await $.ui.mount(DESKTOP);
  expect((await ui.findAll({ type: 'Svg' })).map((svg) => svg.props.width)).toEqual([30, 30, 30]);
});

test('a window past its reset shows 0% and drops its marker', async ($, on) => {
  const clock = mock.clock(on, { now: NOW });
  stubSession(on);
  await $.session.start(START);
  const ui = await $.ui.mount(DESKTOP);

  // Past the 5-hour reset at 09:05; the weekly one is still days away
  await clock.advance(2 * HOUR);
  const alts = (await ui.findAll({ type: 'Svg' })).map((svg) => svg.props.alt);
  expect(alts).toEqual(['ctx 200k 20%', '5h 0%', '7d 5%']);
  expect(await ui.find({ type: 'Text', text: '↻09:05' })).toBeUndefined();
  expect(await ui.find({ type: 'Text', text: '↻10/6' })).toBeDefined();
});

test('a reset within a day shows its time, a later one its date', async ($, on) => {
  mock.clock(on, { now: NOW });
  stubSession(on, [
    { kind: 'five_hour', percentUsed: 1, resetsAt: at(NOW + 23 * HOUR) },
    { kind: 'seven_day', percentUsed: 1, resetsAt: at(NOW + 25 * HOUR) },
  ]);
  await $.session.start(START);

  const ui = await $.ui.mount(DESKTOP);
  // 07:00 tomorrow is under 24 hours away, 09:00 tomorrow over
  expect(await ui.find({ type: 'Text', text: '↻07:00' })).toBeDefined();
  expect(await ui.find({ type: 'Text', text: '↻10/2' })).toBeDefined();
});

test('before the first reading the limits show a dash on an empty gauge', async ($, on) => {
  mock.clock(on, { now: NOW });
  stubSession(on, []);
  await $.session.start(START);

  const ui = await $.ui.mount(DESKTOP);
  const svgs = await ui.findAll({ type: 'Svg' });
  expect(svgs.map((svg) => svg.props.alt)).toEqual(['ctx 200k 20%', '5h —', '7d —']);
  expect(String(svgs[1]?.props.source)).not.toContain('#');
  expect(await ui.find({ type: 'Text', text: '—' })).toMatchObject({ props: { dimColor: true } });
});

test('limits that arrive without a rateLimits change, or only in usage(), still show', async ($, on) => {
  const clock = mock.clock(on, { now: NOW });
  const reported: SessionRateLimit[] = [];
  stubSession(on, reported);
  on('session.measure', ($, e) => ({ changed: e.changed }));
  await $.session.start(START);
  const ui = await $.ui.mount(DESKTOP);
  const alts = async () => (await ui.findAll({ type: 'Svg' })).map((svg) => svg.props.alt);

  await $.session.measure({ context: CONTEXT, rateLimits: LIMITS, changed: ['context'] });
  expect(await alts()).toEqual(['ctx 200k 20%', '5h 43%', '7d 5%']);

  reported.push({ ...LIMITS[0]!, percentUsed: 60 }, LIMITS[1]!);
  await clock.advance(60_000);
  expect(await alts()).toEqual(['ctx 200k 20%', '5h 60%', '7d 5%']);
});

test('/clear shows the emptied context before the next turn', async ($, on) => {
  mock.clock(on, { now: NOW });
  let cleared = false;
  stubSession(on, LIMITS, () => (cleared ? { window: 200_000 } : CONTEXT));
  on('classic.SessionStart', () => ({}));
  await $.session.start(START);

  cleared = true;
  await $.classic.SessionStart({ source: 'clear' });
  const ui = await $.ui.mount(DESKTOP);
  expect((await ui.findAll({ type: 'Svg' }))[0]?.props.alt).toBe('ctx 200k —');
});
