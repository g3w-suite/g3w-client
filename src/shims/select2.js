/**
 * @file jQuery "select2" plugin shim backed by the `<x-select>` custom element.
 *
 * Keeps the legacy select2 API used by core and plugins (eg. qprocessing) while
 * dropping the `select2` dependency:
 *
 * - `$(select).select2(options)` hides the native `<select>` and renders an `<x-select>` after it
 * - methods: `select2('open' | 'close' | 'destroy' | 'data' | 'val', value?)`
 * - `$(select).data('select2')` instance with `$element`, `$container`, `$selection`, `$dropdown`
 * - events (jQuery) on the `<select>`: `change`, `select2:select`, `select2:unselect`, `select2:open`, `select2:close`
 * - `$(select).val(value).trigger('change')` updates the rendered `<x-select>`
 * - options: `data`, `tags`, `placeholder`, `allowClear`, `minimumResultsForSearch`,
 *   `templateResult`, `templateSelection` (ignored: `width`, `dropdownParent`, `dropdownAutoWidth`)
 *
 * The native `<select>` remains the source of truth: any change to its options, `disabled`
 * or `multiple` attributes re-renders the `<x-select>`, which is never modified directly
 * by this file (only per-instance patches of its public API).
 *
 * @since 4.2.0
 */

/** select2 methods that return the jQuery collection (instead of their own result) */
const CHAINABLE = ['open', 'close', 'destroy'];

let uid = 0;

/**
 * Render select2 templates (`templateResult`, `templateSelection`) into `target`.
 * Strings are rendered as text (like select2 `escapeMarkup`), DOM nodes and jQuery objects as they are.
 */
function render(target, template, data) {
  const out = template(data);
  if (null === out || undefined === out) {
    return;
  }
  if (['string', 'number'].includes(typeof out)) {
    target.textContent = out;
    return;
  }
  target.replaceChildren(...$(out).toArray());
}

class Select2 {

  /**
   * @param { HTMLSelectElement } element
   * @param { object } options select2 options
   */
  constructor(element, options) {
    this.$element = $(element);
    // `undefined` options fall back to defaults (eg. `minimumResultsForSearch: undefined` from v-select2)
    this.options  = Object.assign(
      { minimumResultsForSearch: 0, placeholder: '', allowClear: false, tags: false },
      Object.fromEntries(Object.entries(options).filter(([, v]) => undefined !== v)),
    );

    (this.options.data || []).forEach(d => element.append(new Option(d.text ?? d.id, d.id ?? d.text, false, Boolean(d.selected))));

    element.setAttribute('data-select2-id', ++uid);
    element.setAttribute('aria-hidden', 'true');
    element.tabIndex = -1;

    this.$element.data('select2', this);
    // programmatic changes, eg. `$(select).val(value).trigger('change')`
    this.$element.on('change.select2', () => this._sync());

    this.observer = new MutationObserver(() => this._render());
    this.observer.observe(element, {
      childList:       true,
      subtree:         true,
      characterData:   true,
      attributes:      true,
      attributeFilter: ['disabled', 'multiple', 'selected', 'value', 'label'],
    });

    this._render();
  }

  get $container() { return $(this.xs); }
  get $selection() { return $(this.xs.trigger); }
  get $dropdown()  { return $(this.xs.container); }

  get _multiple() {
    return this.$element[0].multiple;
  }

  /** @returns { string[] } values currently selected in the native `<select>` */
  _values() {
    return Array.from(this.$element[0].selectedOptions).map(o => o.value);
  }

  /** @returns select2 data object of an `<option>` */
  _data(option) {
    return { id: option.value, text: option.text, element: option, selected: option.selected, disabled: option.disabled };
  }

  /** (Re)create the `<x-select>` that mirrors the native `<select>` */
  _render() {
    const element = this.$element[0];
    const old     = this.xs;
    const xs      = document.createElement('x-select');
    const min     = Number(this.options.minimumResultsForSearch);

    xs.className = old?.className || '';  // keep classes added through `$container` (eg. "input-error-validation")
    xs.classList.add('select2', 'select2-container');
    xs.toggleAttribute('multiple', element.multiple);
    xs.toggleAttribute('disabled', element.disabled);
    xs.toggleAttribute('searchable', min >= 0 && element.options.length >= min);
    xs.toggleAttribute('createTag', Boolean(this.options.tags));

    Array.from(element.options).forEach(option => {
      const opt = document.createElement('x-option');
      opt.setAttribute('value', option.value);
      opt.toggleAttribute('disabled', option.disabled);
      opt.textContent = option.text;
      if (this.options.templateResult) {
        render(opt, this.options.templateResult, this._data(option));
      }
      xs.append(opt);
    });

    // patch: x-select picks its initial value on its own (and multiple selections are toggled),
    // so the first `select()` call is replaced by a selection mirroring the native `<select>`
    const select = xs.select.bind(xs);
    let ready    = false;
    xs.select    = (opt, settings) => {
      if (!ready) {
        ready = true;
        this._init(xs, select);
        return;
      }
      select(opt, settings);
      this._decorate();
    };

    xs.addEventListener('change', e => {
      e.stopPropagation(); // the native `<select>` is the one that emits "change"
      this._onChange();
    });

    this.xs = xs;
    this.observer.takeRecords();

    if (old) {
      old.replaceWith(xs);
      return;
    }
    element.after(xs);
  }

