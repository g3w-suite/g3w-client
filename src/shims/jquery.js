/**
 * @file jQuery v2.2 compatible subset built on native DOM APIs.
 *
 * Replaces the `jquery` dependency while keeping `window.$` / `window.jQuery`
 * working for core components, shims (select2, modal, datetimepicker) and plugins.
 *
 * ## Supported API
 *
 * - factory: `$(selector, context?)`, `$(html)`, `$(element | document | window | array | jQuery)`, `$(fn)` (DOM ready)
 * - collection: `length`, `[i]`, `each`, `map`, `toArray`, `get`, `eq`, `first`, `last`, `slice`, `index`, `is`, `filter`, `not`, `add`, `end`, iteration
 * - traversal: `find`, `parent`, `parents`, `closest`, `children`, `siblings`, `next`, `prev`, `contents`
 * - manipulation: `append`, `prepend`, `before`, `after`, `appendTo`, `prependTo`, `html`, `text`, `empty`, `remove`, `detach`, `clone`, `replaceWith`
 * - attributes: `attr`, `removeAttr`, `prop`, `val`, `addClass`, `removeClass`, `toggleClass`, `hasClass`
 * - css: `css`, `show`, `hide`, `toggle`, `width`, `height`, `innerWidth`, `innerHeight`, `outerWidth`, `outerHeight`, `offset`, `position`, `scrollTop`, `scrollLeft`
 * - effects (instant, no animation): `fadeIn`, `fadeOut`, `fadeToggle`, `slideUp`, `slideDown`, `slideToggle`, `animate`
 * - data: `data`, `removeData`, `$.data`, `$.removeData`, `$.hasData` (`data-*` attributes are parsed like jQuery)
 * - events: `on`, `one`, `off`, `bind`, `unbind`, `trigger`, `triggerHandler`, `ready` and shorthands (`click`, `change`, `keyup`, ...),
 *   with namespaces (`click.ns`), delegation (`on(type, selector, fn)`), event data and `$.Event`
 * - utilities: `$.fn`, `$.extend`, `$.each`, `$.map`, `$.grep`, `$.inArray`, `$.merge`, `$.makeArray`, `$.isArray`, `$.isFunction`,
 *   `$.isPlainObject`, `$.isEmptyObject`, `$.isNumeric`, `$.isWindow`, `$.type`, `$.trim`, `$.noop`, `$.now`, `$.proxy`,
 *   `$.contains`, `$.parseJSON`, `$.parseHTML`, `$.param`
 * - async: `$.Deferred`, `$.when` (jQuery 2 semantics: synchronous callbacks), `$.ajax`, `$.ajaxSetup`, `$.get`, `$.post`, `$.getJSON`
 *
 * Not supported: Sizzle-only selectors (eg. `:visible`, `:eq()`), real animations, `$.event.special`, `$.cssHooks`, JSONP, script `dataType`.
 *
 * @since 4.2.0
 */

/** Per-object state: `data` (`.data()`), `events` (handlers by type), `listener` (native bridge) */
const STORE = new WeakMap();

/** Type of the event currently triggered by `.trigger()` default action (eg. `elem.focus()`): skip its native echo */
let triggered = '';

let guid = 0;

/** Properties proxied from native events to `$.Event` objects */
const EVENT_PROPS = [
  'altKey', 'bubbles', 'button', 'buttons', 'cancelable', 'changedTouches', 'char', 'charCode', 'clientX', 'clientY', 'code',
  'ctrlKey', 'detail', 'eventPhase', 'key', 'keyCode', 'metaKey', 'offsetX', 'offsetY', 'pageX', 'pageY', 'pointerId',
  'pointerType', 'relatedTarget', 'screenX', 'screenY', 'shiftKey', 'targetTouches', 'toElement', 'touches', 'view', 'which',
];

/** CSS properties set without "px" when given as numbers */
const UNITLESS = ['columnCount', 'fillOpacity', 'flex', 'flexGrow', 'flexShrink', 'fontWeight', 'lineHeight', 'opacity', 'order', 'orphans', 'widows', 'zIndex', 'zoom'];

const SHORTHANDS = [
  'blur', 'focus', 'focusin', 'focusout', 'resize', 'scroll', 'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'mouseover',
  'mouseout', 'mouseenter', 'mouseleave', 'change', 'select', 'submit', 'keydown', 'keypress', 'keyup', 'contextmenu',
];

const isFunction = obj => 'function' === typeof obj;
const isWindow   = obj => null != obj && obj === obj.window;
const isNode     = obj => Boolean(obj?.nodeType);
const camelCase  = str => String(str).replace(/-([\da-z])/gi, (_, c) => c.toUpperCase());
const hyphenate  = str => String(str).replace(/[A-Z]/g, c => '-' + c.toLowerCase());
const words      = str => String(str ?? '').match(/\S+/g) || [];
const px         = (name, value) => String(value) + ['', 'px'][Number('number' === typeof value && !UNITLESS.includes(camelCase(name)))];
const filtered   = (collection, selector) => (selector && collection.filter(selector)) || collection;

function isPlainObject(obj) {
  const proto = obj && '[object Object]' === Object.prototype.toString.call(obj) && Object.getPrototypeOf(obj);
  return null === proto || Object.prototype === proto;
}

function isArrayLike(obj) {
  return Array.isArray(obj) || (null != obj && 'object' === typeof obj && 'number' === typeof obj.length && !isWindow(obj) && !isNode(obj));
}

