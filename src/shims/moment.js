/**
 * @file Moment.js compatible facade backed by the native Temporal API.
 *
 * Exposed as `globalThis.moment` (see `g3w-vendors.js`) to keep the public contract
 * used by core components and plugins after dropping the `moment` dependency.
 *
 * ## Supported API (local time only)
 *
 * - factory: `moment()`, `moment(input, format?, locale?, strict?)` where `input` is
 *   an ISO string, a string + format(s), `Date`, epoch ms, array, object or another moment
 * - instance: getters/setters (`year()`, `month()`, `date()`, `day()`, `hour()`, ...),
 *   `add`, `subtract`, `startOf`, `endOf`, `diff`, `isBefore`, `isAfter`, `isSame`,
 *   `isSameOrBefore`, `isSameOrAfter`, `format`, `locale`, `localeData`, `clone`,
 *   `isValid`, `valueOf`, `unix`, `toDate`, `toISOString`, `toJSON`, `toString`,
 *   `utcOffset`, `daysInMonth`
 * - static: `fn`, `defaultFormat`, `ISO_8601`, `isMoment`, `isDate`, `now`, `unix`,
 *   `invalid`, `min`, `max`, `locale`, `localeData`
 *
 * Not supported: UTC/offset mode (`moment.utc`, `utcOffset(value)`), durations,
 * relative time (`fromNow`, `calendar`), ordinal token `Do`, `defineLocale`.
 *
 * ## Locales
 *
 * Month/weekday names, first day of week and long date formats (`L`, `LT`, ...) are
 * derived from `Intl` (CLDR); `OVERRIDES` restores Moment's data where CLDR differs.
 *
 * ## Implementation notes
 *
 * - each instance stores only epoch milliseconds (`_ms`, `NaN` when invalid) and a
 *   locale key; a `Temporal.ZonedDateTime` in the system time zone is created on demand
 * - plain properties (no `#private` fields) let instances survive `cloneDeep` and
 *   Vue 2 observation, just like the original Moment objects
 * - instances are mutable: `add`, `startOf`, setters, ... change and return `this`
 * - `Temporal` is only accessed lazily, so loading this module never throws
 *   (a polyfill is installed by `g3w-vendors.js` when the browser lacks it)
 *
 * @since 4.2.0
 */

/** Default locale key for new instances (see `moment.locale()`) */
let globalLocale = 'en';

/** Marker passed as format to only accept ISO 8601 strings (`moment(value, moment.ISO_8601)`) */
const ISO_8601 = function() {};

/** Cache of locale data objects, by locale key */
const LOCALES = {};

/** Unit aliases (`'d'`, `'days'`, `'D'`, `'date'`, ...) → canonical unit name */
const UNITS = {
  y: 'year', year: 'year', Q: 'quarter', quarter: 'quarter', M: 'month', month: 'month',
  w: 'week', week: 'week', W: 'isoWeek', isoweek: 'isoWeek', d: 'day', day: 'day', D: 'day', date: 'day',
  h: 'hour', hour: 'hour', m: 'minute', minute: 'minute', s: 'second', second: 'second', ms: 'millisecond', millisecond: 'millisecond',
};

/** Exact (time) units → milliseconds */
const MS = { hour: 36e5, minute: 6e4, second: 1e3, millisecond: 1 };

/** Calendar units → [ Temporal duration field, multiplier ] (wall-clock arithmetic, DST safe) */
const CALENDAR = { year: ['years', 1], quarter: ['months', 3], month: ['months', 1], week: ['days', 7], isoWeek: ['days', 7], day: ['days', 1] };

/** Canonical unit → `ZonedDateTime` truncated to the start of that unit (`week` depends on locale) */
const START_OF = {
  year:        z => z.with({ month: 1, day: 1 }).startOfDay(),
  quarter:     z => z.with({ month: z.month - (z.month - 1) % 3, day: 1 }).startOfDay(),
  month:       z => z.with({ day: 1 }).startOfDay(),
  week:        (z, l) => z.subtract({ days: (z.dayOfWeek - l.firstDayOfWeek() + 7) % 7 }).startOfDay(),
  isoWeek:     z => z.subtract({ days: z.dayOfWeek - 1 }).startOfDay(),
  day:         z => z.startOfDay(),
  hour:        z => z.round({ smallestUnit: 'hour', roundingMode: 'floor' }),
  minute:      z => z.round({ smallestUnit: 'minute', roundingMode: 'floor' }),
  second:      z => z.round({ smallestUnit: 'second', roundingMode: 'floor' }),
  millisecond: z => z.round({ smallestUnit: 'millisecond', roundingMode: 'floor' }),
};