  /** Initial selection and listeners of a newly connected `<x-select>` */
  _init(xs, select) {
    const values  = this._values();
    const options = Array.from(xs.container.querySelectorAll('x-option')).filter(o => values.includes(o.value));
    options.forEach(o => o.setAttribute('selected', ''));
    xs.selected_options = options;
    xs.setAttribute('value', values.join(','));
    select(undefined, { autoclose: false, emit: false });
    this._decorate();
    xs.container.addEventListener('toggle', e => this.$element.trigger(({ open: 'select2:open', closed: 'select2:close' })[e.newState]));
  }

  /** Apply `placeholder`, `templateSelection` and `allowClear` on the rendered selection */
  _decorate() {
    const xs       = this.xs;
    const selected = xs.selected_options;
    const empty    = !selected.length || (!this._multiple && '' === selected[0].value);

    if (empty && this.options.placeholder) {
      xs.content.textContent = this.options.placeholder.text ?? this.options.placeholder;
    }

    if (!empty && !this._multiple && this.options.templateSelection) {
      render(xs.content, this.options.templateSelection, this._data(this._option(selected[0].value)));
    }

    if (this.options.allowClear && !this._multiple) {
      const clear = xs.trigger.querySelector('.x-clear') || xs.trigger.insertBefore(Object.assign(document.createElement('span'), {
        className:   'x-clear',
        textContent: '×',
        title:       'Clear',
        onclick:     e => { e.stopPropagation(); this._clear(); },
      }), xs.trigger.lastElementChild);
      clear.hidden = empty;
    }
  }

  /** User changed the `<x-select>` selection: update the native `<select>` and emit select2 events */
  _onChange() {
    const element = this.$element[0];
    const before  = this._values();
    const after   = this.xs.selected_options.map(o => o.value);

    // new tags (`tags: true`) become native options, like select2 does
    after
      .filter(v => !Array.from(element.options).some(o => o.value === v))
      .forEach(v => {
        const option = new Option(v, v);
        option.setAttribute('data-select2-tag', 'true');
        element.append(option);
      });
    Array.from(element.options).forEach(o => { o.selected = after.includes(o.value); });
    this.observer.takeRecords();

    this.$element.trigger('change');

    // a single select emits "select" even when picking the current value (like select2)
    [after.filter(v => !before.includes(v)), after][Number(!this._multiple)].forEach(v => this._trigger('select', v));
    before.filter(v => this._multiple && !after.includes(v)).forEach(v => this._trigger('unselect', v));
  }

  _trigger(type, value) {
    this.$element.trigger($.Event(`select2:${type}`, { params: { data: this._data(this._option(value)) } }));
  }

  /** @returns { HTMLOptionElement } native option by value (or a detached one) */
  _option(value) {
    return Array.from(this.$element[0].options).find(o => o.value === value) || new Option(value, value);
  }

  /** "allowClear" button: like select2, emit "unselect" for each value and then "change" */
  _clear() {
    const element = this.$element[0];
    Array.from(element.selectedOptions).forEach(o => this._trigger('unselect', o.value));
    element.selectedIndex = -1;
    this.$element.trigger('change');
  }

  /** Re-render when the native `<select>` selection differs from the `<x-select>` one */
  _sync() {
    const values   = this._values();
    const rendered = (this.xs.selected_options || []).map(o => o.value);
    const same     = values.length === rendered.length && values.every(v => rendered.includes(v));
    if (!same) {
      this._render();
    }
  }

  open() {
    if (this.xs.container && !this.xs.isOpen) {
      this.xs.open();
    }
  }

  close() {
    if (this.xs.isOpen) {
      this.xs.close();
    }
  }

  /** @returns { object[] } select2 data of the selected options */
  data() {
    return Array.from(this.$element[0].selectedOptions).map(o => this._data(o));
  }

  /** Legacy select2 v3 API: get or set the value */
  val(...args) {
    if (!args.length) {
      return this.$element.val();
    }
    this.$element.val(args[0]).trigger('change');
  }

  destroy() {
    const element = this.$element[0];
    this.observer.disconnect();
    this.xs.remove();
    this.$element.off('.select2').removeData('select2');
    element.removeAttribute('data-select2-id');
    element.removeAttribute('aria-hidden');
    element.removeAttribute('tabindex');
  }

}

/**
 * Install the `$.fn.select2` shim (same signature as `require('select2')(jQuery)`)
 *
 * @param { jQuery } $
 */
export function select2($) {

  $.fn.select2 = function(options, ...args) {
    let result = this;
    this.each(function() {
      const instance = $(this).data('select2');

      if ('string' !== typeof options) {
        instance?.destroy();
        new Select2(this, options || {});
        return;
      }

      if (!instance?.[options]) {
        console.error(`The select2('${options}') method was called on an element that is not using Select2.`);
        return;
      }

      const value = instance[options](...args);
      if (!CHAINABLE.includes(options)) {
        result = value;
      }
    });
    return result;
  };

  // BACKCOMP: plugins forcing a value on x-selects through select2 events (eg. qlea → print "#scale")
  $(document).on('select2:select', 'x-select', function(e) {
    const id = e.params?.data?.id;
    if (undefined !== id) {
      this.select(String(id));
    }
  });

  document.head.insertAdjacentHTML('beforeend', /* html */`<style id="g3w-select2-css">
    select[data-select2-id]   { display: none !important; }
    x-select .x-clear         { margin-left: 8px; padding: 0 4px; color: #999; font-weight: bold; cursor: pointer; }
    x-select .x-clear:hover   { color: #333; }
  </style>`);
}