function store(obj) {
  if (!STORE.has(obj)) {
    STORE.set(obj, { data: {}, events: {} });
  }
  return STORE.get(obj);
}

/** jQuery rules for `data-*` attribute values: booleans, null, numbers and JSON */
function parseData(value) {
  const special = { true: true, false: false, null: null };
  if ('string' !== typeof value) {
    return value;
  }
  if (Object.hasOwn(special, value)) {
    return special[value];
  }
  if (String(Number(value)) === value) {
    return Number(value);
  }
  if (/^(?:\{[\w\W]*\}|\[[\w\W]*\])$/.test(value)) {
    try { return JSON.parse(value); } catch (e) { return value; }
  }
  return value;
}

function parseHTML(html) {
  const template = document.createElement('template');
  template.innerHTML = String(html);
  return Array.from(template.content.childNodes);
}

/** Native `querySelectorAll` with Sizzle-like tolerance for `#ids` starting with digits and relative (`> child`) selectors */
function query(selector, context) {
  const sel = String(selector).trim().replace(/^>/, ':scope >');
  try {
    return Array.from(context.querySelectorAll(sel));
  } catch (e) {
    return Array.from(context.querySelectorAll(sel.replace(/#([\w-]+)/g, (_, id) => '#' + CSS.escape(id))));
  }
}

/** Sort nodes in document order and remove duplicates (like `jQuery.uniqueSort`) */
function unique(nodes) {
  const list = Array.from(new Set(nodes));
  if (list.every(isNode)) {
    list.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING) - 1);
  }
  return list;
}

function toNodes(selector, context) {
  if (!selector) {
    return [];
  }
  if ('string' === typeof selector && '<' === selector.trim()[0]) {
    return parseHTML(selector.trim());
  }
  if ('string' === typeof selector && /^#[\w-]+$/.test(selector) && !context) {
    return [document.getElementById(selector.slice(1))].filter(Boolean);
  }
  if ('string' === typeof selector) {
    return unique(jQuery(context || document).toArray().flatMap(ctx => query(selector, ctx)));
  }
  if (selector instanceof jQuery) {
    return selector.toArray();
  }
  if (isArrayLike(selector)) {
    return Array.from(selector);
  }
  return [selector];
}

/** Nodes to insert from `.append()` like arguments (HTML strings, nodes, jQuery objects, arrays) */
function toInsert(args) {
  return args.flat().flatMap(arg => {
    if (null == arg || false === arg) {
      return [];
    }
    if ('string' === typeof arg || 'number' === typeof arg) {
      return parseHTML(arg);
    }
    return toNodes(arg);
  });
}

/** Insert content into each element, cloning it for all but the last one (like jQuery) */
function insert(collection, args, method) {
  const last = collection.length - 1;
  return collection.each(function(i) {
    const nodes = toInsert(args);
    this[method](...nodes.map(node => [node.cloneNode(true), node][Number(i === last)]));
  });
}

/* ------------------------------------------------------------------------------------------------
 * Events
 * --------------------------------------------------------------------------------------------- */

class JQEvent {

  /**
   * @param { string | Event } src event type or native event to wrap
   * @param { object } [props] extra properties (eg. `{ params }` for select2 events)
   */
  constructor(src, props) {
    this.namespaces          = [];
    this.namespace           = '';
    this._defaultPrevented   = false;
    this._propagationStopped = false;
    this._immediateStopped   = false;
    this.timeStamp           = Date.now();
    this.type                = src;
    this[jQuery.expando]     = true;

    if (src && 'string' !== typeof src) {
      this.originalEvent     = src;
      this.type              = src.type;
      this.target            = src.target;
      this.timeStamp         = src.timeStamp;
      this._defaultPrevented = Boolean(src.defaultPrevented);
      EVENT_PROPS.forEach(p => Object.defineProperty(this, p, { get: () => src[p], configurable: true, enumerable: true }));
    }

    Object.assign(this, props);
  }

  preventDefault() {
    this._defaultPrevented = true;
    this.originalEvent?.preventDefault();
  }

  stopPropagation() {
    this._propagationStopped = true;
    this.originalEvent?.stopPropagation();
  }

  stopImmediatePropagation() {
    this._immediateStopped = true;
    this.stopPropagation();
    this.originalEvent?.stopImmediatePropagation();
  }

  isDefaultPrevented()            { return this._defaultPrevented; }
  isPropagationStopped()          { return this._propagationStopped; }
  isImmediatePropagationStopped() { return this._immediateStopped; }

}

/** `'click.a.b keyup'` → `[{ type: 'click', namespaces: ['a', 'b'] }, { type: 'keyup', namespaces: [] }]` */
function parseTypes(types) {
  return words(types).map(t => {
    const [type, ...namespaces] = t.split('.');
    return { type, namespaces: namespaces.filter(Boolean).sort() };
  });
}

function addEvent(node, types, selector, data, fn, one) {
  parseTypes(types).filter(t => t.type).forEach(({ type, namespaces }) => {
    const s = store(node);
    fn.guid ||= ++guid;
    s.events[type] ||= [];
    s.events[type].push({ type, namespaces, selector, data, handler: fn, guid: fn.guid, one });
    s.listener ||= e => triggered !== e.type && dispatch(node, new JQEvent(e));
    if (1 === s.events[type].length && node.addEventListener) {
      node.addEventListener(type, s.listener);
    }
  });
}

function removeEvent(node, types, selector, fn) {
  const s = STORE.get(node);
  if (!s) {
    return;
  }
  const list = [parseTypes(types), [{ type: '', namespaces: [] }]][Number(!types)];
  list.forEach(({ type, namespaces }) => {
    Object.keys(s.events).filter(t => !type || t === type).forEach(t => {
      s.events[t] = s.events[t].filter(h => !(
        namespaces.every(ns => h.namespaces.includes(ns)) &&
        (!fn || h.guid === fn.guid) &&
        (!selector || h.selector === selector || ('**' === selector && h.selector))
      ));
      if (!s.events[t].length) {
        node.removeEventListener?.(t, s.listener);
        delete s.events[t];
      }
    });
  });
}

/** Run jQuery handlers bound on `node` (delegated ones first, from the event target upwards) */
function dispatch(node, event, extra = []) {
  const handlers  = STORE.get(node)?.events[event.type] || [];
  const delegated = handlers.filter(h => h.selector);
  const queue     = [];

  for (let cur = event.target; delegated.length && cur && cur !== node && 1 === cur.nodeType; cur = cur.parentNode) {
    const matches = delegated.filter(h => cur.matches(h.selector) && !('click' === event.type && cur.disabled));
    if (matches.length) {
      queue.push({ elem: cur, handlers: matches });
    }
  }
  queue.push({ elem: node, handlers: handlers.filter(h => !h.selector) });

  event.delegateTarget = node;

  for (const { elem, handlers } of queue) {
    if (event.isPropagationStopped()) {
      break;
    }
    event.currentTarget = elem;
    for (const h of handlers) {
      if (event.isImmediatePropagationStopped()) {
        break;
      }
      if (!event.namespaces.every(ns => h.namespaces.includes(ns))) {
        continue;
      }
      if (h.one) {
        removeEvent(node, h.type, h.selector, h.handler);
      }
      event.handleObj = h;
      event.data      = h.data;
      const result    = h.handler.apply(elem, [event, ...extra]);
      if (undefined !== result) {
        event.result = result;
      }
      if (false === result) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }
  return event.result;
}

function toEvent(event) {
  if (event instanceof JQEvent) {
    return event;
  }
  if (event && 'object' === typeof event) {
    return new JQEvent(event.type, event);
  }
  return new JQEvent(String(event));
}

/** jQuery `trigger`: run jQuery and inline (`onclick`) handlers along the parents path, then the native default action */
function trigger(elem, eventOrType, extra, onlyHandlers) {
  const event                = toEvent(eventOrType);
  const [type, ...namespaces] = event.type.split('.');
  event.type       = type;
  event.namespaces = namespaces.filter(Boolean).sort();
  event.namespace  = event.namespaces.join('.');
  event.result     = undefined;
  event.target   ||= elem;

  const data = [].concat(extra ?? []);
  const path = [elem];
  for (let cur = elem.parentNode; !onlyHandlers && cur; cur = cur.parentNode) {
    path.push(cur);
  }
  if (!onlyHandlers && 9 === path.at(-1)?.nodeType) {
    path.push(path.at(-1).defaultView || window);
  }

  for (const cur of path) {
    if (event.isPropagationStopped()) {
      break;
    }
    dispatch(cur, event, data);
    const inline = !onlyHandlers && isNode(cur) && cur['on' + type];
    if (isFunction(inline) && false === inline.apply(cur, [event, ...data])) {
      event.preventDefault();
    }
  }

  const action = !onlyHandlers && !event.isDefaultPrevented() && isNode(elem) && isFunction(elem[type]) && !('click' === type && 'A' === elem.nodeName);
  if (action) {
    const inline = elem['on' + type];
    elem['on' + type] = null;
    triggered = type;
    try { elem[type](); } finally { triggered = ''; elem['on' + type] = inline; }
  }

  return event.result;
}

/* ------------------------------------------------------------------------------------------------
 * Deferred
 * --------------------------------------------------------------------------------------------- */

/**
 * jQuery 2 Deferred: callbacks run synchronously, `then()` keeps the resolve/reject branch of the returned value.
 */
function Deferred(func) {
  const lists    = { resolve: [], reject: [], notify: [] };
  const memory   = {};
  const STATES   = { resolve: 'resolved', reject: 'rejected' };
  const METHODS  = { resolve: 'done', reject: 'fail', notify: 'progress' };
  let state      = 'pending';

  const add = (action, fns) => {
    fns.flat(Infinity).filter(isFunction).forEach(fn => {
      lists[action].push(fn);
      if (memory[action]) {
        fn.apply(memory[action][0], memory[action][1]);
      }
    });
  };

  const fire = (action, context, args) => {
    if ('pending' !== state) {
      return;
    }
    memory[action] = [context, Array.from(args)];
    state          = STATES[action] || state;
    lists[action].slice().forEach(fn => fn.apply(context, Array.from(args)));
  };

  const promise = {
    state:    () => state,
    done(...fns)     { add('resolve', fns); return this; },
    fail(...fns)     { add('reject', fns);  return this; },
    progress(...fns) { add('notify', fns);  return this; },
    always(...fns)   { add('resolve', fns); add('reject', fns); return this; },
    then(...fns) {
      return Deferred(next => {
        ['resolve', 'reject', 'notify'].forEach((action, i) => {
          const fn = fns[i];
          add(action, [function(...args) {
            const returned = isFunction(fn) && fn.apply(this, args);
            if (returned && isFunction(returned.promise)) {
              returned.promise().progress(next.notify).done(next.resolve).fail(next.reject);
              return;
            }
            next[action + 'With'](this, [args, [returned]][Number(isFunction(fn))]);
          }]);
        });
      }).promise();
    },
    catch(fn) { return this.then(null, fn); },
    promise(obj) {
      if (null == obj) {
        return promise;
      }
      return Object.assign(obj, promise);
    },
  };
  promise.pipe = promise.then;

  const deferred = promise.promise({});
  Object.keys(METHODS).forEach(action => {
    deferred[action + 'With'] = (context, args = []) => { fire(action, context, args); return deferred; };
    deferred[action]          = function(...args) { fire(action, [this, promise][Number(this === deferred)], args); return deferred; };
  });

  if (func) {
    func.call(deferred, deferred);
  }
  return deferred;
}

function when(...subs) {
  if (1 === subs.length && isFunction(subs[0]?.promise)) {
    return subs[0].promise();
  }
  const master  = Deferred();
  const values  = [];
  let remaining = subs.length;
  if (!remaining) {
    master.resolve();
  }
  subs.forEach((sub, i) => {
    const resolve = (...args) => {
      values[i] = [args, args[0]][Number(args.length <= 1)];
      remaining -= 1;
      if (!remaining) {
        master.resolveWith(undefined, values);
      }
    };
    if (sub && isFunction(sub.promise)) {
      sub.promise().done(resolve).fail(master.reject).progress(master.notify);
      return;
    }
    resolve(sub);
  });
  return master.promise();
}

/* ------------------------------------------------------------------------------------------------
 * Ajax
 * --------------------------------------------------------------------------------------------- */

const ajaxSettings = {
  url:         location.href,
  type:        'GET',
  async:       true,
  processData: true,
  contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
};

const ACCEPTS = {
  json: 'application/json, text/javascript, */*; q=0.01',
  text: 'text/plain, */*; q=0.01',
  html: 'text/html, */*; q=0.01',
  xml:  'application/xml, text/xml, */*; q=0.01',
};

/** Serialize an object or a form-like array (`[{ name, value }]`) into a query string */
function param(obj, traditional) {
  const parts = [];
  const add   = (key, value) => {
    const v = [() => value, value][Number(isFunction(value))]();
    parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(v ?? ''));
  };
  const build = (prefix, value) => {
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        const nested = v && 'object' === typeof v;
        build([[`${prefix}[]`, `${prefix}[${i}]`][Number(Boolean(nested))], prefix][Number(Boolean(traditional))], v);
      });
      return;
    }
    if (!traditional && value && 'object' === typeof value) {
      Object.keys(value).forEach(k => build(`${prefix}[${k}]`, value[k]));
      return;
    }
    add(prefix, value);
  };
  if (Array.isArray(obj) && obj.every(o => o && 'name' in o)) {
    obj.forEach(o => add(o.name, o.value));
    return parts.join('&').replace(/%20/g, '+');
  }
  Object.keys(obj || {}).forEach(k => build(k, obj[k]));
  return parts.join('&').replace(/%20/g, '+');
}