/** Moment getters on a `ZonedDateTime` (`month` is 0-based, `day` is weekday with Sunday = 0) */
const GETTERS = {
  year:        z => z.year,
  month:       z => z.month - 1,
  date:        z => z.day,
  day:         z => z.dayOfWeek % 7,
  hour:        z => z.hour,
  minute:      z => z.minute,
  second:      z => z.second,
  millisecond: z => z.millisecond,
};

// overflowing values bubble up to the next unit (eg. `date(32)` → next month), like Moment does
const SETTERS = {
  year:        (p, v) => p.with({ year: v }),
  month:       (p, v) => p.with({ month: 1 }).add({ months: v }),
  date:        (p, v) => p.with({ day: 1 }).add({ days: v - 1 }),
  day:         (p, v) => p.add({ days: v - p.dayOfWeek % 7 }),
  hour:        (p, v) => p.with({ hour: 0 }).add({ hours: v }),
  minute:      (p, v) => p.with({ minute: 0 }).add({ minutes: v }),
  second:      (p, v) => p.with({ second: 0 }).add({ seconds: v }),
  millisecond: (p, v) => p.with({ millisecond: 0 }).add({ milliseconds: v }),
};

/** Long date formats computed from `Intl` patterns (`dLL` is the internal date part of `LLLL`) */
const INTL_FORMATS = {
  LT:   { hour: 'numeric', minute: '2-digit' },
  LTS:  { hour: 'numeric', minute: '2-digit', second: '2-digit' },
  L:    { year: 'numeric', month: '2-digit', day: '2-digit' },
  LL:   { year: 'numeric', month: 'long', day: 'numeric' },
  dLL:  { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
};

const SHORTEN = { MMMM: 'MMM', MM: 'M', DD: 'D', dddd: 'ddd' };

// like Moment: date and time are simply joined, lowercase formats are shortened uppercase ones
const DERIVED_FORMATS = {
  LLL:  get => `${get('LL')} ${get('LT')}`,
  LLLL: get => `${get('dLL')} ${get('LT')}`,
  ...Object.fromEntries(['l', 'll', 'lll', 'llll'].map(key => [key, get => get(key.toUpperCase()).replace(TOKENS, t => SHORTEN[t] || t)])),
};

// Moment locale data that differs from CLDR (source: moment/locale/*.js, MIT license)
const OVERRIDES = {
  de: {
    monthsShort:   ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'],
  },
  es: {
    monthsShort:   ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'],
    weekdaysShort: ['dom.', 'lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.'],
    formats:       { LT: 'H:mm', LTS: 'H:mm:ss' },
  },
  pt: {
    monthsShort:   ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
    weekdays:      ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
    weekdaysShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    weekdaysMin:   ['Do', '2ª', '3ª', '4ª', '5ª', '6ª', 'Sá'],
    firstDayOfWeek: 1,
  },
  pl: {
    weekdaysShort: ['ndz', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob'],
    weekdaysMin:   ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'],
  },
  ro: {
    monthsShort:   ['ian.', 'feb.', 'mart.', 'apr.', 'mai', 'iun.', 'iul.', 'aug.', 'sept.', 'oct.', 'nov.', 'dec.'],
    weekdaysShort: ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'],
    weekdaysMin:   ['Du', 'Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ'],
    formats:       { LT: 'H:mm', LTS: 'H:mm:ss' },
  },
  fi: {
    monthsFormat:  ['tammikuu', 'helmikuu', 'maaliskuu', 'huhtikuu', 'toukokuu', 'kesäkuu', 'heinäkuu', 'elokuu', 'syyskuu', 'lokakuu', 'marraskuu', 'joulukuu'],
    formats:       { LL: 'D. MMMM[ta] YYYY', LLL: 'D. MMMM[ta] YYYY, [klo] HH.mm', dLL: 'dddd, D. MMMM[ta] YYYY, [klo]', ll: 'D. MMM YYYY', lll: 'D. MMM YYYY, [klo] HH.mm', llll: 'ddd, D. MMM YYYY, [klo] HH.mm' },
  },
  bg: {
    monthsShort:   ['яну', 'фев', 'мар', 'апр', 'май', 'юни', 'юли', 'авг', 'сеп', 'окт', 'ное', 'дек'],
    weekdaysShort: ['нед', 'пон', 'вто', 'сря', 'чет', 'пет', 'съб'],
    formats:       { L: 'D.MM.YYYY', LT: 'H:mm', LTS: 'H:mm:ss', LL: 'D MMMM YYYY', dLL: 'dddd, D MMMM YYYY' },
  },
  uk: {
    monthsShort:   ['січ', 'лют', 'бер', 'квіт', 'трав', 'черв', 'лип', 'серп', 'вер', 'жовт', 'лист', 'груд'],
    formats:       { LL: 'D MMMM YYYY р.', LLL: 'D MMMM YYYY р., HH:mm', dLL: 'dddd, D MMMM YYYY р.,' },
    meridiem:      h => ['ночі', 'ранку', 'дня', 'вечора'][[4, 12, 17, 24].findIndex(limit => h < limit)],
    meridiemParse: 'ночі|ранку|дня|вечора',
    isPM:          v => /^(дня|вечора)$/.test(v),
  },
  se: {
    weekdays:      ['sotnabeaivi', 'vuossárga', 'maŋŋebárga', 'gaskavahkku', 'duorastat', 'bearjadat', 'lávvardat'],
    weekdaysMin:   ['s', 'v', 'm', 'g', 'd', 'b', 'L'],
    formats:       { L: 'DD.MM.YYYY', LL: 'MMMM D. [b.] YYYY', LLL: 'MMMM D. [b.] YYYY [ti.] HH:mm', dLL: 'dddd, MMMM D. [b.] YYYY [ti.]' },
  },
};

// format context (eg. `D MMMM`) uses genitive month names in some languages (eg. pl, uk)
const GENITIVE = /D[oD]?(\[[^[\]]*\]|[\s.])+MMMM/;

/** Format tokenizer: `[escaped text]`, known tokens (longest first), or any single literal char */
const TOKENS = /\[([^\]]*)]|YYYYYY|YYYY|YY|Y|Q|MMMM|MMM|MM|M|DD|D|dddd|ddd|dd|d|E|HH|H|hh|h|kk|k|mm|m|ss|s|S{1,9}|A|a|ZZ|Z|X|x|[\s\S]/g;

const pad = (n, length) => String(n).padStart(length, '0');

const absRound = n => Math.sign(n) * Math.round(Math.abs(n));

const unitOf = unit => UNITS[unit] || UNITS[String(unit).toLowerCase().replace(/s$/, '')];

const escape = list => [...list].sort((a, b) => b.length - a.length).map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

const nameIndex = (lists, value) => lists.map(list => list.findIndex(n => n.toLowerCase() === value.toLowerCase())).find(i => i >= 0);

const offsetMinutes = value => {
  const [, sign, hh, mm] = /([+-])(\d\d):?(\d\d)/.exec(value) || [, '+', '0', '0'];
  return Number(sign + 1) * (Number(hh) * 60 + Number(mm));
};

/** Token → `(zonedDateTime, localeData, expandedFormat) => string|number` */
const FORMATTERS = {
  YYYYYY: z => ['+', '-'][Number(z.year < 0)] + pad(Math.abs(z.year), 6),
  YYYY:   z => pad(z.year, 4),
  YY:     z => pad(Math.abs(z.year) % 100, 2),
  Y:      z => z.year,
  Q:      z => Math.ceil(z.month / 3),
  MMMM:   (z, l, format) => l.months({ month: () => z.month - 1 }, format),
  MMM:    (z, l) => l.monthsShort()[z.month - 1],
  MM:     z => pad(z.month, 2),
  M:      z => z.month,
  DD:     z => pad(z.day, 2),
  D:      z => z.day,
  dddd:   (z, l) => l.weekdays()[z.dayOfWeek % 7],
  ddd:    (z, l) => l.weekdaysShort()[z.dayOfWeek % 7],
  dd:     (z, l) => l.weekdaysMin()[z.dayOfWeek % 7],
  d:      z => z.dayOfWeek % 7,
  E:      z => z.dayOfWeek,
  HH:     z => pad(z.hour, 2),
  H:      z => z.hour,
  hh:     z => pad(z.hour % 12 || 12, 2),
  h:      z => z.hour % 12 || 12,
  kk:     z => pad(z.hour || 24, 2),
  k:      z => z.hour || 24,
  mm:     z => pad(z.minute, 2),
  m:      z => z.minute,
  ss:     z => pad(z.second, 2),
  s:      z => z.second,
  A:      (z, l) => l.meridiem(z.hour, z.minute, false),
  a:      (z, l) => l.meridiem(z.hour, z.minute, true),
  ZZ:     z => z.offset.replace(':', ''),
  Z:      z => z.offset,
  X:      z => Math.floor(z.epochMilliseconds / 1000),
  x:      z => z.epochMilliseconds,
  ...Object.fromEntries(Array.from({ length: 9 }, (_, i) => ['S'.repeat(i + 1), z => pad(z.millisecond * 1e6 + z.microsecond * 1e3 + z.nanosecond, 9).slice(0, i + 1)])),
};

const noop    = () => {};
const setYear = (p, v) => { p.year = Number(v); };
const setMon  = (p, v) => { p.month = Number(v) - 1; };
const setDay  = (p, v) => { p.day = Number(v); };
const setHour = (p, v) => { p.hour = Number(v); };
const setMin  = (p, v) => { p.minute = Number(v); };
const setSec  = (p, v) => { p.second = Number(v); };
const setName = (p, v, l) => { p.month = nameIndex([l.months(), l._monthsFormat, l.monthsShort()], v); };
const months  = l => escape([...l.months(), ...l._monthsFormat, ...l.monthsShort()]);
const days    = l => escape([...l.weekdays(), ...l.weekdaysShort(), ...l.weekdaysMin()]);

/** token → [ strict regex, forgiving regex, setter ] */
const PARSERS = {
  YYYYYY: ['[+-]\\d{6}', '[+-]?\\d{1,6}', setYear],
  YYYY:   ['\\d{4}', '\\d{1,4}', setYear],
  YY:     ['\\d\\d', '\\d\\d?', (p, v) => { p.year = Number(v) + 1900 + 100 * Number(Number(v) <= 68); }],
  Y:      ['[+-]?\\d+', '[+-]?\\d+', setYear],
  Q:      ['[1-4]', '[1-4]', (p, v) => { p.month = (Number(v) - 1) * 3; }],
  MMMM:   [l => escape([...l.months(), ...l._monthsFormat]), months, setName],
  MMM:    [l => escape(l.monthsShort()), months, setName],
  MM:     ['\\d\\d', '\\d\\d?', setMon],
  M:      ['\\d\\d?', '\\d\\d?', setMon],
  DD:     ['\\d\\d', '\\d\\d?', setDay],
  D:      ['\\d\\d?', '\\d\\d?', setDay],
  dddd:   [l => escape(l.weekdays()), days, noop],
  ddd:    [l => escape(l.weekdaysShort()), days, noop],
  dd:     [l => escape(l.weekdaysMin()), days, noop],
  d:      ['[0-6]', '\\d', noop],
  E:      ['[1-7]', '\\d', noop],
  HH:     ['\\d\\d', '\\d\\d?', setHour],
  H:      ['\\d\\d?', '\\d\\d?', setHour],
  hh:     ['\\d\\d', '\\d\\d?', setHour],
  h:      ['\\d\\d?', '\\d\\d?', setHour],
  kk:     ['\\d\\d', '\\d\\d?', setHour],
  k:      ['\\d\\d?', '\\d\\d?', setHour],
  mm:     ['\\d\\d', '\\d\\d?', setMin],
  m:      ['\\d\\d?', '\\d\\d?', setMin],
  ss:     ['\\d\\d', '\\d\\d?', setSec],
  s:      ['\\d\\d?', '\\d\\d?', setSec],
  A:      [l => l._meridiemParse, l => l._meridiemParse, (p, v, l) => { p.pm = l.isPM(v); }],
  a:      [l => l._meridiemParse, l => l._meridiemParse, (p, v, l) => { p.pm = l.isPM(v); }],
  ZZ:     ['Z|[+-]\\d\\d:?\\d\\d', 'Z|[+-]\\d\\d:?\\d\\d', (p, v) => { p.offset = offsetMinutes(v); }],
  Z:      ['Z|[+-]\\d\\d:?\\d\\d', 'Z|[+-]\\d\\d:?\\d\\d', (p, v) => { p.offset = offsetMinutes(v); }],
  X:      ['[+-]?\\d+(?:\\.\\d{1,3})?', '[+-]?\\d+(?:\\.\\d{1,3})?', (p, v) => { p.epoch = Number(v) * 1000; }],
  x:      ['[+-]?\\d+', '[+-]?\\d+', (p, v) => { p.epoch = Number(v); }],
  ...Object.fromEntries(Array.from({ length: 9 }, (_, i) => ['S'.repeat(i + 1), [`\\d{${i + 1}}`, '\\d+', (p, v) => { p.millisecond = Math.trunc(Number(`0.${v}`) * 1000); }]])),
};

/**
 * @returns the result of `fn`, or `null` when it throws (Temporal throws `RangeError` on invalid values)
 */
function attempt(fn) {
  try {
    return fn();
  } catch (e) {
    return null;
  }
}

/**
 * @param { number } ms epoch milliseconds
 *
 * @returns { Temporal.ZonedDateTime | null } date in the system time zone, `null` when `ms` is not a valid date
 */
function fromEpoch(ms) {
  return (Number.isFinite(ms) && attempt(() => Temporal.Instant.fromEpochMilliseconds(Math.trunc(ms)).toZonedDateTimeISO(Temporal.Now.timeZoneId()))) || null;
}

/**
 * @returns { string } lowercase `key` when supported by `Intl`, otherwise `fallback` (like Moment ignoring unknown locales)
 */
function resolveLocale(key, fallback) {
  const locale = String(key || '').toLowerCase();
  return (attempt(() => Intl.DateTimeFormat.supportedLocalesOf(locale).length > 0) && locale) || fallback;
}

/**
 * Convert an `Intl.DateTimeFormat` pattern into a Moment format string (eg. `{ month: '2-digit', ... }` → `MM/DD/YYYY`)
 */
function longDateFormat(locale, options) {
  const intl = new Intl.DateTimeFormat(locale, { ...options, numberingSystem: 'latn' });
  const h12  = ['h11', 'h12'].includes(intl.resolvedOptions().hourCycle);
  const map  = {
    year:      () => 'YYYY',
    month:     v => ({ '01': 'MM', '1': 'M' })[v] || ({ long: 'MMMM' })[options.month] || 'MMM',
    day:       v => ({ '05': 'DD', '5': 'D' })[v],
    weekday:   () => ({ long: 'dddd' })[options.weekday] || 'ddd',
    hour:      v => ['HH', 'h'.repeat(v.length)][Number(h12)],
    minute:    () => 'mm',
    second:    () => 'ss',
    dayPeriod: () => 'A',
    literal:   v => v.replace(/[\u00a0\u202f]/g, ' ').replace(/\p{L}+/gu, '[$&]'),
  };
  return intl
    .formatToParts(new Date(2020, 0, 5, 9, 7, 3))
    .map(({ type, value }) => (map[type] || noop)(value) ?? '')
    .join('');
}

/**
 * Build a Moment compatible `localeData()` object from `Intl` data and `OVERRIDES`.
 *
 * Name lists are Sunday/January first; `_monthsFormat` and `_meridiemParse` are
 * internal helpers used by the parser.
 *
 * @param { string } locale resolved locale key
 */
function createLocaleData(locale) {
  const names = (options, field, dates) => {
    const intl = new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' });
    return dates.map(d => intl.formatToParts(d).find(p => field === p.type).value);
  };
  const monthDates   = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(2020, i, 15)));
  const weekdayDates = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2020, 0, 5 + i))); // Sunday first
  const intl         = new Intl.Locale(locale);
  const weekInfo     = intl.getWeekInfo?.() || intl.weekInfo || { firstDay: ({ en: 7 })[intl.language] || 1 };
  const data         = OVERRIDES[locale] || OVERRIDES[intl.language] || {};
  // format context names (eg. de "Jan.") are closer to Moment ones, unless they are numeric (eg. fi "1")
  const shortMonths  = names({ month: 'short', day: 'numeric' }, 'month', monthDates);
  const monthsShort  = data.monthsShort || [shortMonths, names({ month: 'short' }, 'month', monthDates)][Number(/^\d/.test(shortMonths[0]))];
  const months       = data.months || names({ month: 'long' }, 'month', monthDates);
  const monthsFormat = data.monthsFormat || names({ month: 'long', day: 'numeric' }, 'month', monthDates);
  const weekdays     = data.weekdays || names({ weekday: 'long' }, 'weekday', weekdayDates);
  const intlShort    = names({ weekday: 'short', month: 'long', day: 'numeric' }, 'weekday', weekdayDates);
  const short        = data.weekdaysShort || intlShort;
  const min          = data.weekdaysMin || intlShort.map(s => s.replace(/\.$/, '').slice(0, 2));
  const firstDay     = data.firstDayOfWeek ?? weekInfo.firstDay % 7;
  const formats      = { ...data.formats };
  const get          = key => formats[key] ??= (INTL_FORMATS[key] && longDateFormat(locale, INTL_FORMATS[key])) || DERIVED_FORMATS[key]?.(get);
  // `weekdays(true)` → locale sorted, `weekdays(m)` → weekday of `m`
  const day          = items => m => {
    if (true === m) {
      return [...items.slice(firstDay), ...items.slice(0, firstDay)];
    }
    return (m && items[m.day()]) || items;
  };
  return {
    _abbr:          locale,
    _monthsFormat:  monthsFormat,
    months:         (m, format) => (m && [months, monthsFormat][Number(GENITIVE.test(format))][m.month()]) || months,
    monthsShort:    m => (m && monthsShort[m.month()]) || monthsShort,
    weekdays:       day(weekdays),
    weekdaysShort:  day(short),
    weekdaysMin:    day(min),
    firstDayOfWeek: () => firstDay,
    meridiem:       data.meridiem || ((hour, minute, lower) => [['AM', 'PM'], ['am', 'pm']][Number(Boolean(lower))][Number(hour >= 12)]),
    isPM:           data.isPM || (v => /^p/i.test(v)),
    _meridiemParse: data.meridiemParse || '[ap]\\.?m?\\.?',
    longDateFormat: key => ('dLL' !== key && get(key)) || undefined,
  };
}

/**
 * @param { string } [key] locale key (defaults to the global locale)
 *
 * @returns cached locale data object
 */
function localeData(key) {
  const locale = resolveLocale(key, globalLocale);
  LOCALES[locale] ??= createLocaleData(locale);
  return LOCALES[locale];
}

/**
 * Replace long date tokens (`L`, `LT`, `LLLL`, `l`, ...) with the locale format, leaving `[escaped]` text untouched
 */
function expandFormat(format, locale) {
  return String(format).replace(/\[[^\]]*]|LTS|LT|LL?L?L?|l{1,4}/g, t => locale.longDateFormat(t) || t);
}

/**
 * Build a local date from parsed parts (missing leading date parts default to today, like Moment)
 *
 * @param { object } parts `{ year, month (0-based), day, hour, minute, second, millisecond, pm, offset (minutes), epoch (ms) }`
 *
 * @returns { Temporal.ZonedDateTime | null } `null` on overflowing values (eg. February 30)
 */
function buildDate(parts) {
  if (undefined !== parts.epoch) {
    return fromEpoch(parts.epoch);
  }
  const now      = Temporal.Now.plainDateISO();
  const today    = [now.year, now.month - 1, now.day];
  const values   = [parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second, parts.millisecond];
  const leading  = [0, 1, 2].filter(i => values.slice(0, i + 1).every(v => undefined === v));
  const defaults = [0, 0, 1, 0, 0, 0, 0];
  const [year, month, day, h, minute, second, millisecond] = values.map((v, i) => v ?? [defaults[i], today[i]][Number(leading.includes(i))]);
  let hour = h;
  if (parts.pm && hour < 12) {
    hour += 12;
  }
  if (false === parts.pm && 12 === hour) {
    hour = 0;
  }
  const date = attempt(() => Temporal.PlainDateTime.from({ year, month: month + 1, day, hour, minute, second, millisecond }, { overflow: 'reject' }));
  if (!date) {
    return null;
  }
  if (undefined !== parts.offset) {
    return attempt(() => date.toZonedDateTime('UTC').subtract({ minutes: parts.offset }).withTimeZone(Temporal.Now.timeZoneId()));
  }
  return attempt(() => date.toZonedDateTime(Temporal.Now.timeZoneId()));
}