function ajax(url, options) {
  const s = Object.assign({}, ajaxSettings, ('object' === typeof url && url) || options || {});
  s.url   = [s.url, url][Number('string' === typeof url)];
  s.type  = String(s.method || s.type).toUpperCase();

  const deferred = Deferred();
  const xhr      = new XMLHttpRequest();
  const headers  = {};
  const context  = s.context || s;
  const bodyless = ['GET', 'HEAD'].includes(s.type);
  const sameOrigin = new URL(s.url, location.href).origin === location.origin;
  let aborted    = '';

  const jqXHR = deferred.promise({
    readyState: 0,
    status:     0,
    statusText: '',
    setRequestHeader(name, value)  { headers[name] = value; return jqXHR; },
    getResponseHeader: name => xhr.getResponseHeader(name),
    getAllResponseHeaders: () => xhr.getAllResponseHeaders(),
    overrideMimeType: type => xhr.overrideMimeType(type),
    abort(text = 'canceled') { aborted = text; xhr.abort(); return jqXHR; },
  });
  jqXHR.success  = jqXHR.done;
  jqXHR.error    = jqXHR.fail;
  jqXHR.complete = jqXHR.always;
  jqXHR.done(s.success).fail(s.error);

  let data = s.data;
  if (s.processData && data && 'string' !== typeof data && !(data instanceof FormData) && !(data instanceof Blob)) {
    data = param(data, s.traditional);
  }

  let target = s.url;
  if (bodyless && data) {
    target += ['?', '&'][Number(target.includes('?'))] + data;
    data = null;
  }
  if (bodyless && false === s.cache) {
    target += ['?', '&'][Number(target.includes('?'))] + '_=' + Date.now();
  }

  if (data && false !== s.contentType && !(data instanceof FormData)) {
    headers['Content-Type'] = s.contentType;
  }
  if (sameOrigin) {
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }
  headers.Accept = ACCEPTS[s.dataType] || '*/*';
  Object.assign(headers, s.headers);

  const finish = (textStatus, error) => {
    jqXHR.readyState   = 4;
    jqXHR.status       = xhr.status;
    jqXHR.statusText   = aborted || xhr.statusText || textStatus;
    jqXHR.responseText = xhr.responseText;
    const ok   = !error && ((xhr.status >= 200 && xhr.status < 300) || 304 === xhr.status);
    const type = s.dataType || [(xhr.getResponseHeader('Content-Type') || '').includes('json') && 'json', 'text'].find(Boolean);
    let result = xhr.responseText;
    let status = [error || 'error', ({ 204: 'nocontent', 304: 'notmodified' })[xhr.status] || 'success'][Number(ok)];
    if ('json' === type && ok && result) {
      try { result = jqXHR.responseJSON = JSON.parse(result); } catch (e) { status = 'parsererror'; error = e; }
    }
    if ('xml' === type) {
      result = xhr.responseXML;
    }
    if (['success', 'nocontent', 'notmodified'].includes(status)) {
      deferred.resolveWith(context, [result, status, jqXHR]);
    }
    if (!['success', 'nocontent', 'notmodified'].includes(status)) {
      deferred.rejectWith(context, [jqXHR, status, error || jqXHR.statusText]);
    }
    s.complete?.call(context, jqXHR, status);
  };

  if (s.beforeSend && false === s.beforeSend.call(context, jqXHR, s)) {
    aborted = 'canceled';
    deferred.rejectWith(context, [jqXHR, 'canceled', 'canceled']);
    return jqXHR;
  }

  xhr.open(s.type, target, false !== s.async, s.username, s.password);
  Object.entries(headers).forEach(([name, value]) => xhr.setRequestHeader(name, value));
  Object.assign(xhr, s.xhrFields);
  if (false !== s.async) {
    xhr.timeout = s.timeout || 0; // not allowed on synchronous requests
  }
  xhr.onload    = () => finish();
  xhr.onerror   = () => finish('error', 'error');
  xhr.ontimeout = () => finish('timeout', 'timeout');
  xhr.onabort   = () => finish('abort', aborted);
  jqXHR.readyState = 1;
  xhr.send(data ?? null);
  return jqXHR;
}