/**
 * Parse `input` according to a Moment format string.
 *
 * Strict mode requires an exact match, otherwise tokens are searched forward and separators are optional (like Moment).
 *
 * @returns { Temporal.ZonedDateTime | null }
 */
function parseFormat(input, format, locale, strict) {
  const parts = {};
  let pos     = 0;
  let matched = 0;
  for (const [token, escaped] of expandFormat(format, locale).matchAll(TOKENS)) {
    const parser = undefined === escaped && PARSERS[token];
    if (!parser) {
      const literal = escaped ?? token;
      const found   = input.startsWith(literal, pos);
      if (strict && !found) {
        return null;
      }
      pos += literal.length * Number(found);
      continue;
    }
    const source = parser[Number(!strict)];
    const regexp = new RegExp(('function' === typeof source && source(locale)) || source, ['ig', 'iy'][Number(strict)]);
    regexp.lastIndex = pos;
    const match = regexp.exec(input);
    if (!match && strict) {
      return null;
    }
    if (!match) {
      continue;
    }
    parser[2](parts, match[0], locale);
    pos = match.index + match[0].length;
    matched++;
  }
  if (!matched || (strict && pos !== input.length)) {
    return null;
  }
  return buildDate(parts);
}

/**
 * Parse ISO 8601 strings: with offset/`Z` (absolute instant), date-time, date or year-month (local time)
 *
 * @returns { Temporal.ZonedDateTime | null }
 */
function parseISO(input) {
  const tz = Temporal.Now.timeZoneId();
  return attempt(() => Temporal.Instant.from(input).toZonedDateTimeISO(tz))
    || attempt(() => Temporal.PlainDateTime.from(input).toZonedDateTime(tz))
    || attempt(() => Temporal.PlainYearMonth.from(input).toPlainDate({ day: 1 }).toZonedDateTime(tz));
}

/**
 * Convert any `moment()` input into a local date, following Moment's input rules.
 *
 * @returns { Temporal.ZonedDateTime | null } `null` for invalid input (`null`, `''`, unparsable strings, ...)
 */
function toZonedDateTime(input, format, locale, strict) {
  if (undefined === input) {
    return Temporal.Now.zonedDateTimeISO();
  }
  if (null === input || '' === input) {
    return null;
  }
  if (input instanceof Date) {
    return fromEpoch(input.getTime());
  }
  if (['string', 'number'].includes(typeof input) && format) {
    return [].concat(format).reduce((date, f) => date || [
      () => parseFormat(String(input), f, locale, Boolean(strict)),
      () => parseISO(String(input)),
    ][Number(ISO_8601 === f)](), null);
  }
  if ('string' === typeof input) {
    // Moment's deprecated `new Date(string)` fallback
    return parseISO(input) || fromEpoch(new Date(input).getTime());
  }
  const fields = ['year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond'];
  if (Array.isArray(input) && input.length) {
    return buildDate(Object.fromEntries(input.map((v, i) => [fields[i], Number(v)])));
  }
  const isObject = input && 'object' === typeof input;
  if (isObject && Object.keys(input).length) {
    return buildDate(Object.fromEntries(Object.entries(input).map(([k, v]) => [unitOf(k), Number(v)])));
  }
  if (isObject) {
    return Temporal.Now.zonedDateTimeISO();
  }
  if ('number' === typeof input) {
    return fromEpoch(input);
  }
  return fromEpoch(new Date(String(input)).getTime());
}