/** `$.get` / `$.post` signature: (url, data?, success?, dataType?) */
function shortcut(method, dataType) {
  return (url, data, success, type) => {
    const shifted = isFunction(data);
    return ajax({
      url,
      type:     method,
      data:     [data, undefined][Number(shifted)],
      success:  [success, data][Number(shifted)],
      dataType: dataType || [type, success][Number(shifted)],
    });
  };
}

/* ------------------------------------------------------------------------------------------------
 * jQuery
 * --------------------------------------------------------------------------------------------- */

function jQuery(selector, context) {
  return new jQuery.fn.init(selector, context);
}

function ready(fn) {
  if ('loading' !== document.readyState) {
    setTimeout(() => fn.call(document, jQuery));
    return;
  }
  document.addEventListener('DOMContentLoaded', () => fn.call(document, jQuery), { once: true });
}

/** Getter/setter for `width` / `height` and their inner/outer variants */
function dimension(name, box) {
  const Name = name[0].toUpperCase() + name.slice(1);
  const [a, b] = ({ width: ['Left', 'Right'], height: ['Top', 'Bottom'] })[name];
  const sum = (cs, prop) => parseFloat(cs[prop + a] || 0) + parseFloat(cs[prop + b] || 0);
  return function(value, includeMargin) {
    const el = this[0];
    if (undefined !== value && 'boolean' !== typeof value) {
      return this.each(function() {
        const cs    = getComputedStyle(this);
        const extra = Number('border-box' === cs.boxSizing) * (sum(cs, 'padding') + sum(cs, 'border'));
        this.style[name] = px(name, [value, Number(value) + extra][Number('number' === typeof value || /^-?\d+(\.\d+)?$/.test(String(value)))]);
      });
    }
    if (isWindow(el)) {
      return el['inner' + Name];
    }
    if (9 === el?.nodeType) {
      return Math.max(el.body['scroll' + Name], el.documentElement['scroll' + Name], el.documentElement['client' + Name]);
    }
    if (!el) {
      return undefined;
    }
    const cs    = getComputedStyle(el);
    const outer = el.getBoundingClientRect()[name];
    const sizes = {
      content: outer - sum(cs, 'padding') - sum(cs, 'border'),
      inner:   outer - sum(cs, 'border'),
      outer:   outer + Number(true === value || true === includeMargin) * sum(cs, 'margin'),
    };
    return sizes[box];
  };
}

/** Getter/setter for `scrollTop` / `scrollLeft` */
function scroll(prop, axis) {
  return function(value) {
    const el = this[0];
    if (undefined === value) {
      return [el?.[prop], el?.['page' + axis + 'Offset']][Number(isWindow(el))];
    }
    return this.each(function() {
      if (isWindow(this)) {
        this.scrollTo({ [({ X: 'left', Y: 'top' })[axis]]: value });
        return;
      }
      this[prop] = value;
    });
  };
}

/** Instant effects: callbacks still run asynchronously, like the end of a jQuery animation */
function effect(method) {
  return function(...args) {
    const complete = args.find(isFunction);
    this[method]();
    if (complete) {
      setTimeout(() => this.each(function() { complete.call(this); }));
    }
    return this;
  };
}

jQuery.fn = jQuery.prototype = {

  constructor: jQuery,
  jquery:      '2.2.4',
  length:      0,

  // NB: a `function` (not a method shorthand) because it is used with `new`
  init: function(selector, context) {
    if (isFunction(selector)) {
      ready(selector);
      this[0]     = document;
      this.length = 1;
      return;
    }
    const nodes = toNodes(selector, context);
    nodes.forEach((node, i) => { this[i] = node; });
    this.length = nodes.length;
  },

  pushStack(nodes) {
    const ret      = jQuery(nodes);
    ret.prevObject = this;
    return ret;
  },

  end()                { return this.prevObject || jQuery(); },
  toArray()            { return Array.prototype.slice.call(this); },
  get(i)               { return [this.toArray(), this[(i < 0) * this.length + i]][Number(undefined !== i)]; },
  eq(i)                { return this.pushStack([this.get(i)].filter(Boolean)); },
  first()              { return this.eq(0); },
  last()               { return this.eq(-1); },
  slice(...args)       { return this.pushStack(this.toArray().slice(...args)); },

  each(fn) {
    for (let i = 0; i < this.length; i++) {
      if (false === fn.call(this[i], i, this[i])) {
        break;
      }
    }
    return this;
  },

  map(fn) {
    return this.pushStack(this.toArray().flatMap((el, i) => [fn.call(el, i, el)].flat().filter(v => null != v)));
  },

  index(elem) {
    const el = this[0];
    if (undefined === elem) {
      return [-1, Array.from(el?.parentNode?.children || []).indexOf(el)][Number(Boolean(el?.parentNode))];
    }
    return [this.toArray().indexOf(jQuery(elem)[0]), jQuery(elem).toArray().indexOf(el)][Number('string' === typeof elem)];
  },

  is(selector) {
    return this.toArray().some((el, i) => matches(el, i, selector));
  },

  filter(selector) {
    return this.pushStack(this.toArray().filter((el, i) => matches(el, i, selector)));
  },

  not(selector) {
    return this.pushStack(this.toArray().filter((el, i) => !matches(el, i, selector)));
  },

  add(selector, context) {
    return this.pushStack(unique([...this.toArray(), ...toNodes(selector, context)]));
  },

  /* traversal */

  find(selector) {
    return this.pushStack(unique(this.toArray().flatMap(el => query(selector, el))));
  },

  parent(selector) {
    return filtered(this.pushStack(unique(this.toArray().map(el => el.parentNode).filter(p => p && 11 !== p.nodeType))), selector);
  },

  parents(selector) {
    const list = [];
    this.each(function() {
      for (let cur = this.parentElement; cur; cur = cur.parentElement) {
        list.push(cur);
      }
    });
    return filtered(this.pushStack(Array.from(new Set(list))), selector);
  },

  closest(selector) {
    return this.pushStack(unique(this.toArray().map(el => el.closest?.(selector)).filter(Boolean)));
  },

  children(selector) {
    return filtered(this.pushStack(unique(this.toArray().flatMap(el => Array.from(el.children || [])))), selector);
  },

  contents() {
    return this.pushStack(unique(this.toArray().flatMap(el => Array.from(el.childNodes || []))));
  },

  siblings(selector) {
    return filtered(this.pushStack(unique(this.toArray().flatMap(el => Array.from(el.parentNode?.children || []).filter(s => s !== el)))), selector);
  },

  next(selector) {
    return filtered(this.pushStack(unique(this.toArray().map(el => el.nextElementSibling).filter(Boolean))), selector);
  },

  prev(selector) {
    return filtered(this.pushStack(unique(this.toArray().map(el => el.previousElementSibling).filter(Boolean))), selector);
  },

  /* manipulation */

  append(...args)  { return insert(this, args, 'append'); },
  prepend(...args) { return insert(this, args, 'prepend'); },
  before(...args)  { return insert(this, args, 'before'); },
  after(...args)   { return insert(this, args, 'after'); },

  appendTo(target)  { jQuery(target).append(this); return this; },
  prependTo(target) { jQuery(target).prepend(this); return this; },

  replaceWith(content) { return insert(this, [content], 'replaceWith'); },

  html(value) {
    if (undefined === value) {
      return this[0]?.innerHTML;
    }
    return this.each(function() {
      if ('string' === typeof value || 'number' === typeof value) {
        this.innerHTML = value;
        return;
      }
      jQuery(this).empty().append(value);
    });
  },

  text(value) {
    if (undefined === value) {
      return this.toArray().map(el => el.textContent).join('');
    }
    return this.each(function() { this.textContent = value; });
  },

  empty()        { return this.each(function() { this.replaceChildren?.(); }); },
  remove(sel)    { filtered(this, sel).each(function() { this.remove?.(); }); return this; },
  detach(sel)    { return this.remove(sel); },
  clone()        { return this.map(function() { return this.cloneNode(true); }); },

  /* attributes */

  attr(name, value) {
    if (name && 'object' === typeof name) {
      Object.entries(name).forEach(([k, v]) => this.attr(k, v));
      return this;
    }
    if (undefined === value) {
      return this[0]?.getAttribute?.(name) ?? undefined;
    }
    return this.each(function() {
      if (null === value) {
        this.removeAttribute(name);
        return;
      }
      this.setAttribute(name, value);
    });
  },

  removeAttr(names) {
    return this.each(function() { words(names).forEach(n => this.removeAttribute(n)); });
  },

  prop(name, value) {
    if (name && 'object' === typeof name) {
      Object.entries(name).forEach(([k, v]) => this.prop(k, v));
      return this;
    }
    if (undefined === value) {
      return this[0]?.[name];
    }
    return this.each(function() { this[name] = value; });
  },

  val(value) {
    const el = this[0];
    if (undefined === value && el && 'SELECT' === el.nodeName) {
      const values = Array.from(el.selectedOptions).map(o => o.value);
      return [values[0] ?? null, values][Number(el.multiple && values.length > 0)];
    }
    if (undefined === value) {
      return el?.value;
    }
    return this.each(function(i) {
      const v      = [value, isFunction(value) && value.call(this, i, jQuery(this).val())][Number(isFunction(value))];
      const values = [v].flat().map(x => String(x ?? ''));
      if ('SELECT' === this.nodeName) {
        Array.from(this.options).forEach(o => { o.selected = values.includes(o.value); });
        // single selects re-select the first option when all are deselected
        if (!Array.from(this.options).some(o => values.includes(o.value))) {
          this.selectedIndex = -1;
        }
        return;
      }
      if (['checkbox', 'radio'].includes(this.type) && Array.isArray(v)) {
        this.checked = values.includes(this.value);
        return;
      }
      this.value = values.join(',');
    });
  },

  addClass(value) {
    return this.each(function(i) {
      const v = [value, isFunction(value) && value.call(this, i, this.className)][Number(isFunction(value))];
      this.classList?.add(...words(v));
    });
  },

  removeClass(value) {
    return this.each(function(i) {
      if (undefined === value) {
        this.className = '';
        return;
      }
      const v = [value, isFunction(value) && value.call(this, i, this.className)][Number(isFunction(value))];
      this.classList?.remove(...words(v));
    });
  },

  toggleClass(value, state) {
    return this.each(function() {
      words(value).forEach(c => this.classList?.toggle(c, ...[[], [Boolean(state)]][Number('boolean' === typeof state)]));
    });
  },

  hasClass(name) {
    return this.toArray().some(el => el.classList?.contains(name));
  },

  /* css */

  css(name, value) {
    if (Array.isArray(name)) {
      return Object.fromEntries(name.map(n => [n, this.css(n)]));
    }
    if (name && 'object' === typeof name) {
      Object.entries(name).forEach(([k, v]) => this.css(k, v));
      return this;
    }
    if (undefined === value) {
      return this[0] && getComputedStyle(this[0]).getPropertyValue(hyphenate(name));
    }
    return this.each(function() {
      this.style.setProperty(hyphenate(name), [px(name, value), ''][Number(null === value || '' === value)]);
    });
  },

  show() {
    return this.each(function() {
      this.style.display = store(this).data.__olddisplay || '';
      if ('none' === getComputedStyle(this).display) {
        this.style.display = 'block';
      }
    });
  },

  hide() {
    return this.each(function() {
      const display = getComputedStyle(this).display;
      if ('none' !== display) {
        store(this).data.__olddisplay = this.style.display;
      }
      this.style.display = 'none';
    });
  },

  toggle(state) {
    return this.each(function() {
      const show = [('none' === getComputedStyle(this).display), Boolean(state)][Number('boolean' === typeof state)];
      jQuery(this)[['hide', 'show'][Number(show)]]();
    });
  },

  fadeIn:      effect('show'),
  fadeOut:     effect('hide'),
  fadeToggle:  effect('toggle'),
  slideDown:   effect('show'),
  slideUp:     effect('hide'),
  slideToggle: effect('toggle'),

  animate(props, ...args) {
    this.css(props);
    return effect('toArray').apply(this, args);
  },

  stop() { return this; },

  width:       dimension('width', 'content'),
  height:      dimension('height', 'content'),
  innerWidth:  dimension('width', 'inner'),
  innerHeight: dimension('height', 'inner'),
  outerWidth:  dimension('width', 'outer'),
  outerHeight: dimension('height', 'outer'),

  offset() {
    const rect = this[0]?.getBoundingClientRect();
    return rect && { top: rect.top + window.pageYOffset, left: rect.left + window.pageXOffset };
  },

  position() {
    const el = this[0];
    const cs = el && getComputedStyle(el);
    return el && { top: el.offsetTop - parseFloat(cs.marginTop || 0), left: el.offsetLeft - parseFloat(cs.marginLeft || 0) };
  },

  scrollTop:  scroll('scrollTop', 'Y'),
  scrollLeft: scroll('scrollLeft', 'X'),

  /* data */

  data(key, value) {
    const el = this[0];
    if (undefined === key) {
      const data = el && store(el).data;
      Object.entries(el?.dataset || {}).filter(([k]) => !(k in data)).forEach(([k, v]) => { data[k] = parseData(v); });
      return data;
    }
    if (key && 'object' === typeof key) {
      return this.each(function() { Object.assign(store(this).data, key); });
    }
    if (undefined === value) {
      const data = el && store(el).data;
      const name = camelCase(key);
      return [data?.[name] ?? data?.[key], parseData(el?.dataset?.[name])].find(v => undefined !== v);
    }
    return this.each(function() { store(this).data[camelCase(key)] = value; });
  },

  removeData(keys) {
    return this.each(function() {
      const data = store(this).data;
      words(keys).map(camelCase).forEach(k => delete data[k]);
      if (undefined === keys) {
        Object.keys(data).forEach(k => delete data[k]);
      }
    });
  },

  /* events */

  on(types, selector, data, fn, one) {
    if (types && 'object' === typeof types) {
      Object.entries(types).forEach(([type, handler]) => this.on(type, selector, data, handler, one));
      return this;
    }
    // shift arguments like jQuery: on(types, fn), on(types, selector, fn), on(types, data, fn)
    const shape = [null == data && null == fn, null == fn && 'string' === typeof selector, null == fn].findIndex(Boolean);
    const [sel, d, cb] = [
      [undefined, undefined, selector],
      [selector, undefined, data],
      [undefined, selector, data],
      [selector, data, fn],
    ][[shape, 3][Number(-1 === shape)]];
    const fun = [cb, () => false][Number(false === cb)];
    return this.each(function() { addEvent(this, types, sel ?? undefined, d, fun, one); });
  },

  one(types, selector, data, fn) {
    return this.on(types, selector, data, fn, true);
  },

  off(types, selector, fn) {
    if (types instanceof JQEvent) {
      return this.off(types.handleObj.namespaces.reduce((t, ns) => `${t}.${ns}`, types.handleObj.type), types.handleObj.selector, types.handleObj.handler);
    }
    if (types && 'object' === typeof types) {
      Object.entries(types).forEach(([type, handler]) => this.off(type, selector, handler));
      return this;
    }
    const handler = [fn, selector][Number(isFunction(selector))];
    const sel     = [selector, undefined][Number(isFunction(selector) || false === selector)];
    return this.each(function() { removeEvent(this, types, sel, handler); });
  },

  bind(types, data, fn)   { return this.on(types, null, data, fn); },
  unbind(types, fn)       { return this.off(types, null, fn); },

  trigger(event, data) {
    return this.each(function() { trigger(this, event, data); });
  },

  triggerHandler(event, data) {
    return this[0] && trigger(this[0], event, data, true);
  },

  ready(fn) {
    ready(fn);
    return this;
  },

};