/**
 * Moment instance. Create it through `moment()`, not directly.
 */
class Moment {

  /**
   * @param { Temporal.ZonedDateTime | null } date `null` creates an invalid instance
   * @param { string } locale locale key
   */
  constructor(date, locale = globalLocale) {
    this._isAMomentObject = true;
    this._ms              = date?.epochMilliseconds ?? NaN;
    this._locale          = locale;
  }

  /** @returns { Temporal.ZonedDateTime | null } current value, `null` when invalid */
  _z() {
    return fromEpoch(this._ms);
  }

  /** Replace the current value with `fn(zonedDateTime)` (no-op when invalid, invalidates on errors) */
  _set(fn) {
    const date = this._z();
    if (date) {
      this._ms = attempt(() => fn(date).epochMilliseconds) ?? NaN;
    }
    return this;
  }

  /** Shared getter/setter: no args → read the unit, otherwise set it and return `this` */
  _access(name, args) {
    const date = this._z();
    if (!args.length) {
      return (date && GETTERS[name](date)) ?? NaN;
    }
    return this._set(z => SETTERS[name](z.toPlainDateTime(), Math.trunc(Number(args[0]))).toZonedDateTime(z.timeZoneId));
  }

  /**
   * Add (`sign = 1`) or subtract (`sign = -1`) an amount; also accepts `{ days: 1, hours: 2 }`.
   * Calendar units are rounded to integers, time units to milliseconds (like Moment).
   */
  _add(amount, unit, sign) {
    if (amount && 'object' === typeof amount) {
      Object.entries(amount).forEach(([u, n]) => this._add(n, u, sign));
      return this;
    }
    // legacy signature: add('days', 1)
    const swapped = 'string' === typeof amount && isNaN(amount);
    const [n, u]  = [[amount, unit], [unit, amount]][Number(swapped)];
    const key     = unitOf(u);
    const value   = Number(n);
    if (!key || !Number.isFinite(value)) {
      return this;
    }
    const [field, factor] = CALENDAR[key] || ['milliseconds', MS[key]];
    return this._set(z => z.add({ [field]: absRound(value * factor * sign) }));
  }