jQuery.fn.init.prototype = jQuery.fn;

jQuery.fn[Symbol.iterator] = Array.prototype[Symbol.iterator];

SHORTHANDS.forEach(type => {
  jQuery.fn[type] = function(data, fn) {
    if (arguments.length) {
      return this.on(type, null, data, fn);
    }
    return this.trigger(type);
  };
});

function matches(el, i, selector) {
  if ('string' === typeof selector) {
    return 1 === el.nodeType && el.matches(selector);
  }
  if (isFunction(selector)) {
    return Boolean(selector.call(el, i, el));
  }
  return jQuery(selector).toArray().includes(el);
}

/**
 * `$.extend([deep], target, ...sources)`, with a single object it extends jQuery itself (or `$.fn`)
 */
function extend(...args) {
  const deep = true === args[0];
  const list = args.slice(Number('boolean' === typeof args[0]));
  if (1 === list.length) {
    list.unshift(this);
  }
  const target  = (list[0] && ('object' === typeof list[0] || isFunction(list[0])) && list[0]) || {};
  const sources = list.slice(1);

  sources.filter(src => null != src).forEach(src => {
    Object.keys(src).forEach(key => {
      const value = src[key];
      if (value === target || undefined === value) {
        return;
      }
      if (deep && (isPlainObject(value) || Array.isArray(value))) {
        const base  = target[key];
        const clone = [[], {}][Number(isPlainObject(value))];
        target[key] = extend(true, [clone, base][Number(Boolean(base) && Array.isArray(base) === Array.isArray(value) && 'object' === typeof base)], value);
        return;
      }
      target[key] = value;
    });
  });

  return target;
}