  year(...args)         { return this._access('year', args); }
  years(...args)        { return this._access('year', args); }
  month(...args)        { return this._access('month', args); }
  months(...args)       { return this._access('month', args); }
  date(...args)         { return this._access('date', args); }
  dates(...args)        { return this._access('date', args); }
  day(...args)          { return this._access('day', args); }
  days(...args)         { return this._access('day', args); }
  hour(...args)         { return this._access('hour', args); }
  hours(...args)        { return this._access('hour', args); }
  minute(...args)       { return this._access('minute', args); }
  minutes(...args)      { return this._access('minute', args); }
  second(...args)       { return this._access('second', args); }
  seconds(...args)      { return this._access('second', args); }
  millisecond(...args)  { return this._access('millisecond', args); }
  milliseconds(...args) { return this._access('millisecond', args); }

  clone()       { return new Moment(this._z(), this._locale); }
  isValid()     { return Number.isFinite(this._ms); }
  valueOf()     { return this._ms; }
  unix()        { return Math.floor(this._ms / 1000); }
  toDate()      { return new Date(this._ms); }
  toISOString() { return (this.isValid() && this.toDate().toISOString()) || null; }
  toJSON()      { return this.toISOString(); }
  toString()    { return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ'); }
  utcOffset()   { return (this._z()?.offsetNanoseconds ?? NaN) / 6e10; }
  daysInMonth() { return this._z()?.daysInMonth ?? NaN; }
  localeData()  { return localeData(this._locale); }

  /** Get the locale key, or set it (unsupported keys are ignored) and return `this` */
  locale(key) {
    if (undefined === key) {
      return this._locale;
    }
    this._locale = resolveLocale(key, this._locale);
    return this;
  }

  /**
   * @param { string } [format] Moment format string (defaults to `moment.defaultFormat`)
   *
   * @returns { string } formatted date, or `'Invalid date'`
   */
  format(format) {
    const date = this._z();
    if (!date) {
      return 'Invalid date';
    }
    const locale   = this.localeData();
    const expanded = expandFormat(format || moment.defaultFormat, locale);
    return expanded.replace(TOKENS, (token, escaped) => {
      if (undefined !== escaped) {
        return escaped;
      }
      return String(FORMATTERS[token]?.(date, locale, expanded) ?? token);
    });
  }

  add(amount, unit)      { return this._add(amount, unit, 1); }
  subtract(amount, unit) { return this._add(amount, unit, -1); }

  startOf(unit) {
    const fn = START_OF[unitOf(unit)];
    if (!fn) {
      return this;
    }
    return this._set(z => fn(z, this.localeData()));
  }

  /** Last millisecond of `unit` (start of the next one minus 1 ms) */
  endOf(unit) {
    if (!START_OF[unitOf(unit)]) {
      return this;
    }
    return this.startOf(unit).add(1, unit).subtract(1, 'ms');
  }

  /**
   * Difference `this - input` in `unit` (default milliseconds), truncated towards zero unless `asFloat`.
   * Months, quarters and years use calendar months, like Moment.
   *
   * @returns { number } `NaN` when either date is invalid
   */
  diff(input, unit, asFloat) {
    const other = moment(input);
    const key   = unitOf(unit) || 'millisecond';
    if (!this.isValid() || !other.isValid()) {
      return NaN;
    }
    const months = ({ year: 12, quarter: 3, month: 1 })[key];
    // calendar days/weeks ignore DST shifts
    const zone   = (({ day: 1, week: 1 })[key] && (other.utcOffset() - this.utcOffset()) * 6e4) || 0;
    const result = [
      () => (this._ms - other._ms - zone) / (MS[key] || CALENDAR[key][1] * 864e5),
      () => other._z().until(this._z(), { largestUnit: 'month' }).total({ unit: 'month', relativeTo: other._z() }) / months,
    ][Number(Boolean(months))]();
    return (asFloat && result) || Math.trunc(result);
  }

  // comparisons accept any `moment()` input and an optional granularity unit (eg. `'day'`); invalid dates → `false`

  isBefore(input, unit) {
    const other = moment(input);
    return this.isValid() && other.isValid() && this.clone().endOf(unit || 'ms').valueOf() < other.valueOf();
  }

  isAfter(input, unit) {
    const other = moment(input);
    return this.isValid() && other.isValid() && other.valueOf() < this.clone().startOf(unit || 'ms').valueOf();
  }

  isSame(input, unit) {
    const other = moment(input).valueOf();
    return this.isValid() && this.clone().startOf(unit || 'ms').valueOf() <= other && other <= this.clone().endOf(unit || 'ms').valueOf();
  }

  isSameOrBefore(input, unit) { return this.isSame(input, unit) || this.isBefore(input, unit); }
  isSameOrAfter(input, unit)  { return this.isSame(input, unit) || this.isAfter(input, unit); }

}

/**
 * Shared implementation of `moment.min` / `moment.max`: accepts an array or a list of moments.
 * An invalid moment wins (like Moment), no arguments → now.
 */
function pick(args, method) {
  const list = args.flat().map(m => (isMoment(m) && m) || moment(m));
  return list.reduce((res, m) => ((!m.isValid() || m[method](res)) && m) || res, list[0]) || moment();
}

/** Also true for instances created by the original Moment library (eg. bundled by plugins) */
function isMoment(obj) {
  return obj instanceof Moment || Boolean(obj?._isAMomentObject);
}

/**
 * Drop-in replacement of `moment(input, format, locale, strict)`.
 *
 * @param { * } [input] ISO string, string to parse with `format`, `Date`, epoch ms, array, object or moment (default: now)
 * @param { string | string[] | Function } [format] Moment format(s) or `moment.ISO_8601`; the first matching one wins
 * @param { string | boolean } [locale] locale key used for parsing (or `strict` when boolean)
 * @param { boolean } [strict] require an exact match of `format`
 *
 * @returns { Moment } a new (possibly invalid) instance
 *
 * @example
 * moment('2020-01-05').add(1, 'month').format('L');            // "02/05/2020"
 * moment('05/01/2020', 'DD/MM/YYYY', true).isValid();           // true
 * moment().locale('it').format('dddd D MMMM YYYY');             // "venerdì 2 ottobre 2026"
 */
export function moment(input, format, locale, strict) {
  const isStrict = [strict, locale][Number('boolean' === typeof locale)];
  const key      = resolveLocale(('string' === typeof locale && locale) || undefined, globalLocale);
  if (isMoment(input)) {
    return new Moment(fromEpoch(Number(input.valueOf())), resolveLocale(input.locale(), key));
  }
  return new Moment(toZonedDateTime(input, format, localeData(key), isStrict), key);
}

Object.assign(moment, {
  fn:            Moment.prototype,
  defaultFormat: 'YYYY-MM-DDTHH:mm:ssZ',
  ISO_8601,
  isMoment,
  isDate:        obj => obj instanceof Date,
  now:           () => Date.now(),
  unix:          seconds => moment(seconds * 1000),
  invalid:       () => new Moment(null),
  min:           (...args) => pick(args, 'isBefore'),
  max:           (...args) => pick(args, 'isAfter'),
  localeData,
  locale(key) {
    if (undefined !== key) {
      globalLocale = resolveLocale(key, globalLocale);
    }
    return globalLocale;
  },
});