jQuery.fn.extend = extend;

Object.assign(jQuery, {
  expando: 'jQuery' + String(Math.random()).slice(2),
  extend,
  fn: jQuery.fn,
  Deferred,
  when,
  ajax,
  param,
  ajaxSetup:     options => Object.assign(ajaxSettings, options),
  ajaxSettings,
  get:           shortcut('GET'),
  post:          shortcut('POST'),
  getJSON:       (url, data, success) => shortcut('GET', 'json')(url, data, success),
  isArray:       Array.isArray,
  isFunction,
  isPlainObject,
  isWindow,
  isEmptyObject: obj => 0 === Object.keys(obj || {}).length,
  isNumeric:     obj => !Array.isArray(obj) && (obj - parseFloat(obj) + 1) >= 0,
  type:          obj => [Object.prototype.toString.call(obj).slice(8, -1).toLowerCase(), String(obj)][Number(null == obj)],
  trim:          str => String(str ?? '').trim(),
  noop:          () => {},
  now:           () => Date.now(),
  parseJSON:     JSON.parse,
  parseHTML:     html => parseHTML(html),
  contains:      (a, b) => a !== b && a.contains(b),
  inArray:       (value, arr, i) => Array.prototype.indexOf.call(arr || [], value, i),
  makeArray:     arr => Array.from(isArrayLike(arr) && arr || [arr].filter(v => null != v)),
  merge:         (first, second) => { Array.prototype.push.apply(first, Array.from(second)); return first; },
  grep:          (arr, fn, invert) => Array.from(arr).filter((v, i) => Boolean(fn(v, i)) !== Boolean(invert)),
  map:           (obj, fn) => Object.entries(obj || {}).flatMap(([k, v]) => [fn(v, [k, Number(k)][Number(isArrayLike(obj))])].flat()).filter(v => null != v),
  proxy:         (fn, context, ...args) => [(...a) => fn.apply(context, [...args, ...a]), (...a) => fn[context](...args, ...a)][Number('string' === typeof context)],
  data:          (el, key, value) => jQuery(el).data(key, value),
  removeData:    (el, key) => jQuery(el).removeData(key),
  hasData:       el => Boolean(STORE.get(el) && Object.keys(STORE.get(el).data).length),
  each(obj, fn) {
    const entries = [Object.entries(obj || {}), Array.from(obj || [], (v, i) => [i, v])][Number(isArrayLike(obj))];
    for (const [k, v] of entries) {
      if (false === fn.call(v, k, v)) {
        break;
      }
    }
    return obj;
  },
});

jQuery.Event = function(src, props) {
  return new JQEvent(src, props);
};
jQuery.Event.prototype = JQEvent.prototype;

export { jQuery };
