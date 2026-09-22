/**
 * @file
 * @since 3.11.0
 */

// polyfills
import '@ungap/with-resolvers';
import 'invokers-polyfill';

import * as ol              from 'ol';
import * as array           from 'ol/array';
import * as color           from 'ol/color';
import * as control         from 'ol/control';
import * as coordinate      from 'ol/coordinate';
import * as easing          from 'ol/easing';
import * as condition       from 'ol/events/condition';
import * as extent          from 'ol/extent';
import * as featureloader   from 'ol/featureloader';
import * as format          from 'ol/format';
import * as filter          from 'ol/format/filter';
import * as geom            from 'ol/geom';
import * as Polygon         from 'ol/geom/Polygon';
import * as has             from 'ol/has';
import * as interaction     from 'ol/interaction';
import { createBox }        from 'ol/interaction/Draw';
import * as layer           from 'ol/layer';
import * as loadingstrategy from 'ol/loadingstrategy';
import * as Observable      from 'ol/Observable';
import * as proj            from 'ol/proj';
import * as proj4ol         from 'ol/proj/proj4';
import * as projections     from 'ol/proj/projections';
import * as Units           from 'ol/proj/Units';
import * as render          from 'ol/render';
import * as size            from 'ol/size';
import * as source          from 'ol/source';
import * as sphere          from 'ol/sphere';
import * as style           from 'ol/style';
import * as tilegrid        from 'ol/tilegrid';
import * as xml             from 'ol/xml';

import shp                  from 'shpjs';
import proj4                from 'proj4';
import Vue                  from 'vue/dist/vue.js';

/**
 * Monkey patch for: `Vue.extend(require())`
 */
const extendProto = Vue.extend.bind(Vue);
Vue.extend = function(opts) {
  const esm_to_cjs = o => o.default && o.__esModule; // interopability properties added by esbuild
  if (esm_to_cjs(opts)) {
    console.warn(`[G3W-CLIENT] Vue.extend(require(${opts})) is deprecated`);
    console.trace();
  }
  if (opts.mixins) {
    for (const i in opts.mixins) {
      if (esm_to_cjs(opts.mixins[i])) {
        console.warn(`[G3W-CLIENT] Vue.extend({ mixins: [ require(${opts.mixins}) ] }) is deprecated`);
        console.trace();
        opts.mixins[i] = opts.mixins[i].default;
      }
    }
  }
  if (opts.components) {
    for (const i in opts.components) {
      if (esm_to_cjs(opts.components[i])) {
        console.warn(`[G3W-CLIENT] Vue.extend({ components: [ require(${opts.components}) ] }) is deprecated`);
        console.trace();
        opts.components[i] = opts.components[i].default;
      }
    }
  }
  return extendProto(esm_to_cjs(opts) ? opts.default : opts);
};

/**
 * Shim legacy window variables
 */
Object.assign(globalThis, {
  Vue,
  /** @deprecated since 3.11.0 */
  isMobile: {
    get any() {
      return undefined !== window.orientation ||
        navigator?.userAgentData?.mobile ||
        (('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.matchMedia('(any-pointer: coarse)').matches);
    }
  },
  /** @deprecated since 3.11.0 */
  $script(url, callback) {
    const script = document.createElement('script');
    script.src = url;
    script.onload = callback;
    document.head.appendChild(script);
  },
  /** @deprecated since 3.11.0 */
  shp,
  /** @deprecated since 3.11.0 */
  proj4,
});

const initConfig = window.initConfig;

// convert relative base URLs to absolute (eg. '/' → 'http://localhost:8080/')
if (initConfig.baseurl) {
  try {
    new URL(initConfig.baseurl);
  } catch (error) {
    initConfig.baseurl = (new URL(initConfig.baseurl, window.location)).toString();
  }
}

Object.defineProperty(initConfig, 'group', {
  get() {
    console.warn(`[G3W-CLIENT] initConfig.group has been removed from core since 4.1.0`);
    console.trace();
    return initConfig;
  },
  configurable: false,
  enumerable: true
});

// gid of panoramic map project
initConfig.overviewproject = initConfig.overviewproject ? initConfig.overviewproject.gid : null;


/**
 * Based on OpenLayers v5.3.0
 */
globalThis.ol = Object.assign({}, ol, {
  array,
  color,
  control,
  coordinate,
  easing,
  events: { condition },
  extent,
  featureloader,
  format:      Object.assign({}, format,      { filter }),
  geom:        Object.assign({}, geom,        { Polygon: Object.assign(geom.Polygon, Polygon) }),
  has,
  interaction: Object.assign({}, interaction, { Draw: Object.assign(interaction.Draw, { createBox }) }), //on editing plugin new ol.interaction.Draw({ type: 'Circle', source: this._vectorLayer.getSource(), geometryFunction: ol.interaction.Draw.createBox() });
  layer,
  loadingstrategy,
  proj:        Object.assign({}, proj,        { proj4: proj4ol, projections, Units, }),
  render,
  size,
  source,
  sphere,
  style,
  tilegrid,
  xml,
  Observable,
});

/**
 * Based on jQuery v2.2.4
 */
globalThis.$ = globalThis.jQuery = require('jquery/dist/jquery');

/**
 * Based on bootstrap/js/modal.js@v3.3.7
 */
$.fn.modal = function(option) {
  const element = this[0];

  if (!element['__g3w_dialog']) {
    // wrap jquery modal into a native <dialog> element
    const dialog = element instanceof HTMLDialogElement ? element : document.createElement('dialog');
    if (dialog !== element) {
      dialog.append(element)
    }
    document.body.appendChild(dialog);

    // handle click on "backdrop" and "data-dismiss" buttons
    dialog.addEventListener('mousedown', e => {
      const rect        = dialog.getBoundingClientRect();
      const is_backdrop = (
        e.clientY < rect.top - 20 ||
        e.clientY > rect.top + rect.height ||
        e.clientX < rect.left ||
        e.clientX > rect.left + rect.width - 20
      );
      const is_interactive = ['label', 'button', 'select', 'input', 'textarea', 'x-select'].some(i => e.target.closest(i));
      if ((is_backdrop && !is_interactive) || (0 === e.button && e.target.closest('[data-dismiss="modal"]'))) {
        dialog.close();
      }
    });

    // BACKOMP for "shown.bs.modal" and "hidden.bs.modal" events
    dialog.addEventListener('beforetoggle', e => {
      if ('open' === e.newState) {
        setTimeout(() => {
          $(element).find('.modal-dialog').trigger('shown.bs.modal');
          $(element).trigger('shown.bs.modal');
        }, 500);
      } else {
        $(element).trigger('hidden.bs.modal');
      }
    });

    element['__g3w_dialog'] = ({
      show:   () => dialog.showModal(),
      hide:   () => dialog.close(),
      toggle: () => dialog.open ? dialog.close() : dialog.showModal(),
    });
  }

  element['__g3w_dialog']['string' === typeof option ? option : 'show']();
  return this;
};

/**
 * Based on bootstrap/js/modal.js@v3.3.7
 */
document.addEventListener('click', function(e) {
  const target = e.target.closest('[data-toggle="modal"]');
  const modal  = target && document.querySelector(target.getAttribute('data-target') || target.getAttribute('href'));
  if (modal) {
    e.preventDefault();
    $.fn.modal.call($(modal));
  }
});


/**
 * Based on bootstrap/js/tooltip.js@v3.3.7
 */
$.fn.tooltip = function(opts) {
  if ('hide' === opts) {
    document.querySelector('#tooltip').hidePopover()
  }
  return this;
};

require('select2')(jQuery);

globalThis.moment = require('moment/min/moment-with-locales');

/**
 * Based on bootstrap/js/dropdown.js@v3.3.7
 */
document.addEventListener('click', function(e) {
  const target = e.target.closest('[data-toggle="dropdown"]');
  if (3 !== e.button) {
    document
      .querySelectorAll('[data-toggle="dropdown"]')
      .forEach(toggle => {
        const open = target === toggle && !target.parentNode.classList.contains('open');
        toggle.setAttribute('aria-expanded', open);
        toggle.parentNode.classList.toggle('open', open);
        if (open) {
          toggle.focus();
        }
      });
  }
});

/**
 * Based on bootstrap/js/dropdown.js@v3.3.7
 */
document.addEventListener('keydown', function(e) {
  const target = e.target.closest('[data-toggle="dropdown"]');
  if (target && 'Escape' === e.key) {
    target.click();
  }
});

/**
 * Based on bootstrap/js/tab.js@v3.3.7
 */
document.addEventListener('click', function(e) {
  const tab = e.target.closest('[data-toggle="tab"]');
  if (!tab) {
    return;
  }
  e.preventDefault();
  if (tab.parentElement.classList.contains('active')) {
    return;
  }
  const pane = document.querySelector(tab.getAttribute('href'));
  [
    { element: tab.closest('li'), container: tab.closest('ul') },
    { element: pane,              container: pane.parentNode },
  ].forEach(({ element, container }) => {
    const active = container.querySelector(':scope > .active');
    if (active) {
      active.classList.remove('active');
      active.querySelectorAll('[data-toggle="tab"]').forEach(tab => tab.setAttribute('aria-expanded', false));
    }
    element.classList.add('active');
    element.querySelectorAll('[data-toggle="tab"]').forEach(tab => {
      tab.setAttribute('aria-expanded', true);
      tab.focus();
    });
  });
});

/*
 * Native date-time picker widget compatible with legacy jQuery API.
 *
 * Initally based on Bootstrap Datetime Picker v4.17.49
 * Copyright 2015-2020 Jonathan Peterson
 * Licensed under MIT (https://github.com/Eonasdan/bootstrap-datetimepicker/blob/master/LICENSE)
 */
(function() {
  class DateTimePicker {
    #element;
    #options;
    #input;
    #component;
    #widget;
    #date;
    #viewDate;
    #format;
    #bound;
    #hasDate;
    #hasTime;
    #use24Hours;

    constructor(element, options) {
      this.#element = element;
      this.#options = $.extend(true, {}, {
        format: false,
        minDate: false,
        maxDate: false,
        useCurrent: true,
        locale: moment.locale(),
        defaultDate: false,
        disabledDates: false,
        enabledDates: false,
        widgetPositioning: { horizontal: 'auto', vertical: 'auto' },
        widgetParent: null,
        ignoreReadonly: false,
      }, options, $(element).data().dateOptions || {});

      this.#input     = element.matches('input') ? element : element.querySelector('.datepickerinput') || element.querySelector('input');
      this.#component = element.classList.contains('input-group') ? element.querySelector('.datepickerbutton, .input-group-addon') : null;
      this.#widget    = null;
      this.#date      = null;
      this.#viewDate  = moment().locale(this.#options.locale);
      this.#bound     = {
        documentClick: event => this.#onDocumentClick(event),
        resize:        () => this.#place(),
      };

      if (!this.#input) {
        throw new Error('Could not initialize DateTimePicker without an input element');
      }

      const locale     = moment.localeData(this.#options.locale);
      this.#format     = (this.#options.format || 'L LT').replace(/LTS|LT|LL?L?L?/g, token => locale.longDateFormat(token) || token);
      this.#hasDate    = /Y|M|D/.test(this.#format);
      this.#hasTime    = /H|h|m|s/.test(this.#format);
      this.#use24Hours = !/h|a/i.test(this.#format.replace(/\[.*?]/g, ''));

      if (this.#options.minDate) {
        this.#options.minDate = this.#parseDate(this.#options.minDate);
      }

      if (this.#options.maxDate) {
        this.#options.maxDate = this.#parseDate(this.#options.maxDate);
      }

      if (this.#options.defaultDate) {
        this.#options.defaultDate = this.#parseDate(this.#options.defaultDate);
      }

      this.#options.enabledDates  = this.#indexDates(this.#options.enabledDates);
      this.#options.disabledDates = this.#indexDates(this.#options.disabledDates);

      // attach events
      this.#input.addEventListener('change',  () => this.#setDate(this.#input.value));
      this.#input.addEventListener('keydown', event => this.#onKeyDown(event));
      this.#input.addEventListener('blur',    () => this.hide());
      if (this.#element.matches('input')) {
        this.#input.addEventListener('focus', () => this.#show());
      }
      this.#component?.addEventListener('click', () => this.#widget ? this.hide() : this.#show());

      if (this.#input.value.trim()) {
        this.#setDate(this.#input.value);
      } else if (this.#options.defaultDate) {
        this.#setDate(this.#options.defaultDate);
      }
    }

    #parseDate(value, formats = [this.#format]) {
      if (value === false || value === null || value === undefined || value === '') {
        return null;
      }
      if (moment.isMoment(value)) {
        return value.clone();
      }
      if (value instanceof Date) {
        return moment(value);
      }
      return moment(value, formats, false);
    }

    #trigger(type, values) {
      $(this.#element).trigger($.Event(type, values));
    }

    #isValid(date, granularity = 'millisecond') {
      if (!date?.isValid()) return false;
      const {
        minDate,
        maxDate,
        enabledDates,
        disabledDates,
      } = this.#options;
      if (minDate && date.isBefore(minDate, granularity)) return false;
      if (maxDate && date.isAfter(maxDate, granularity)) return false;
      if (enabledDates && !enabledDates[date.format('YYYY-MM-DD')]) return false;
      if (disabledDates && disabledDates[date.format('YYYY-MM-DD')]) return false;
      return true;
    }

    #indexDates(dates) {
      if (!dates) return false;
      return dates.reduce((indexed, date) => {
        const parsed = this.#parseDate(date);
        if (parsed?.isValid()) {
          indexed[parsed.format('YYYY-MM-DD')] = true;
        }
        return indexed;
      }, {});
    }

    #buildWidget() {
      const widget = Object.assign(document.createElement('template'), {
        innerHTML: /* html */`
          <div class = "datetimepicker bootstrap-datetimepicker-widget dropdown-menu${this.#use24Hours ? ' usetwentyfour' : ''}">
            <div class = "picker-switch">
              <a href = "#" data-action = "close"><span class = "glyphicon glyphicon-remove"></span></a>
            </div>
            ${this.#hasDate ? /* html */`
              <div class = "datepicker">
                <div class = "datepicker-days">
                  <table class = "table-condensed">
                    <thead>
                      <tr>
                        <th class = "prev" data-action = "previous"><span class = "glyphicon glyphicon-chevron-left"></span></th>
                        <th class = "picker-switch" data-action = "pickerSwitch" colspan = "5">${this.#viewDate.format('MMMM YYYY')}</th>
                        <th class = "next" data-action = "next"><span class = "glyphicon glyphicon-chevron-right"></span></th>
                      </tr>
                      <tr>
                        <th class = "dow">${this.#viewDate.localeData().weekdaysMin()[0]}</th>
                        <th class = "dow">${this.#viewDate.localeData().weekdaysMin()[1]}</th>
                        <th class = "dow">${this.#viewDate.localeData().weekdaysMin()[2]}</th>
                        <th class = "dow">${this.#viewDate.localeData().weekdaysMin()[3]}</th>
                        <th class = "dow">${this.#viewDate.localeData().weekdaysMin()[4]}</th>
                        <th class = "dow">${this.#viewDate.localeData().weekdaysMin()[5]}</th>
                        <th class = "dow">${this.#viewDate.localeData().weekdaysMin()[6]}</th>
                      </tr>
                    </thead>
                    <tbody>${Array.from({ length: 6 }, (_, week) => /* html */`
                      <tr>${Array.from({ length: 7 }, (_, day) => ((date) => /* html */`
                        <td
                          class = "${[
                            'day',
                            !date.isSame(this.#viewDate, 'month') && (date.isBefore(this.#viewDate, 'month') ? 'old' : 'new'),
                            this.#date?.isSame(date, 'day') && 'active',
                            date.isSame(moment(), 'day') && 'today',
                            (date.day() === 0 || date.day() === 6) && 'weekend',
                            !this.#isValid(date, 'day') && 'disabled',
                          ].filter(Boolean).join(' ')}"
                          data-action = "selectDay"
                          data-date = "${date.format('YYYY-MM-DD')}"
                        >${date.date()}</td>
                      `)(this.#viewDate.clone().startOf('month').startOf('week').add(week * 7 + day, 'day'))).join('')}</tr>
                    `).join('')}</tbody>
                  </table>
                </div>
                <div class = "datepicker-months">
                  <table class = "table-condensed">
                    <tbody>${Array.from({ length: 4 }, (_, row) => /* html */`
                      <tr>${Array.from({ length: 3 }, (_, column) => ((month, index) => /* html */`
                        <td
                          class = "${[
                            'month',
                            this.#date?.isSame(month, 'year') && this.#date.month() === index && 'active',
                            !this.#isValid(month, 'month') && 'disabled',
                          ].filter(Boolean).join(' ')}"
                          data-action = "selectMonth"
                          data-month = "${index}"
                        >${month.format('MMM')}</td>
                      `)(this.#viewDate.clone().month(row * 3 + column), row * 3 + column)).join('')}</tr>
                    `).join('')}</tbody>
                  </table>
                </div>
              </div>
            ` : ''}
            ${this.#hasTime ? /* html */`
              <div class = "timepicker">
                <table class = "table-condensed timepicker-picker">
                  <tr>
                    <td><a href = "#" tabindex = "-1" data-action = "incrementHours"><span class = "glyphicon glyphicon-chevron-up"></span></a></td>
                    <td class = "separator">:</td>
                    <td><a href = "#" tabindex = "-1" data-action = "incrementMinutes"><span class = "glyphicon glyphicon-chevron-up"></span></a></td>
                    ${/s/.test(this.#format) ? /* html */`
                      <td class = "separator">:</td>
                      <td><a href = "#" tabindex = "-1" data-action = "incrementSeconds"><span class = "glyphicon glyphicon-chevron-up"></span></a></td>
                    ` : ''}
                  </tr>
                  <tr>
                    <td><span data-action = "showHours">${this.#date.format(this.#use24Hours ? 'HH' : 'hh')}</span></td>
                    <td class = "separator">:</td>
                    <td><span data-action = "showMinutes">${this.#date.format('mm')}</span></td>
                    ${/s/.test(this.#format) ? /* html */`
                      <td class = "separator">:</td>
                      <td><span data-action = "showSeconds">${this.#date.format('ss')}</span></td>
                    ` : ''}
                    ${!this.#use24Hours ? /* html */`
                      <td><button class = "btn btn-primary" data-action = "togglePeriod">${this.#date.format('A')}</button></td>
                    ` : ''}
                  </tr>
                  <tr>
                    <td><a href = "#" tabindex = "-1" data-action = "decrementHours"><span class = "glyphicon glyphicon-chevron-down"></span></a></td>
                    <td class = "separator">:</td>
                    <td><a href = "#" tabindex = "-1" data-action = "decrementMinutes"><span class = "glyphicon glyphicon-chevron-down"></span></a></td>
                    ${/s/.test(this.#format) ? /* html */`
                      <td class = "separator">:</td>
                      <td><a href = "#" tabindex = "-1" data-action = "decrementSeconds"><span class = "glyphicon glyphicon-chevron-down"></span></a></td>
                    ` : ''}
                  </tr>
                </table>
              </div>
            ` : ''}
          </div>
        `
      }).content.firstElementChild;
      widget.addEventListener('click', event => this.#onWidgetClick(event));
      widget.addEventListener('mousedown', event => event.preventDefault());
      return widget;
    }

    #render() {
      if (!this.#widget) {
        return;
      }
      const replacement = this.#buildWidget();
      this.#widget.replaceWith(replacement);
      this.#widget = replacement;
      this.#place();
    }

    #onWidgetClick(event) {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (!action || event.target.closest('.disabled')) {
        return;
      }
      event.preventDefault();
      ({
        previous:         () => this.#navigate(-1),
        next:             () => this.#navigate(1),
        pickerSwitch:     () => this.#widget.querySelector('.datepicker').classList.add('show-months'),
        selectDay:        target => this.#selectDate(target.dataset.date),
        selectMonth:      target => this.#selectMonth(Number(target.dataset.month)),
        incrementHours:   () => this.#setDate((this.#date || moment()).clone().add(1, 'hour')),
        decrementHours:   () => this.#setDate((this.#date || moment()).clone().add(-1, 'hour')),
        incrementMinutes: () => this.#setDate((this.#date || moment()).clone().add(1, 'minute')),
        decrementMinutes: () => this.#setDate((this.#date || moment()).clone().add(-1, 'minute')),
        incrementSeconds: () => this.#setDate((this.#date || moment()).clone().add(1, 'second')),
        decrementSeconds: () => this.#setDate((this.#date || moment()).clone().add(-1, 'second')),
        togglePeriod:     () => this.#setDate((this.#date || moment()).clone().add(this.#date.hour() >= 12 ? -12 : 12, 'hour')),
        today:            () => this.#setDate(moment()),
        clear:            () => this.#setDate(null),
        close:            () => this.hide(),
      })[action]?.(event.target.closest('[data-action]'));
    }

    #navigate(amount) {
      this.#viewDate.add(amount, 'month');
      this.#render();
      this.#trigger('dp.update', { change: 'M', viewDate: this.#viewDate.clone() });
    }

    #selectMonth(month) {
      this.#viewDate.month(month);
      this.#widget.querySelector('.datepicker').classList.remove('show-months');
      this.#widget.querySelectorAll('.datepicker-months .month').forEach((cell, index) => {
        cell.classList.toggle('active', this.#date?.isSame(this.#viewDate, 'year') && this.#date.month() === index);
      });
      this.#trigger('dp.update', { change: 'M', viewDate: this.#viewDate.clone() });
    }

    #selectDate(value) {
      const date = this.#parseDate(value, ['YYYY-MM-DD']);
      if (this.#date) {
        date.hour(this.#date.hour()).minute(this.#date.minute()).second(this.#date.second());
      }
      this.#setDate(date);
      if (!this.#hasTime) {
        this.hide();
      }
    }

    #onKeyDown(event) {
      if (event.key === 'Escape') return this.hide();
      if (event.key === 'Enter') return this.hide();
      if (event.key === 'Delete') return this.#setDate(null);
      if (event.key === 'ArrowDown' && !this.#widget) return this.#show();
    }

    #onDocumentClick(event) {
      if (!this.#element.contains(event.target) && !this.#widget?.contains(event.target)) {
        this.hide();
      }
    }

    #place() {
      if (!this.#widget) {
        return;
      }
      const parent = this.#options.widgetParent?.jquery ? this.#options.widgetParent[0] : this.#options.widgetParent || this.#element;
      parent.append(this.#widget);
      const anchor = this.#component || this.#element;
      if (this.#options.widgetParent) {
        this.#widget.classList.remove('top', 'pull-right');
        this.#widget.classList.add('bottom');
        this.#widget.style.inset = `${anchor.offsetHeight}px auto auto 0px`;
        return;
      }
      const anchorRect = anchor.getBoundingClientRect();
      const referenceRect = parent.getBoundingClientRect();
      const vertical = this.#options.widgetPositioning.vertical === 'auto'
        ? (anchorRect.bottom + this.#widget.offsetHeight > window.innerHeight && anchorRect.top > this.#widget.offsetHeight ? 'top' : 'bottom')
        : this.#options.widgetPositioning.vertical;
      const horizontal = this.#options.widgetPositioning.horizontal === 'auto'
        ? (anchorRect.left + this.#widget.offsetWidth > window.innerWidth ? 'right' : 'left')
        : this.#options.widgetPositioning.horizontal;
      const top = anchorRect.top - referenceRect.top;
      const left = parent === this.#element ? 0 : anchorRect.left - referenceRect.left;
      this.#widget.classList.toggle('top', vertical === 'top');
      this.#widget.classList.toggle('bottom', vertical !== 'top');
      this.#widget.classList.toggle('pull-right', horizontal === 'right');
      this.#widget.style.top = `${vertical === 'top' ? top - this.#widget.offsetHeight : top + anchorRect.height}px`;
      this.#widget.style.left = `${horizontal === 'right' ? left + anchorRect.width - this.#widget.offsetWidth : left}px`;
    }

    #setDate(value) {
      const date    = this.#parseDate(value);
      const oldDate = this.#date?.clone() || false;
      if (!date) {
        this.#date = null;
        this.#input.value = '';
        this.#trigger('dp.change', { date: false, oldDate });
        this.#render();
        return this;
      }
      date.locale(this.#options.locale);
      if (!this.#isValid(date)) {
        this.#trigger('dp.error', { date, oldDate });
        return this;
      }
      this.#date        = date;
      this.#viewDate    = date.clone();
      this.#input.value = date.format(this.#format);
      if (!oldDate || !date.isSame(oldDate)) {
        this.#trigger('dp.change', { date: date.clone(), oldDate });
      }
      this.#render();
      return this;
    }

    #show() {
      if (this.#widget || this.#input.disabled || (this.#input.readOnly && !this.#options.ignoreReadonly)) {
        return this;
      }
      if (!this.#date && this.#options.useCurrent) {
        const date = moment();
        const granularity = typeof this.#options.useCurrent === 'string' ? this.#options.useCurrent : null;
        if (granularity) {
          date.startOf(granularity);
        }
        this.#setDate(date);
      }
      this.#widget = this.#buildWidget();
      this.#place();
      window.addEventListener('resize', this.#bound.resize);
      document.addEventListener('mousedown', this.#bound.documentClick);
      this.#trigger('dp.show');
      return this;
    }

    hide() {
      if (this.#widget) {
        this.#widget.remove(); this.#widget = null;
        window.removeEventListener('resize', this.#bound.resize);
        document.removeEventListener('mousedown', this.#bound.documentClick);
        this.#trigger('dp.hide', { date: this.#date?.clone() || false });
      }
      return this;
    }

    date(value) {
      if (arguments.length) {
        return this.#setDate(value);
      }
      return this.#date?.clone() || null;
    }

    minDate(value) {
      if (arguments.length) {
        return (this.#options.minDate = value ? this.#parseDate(value) : false, this.#render(), this);
      }
      return this.#options.minDate?.clone() || false;
    }

    maxDate(value) {
      if (arguments.length) {
        return (this.#options.maxDate = value ? this.#parseDate(value) : false, this.#render(), this)
      }
      return this.#options.maxDate?.clone() || false;
    }

    enabledDates(value) {
      if (arguments.length) {
        return (this.#options.enabledDates = this.#indexDates(value), this.#options.disabledDates = false, this.#render(), this);
      }
      return $.extend({}, this.#options.enabledDates);
    }

  }

  $.fn.datetimepicker = function(options) {
    const args = Array.from(arguments).slice(1);
    let result = this;
    this.each(function() {
      let instance = $(this).data('DateTimePicker');
      if (typeof options === 'object' || options === undefined) {
        if (!instance) {
          instance = new DateTimePicker(this, options || {});
          $(this).data('DateTimePicker', instance);
        }
      } else if (!instance || typeof instance[options] !== 'function') {
        throw new Error(`bootstrap-datetimepicker("${options}") method was called on an element that is not using DateTimePicker`);
      } else {
        const value = instance[options](...args);
        if (value !== instance && value !== undefined) result = value;
      }
    });
    return result;
  };

  document.head.insertAdjacentHTML('beforeend', /* html */`<style id ="g3w-date-css">
  .datetimepicker { list-style:none }
  .datetimepicker.dropdown-menu { display:block; margin:2px 0; padding:4px; width:19em }
  @media (min-width: 768px) { .datetimepicker.dropdown-menu.timepicker-sbs { width:38em } }
  @media (min-width: 992px) { .datetimepicker.dropdown-menu.timepicker-sbs { width:38em } }
  @media (min-width: 1200px) { .datetimepicker.dropdown-menu.timepicker-sbs { width:38em } }
  .datetimepicker.dropdown-menu:before,
  .datetimepicker.dropdown-menu:after { content:""; display:inline-block; position:absolute }
  .datetimepicker.dropdown-menu.bottom:before { border-left:7px solid transparent; border-right:7px solid transparent; border-bottom:7px solid #ccc; border-bottom-color:#0003; top:-7px; left:7px }
  .datetimepicker.dropdown-menu.bottom:after { border-left:6px solid transparent; border-right:6px solid transparent; border-bottom:6px solid white; top:-6px; left:8px }
  .datetimepicker.dropdown-menu.top:before { border-left:7px solid transparent; border-right:7px solid transparent; border-top:7px solid #ccc; border-top-color:#0003; bottom:-7px; left:6px }
  .datetimepicker.dropdown-menu.top:after { border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid white; bottom:-6px; left:7px }
  .datetimepicker.dropdown-menu.pull-right:before { left:auto; right:6px }
  .datetimepicker.dropdown-menu.pull-right:after { left:auto; right:7px }
  .datetimepicker a[data-action] { display:inline-block; padding:6px 12px }
  .datetimepicker a[data-action]:active { box-shadow:none }
  .datetimepicker .timepicker-hour,
  .datetimepicker .timepicker-minute,
  .datetimepicker .timepicker-second { width:54px; font-weight:700; font-size:1.2em; margin:0 }
  .datetimepicker button[data-action] { padding:6px }
  .datetimepicker .picker-switch { text-align:center; padding:2px 0 }
  .datetimepicker .picker-switch a { min-width:34px; text-align:center }
  .datetimepicker table { width:100%; margin:0 }
  .datetimepicker table td,
  .datetimepicker table th { text-align:center; border-radius:4px }
  .datetimepicker table th { height:20px; line-height:20px; width:20px }
  .datetimepicker table th.picker-switch { width:145px }
  .datetimepicker table th.disabled,
  .datetimepicker table th.disabled:hover { background:none; color:#777; cursor:not-allowed }
  .datetimepicker table th.prev:after { position:absolute; width:1px; height:1px; margin:-1px; padding:0; overflow:hidden; clip:rect(0,0,0,0); border:0; content:"Previous Month" }
  .datetimepicker table th.next:after { position:absolute; width:1px; height:1px; margin:-1px; padding:0; overflow:hidden; clip:rect(0,0,0,0); border:0; content:"Next Month" }
  .datetimepicker table thead tr:first-child th { cursor:pointer }
  .datetimepicker table thead tr:first-child th:hover { background:#eee }
  .datetimepicker table td { height:54px; line-height:54px; width:54px }
  .datetimepicker table td.cw { font-size:.8em; height:20px; line-height:20px; color:#777 }
  .datetimepicker table td.day { height:20px; line-height:20px; width:20px }
  .datetimepicker table td.day:hover,
  .datetimepicker table td.hour:hover,
  .datetimepicker table td.minute:hover,
  .datetimepicker table td.second:hover { background:#eee; cursor:pointer }
  .datetimepicker table td.old,
  .datetimepicker table td.new { color:#777 }
  .datetimepicker table td.today { position:relative }
  .datetimepicker table td.today:before { content:""; display:inline-block; border:solid transparent; border-width:0 0 7px 7px; border-bottom-color:#337ab7; border-top-color:#0003; position:absolute; bottom:4px; right:4px }
  .datetimepicker table td.active,
  .datetimepicker table td.active:hover { background-color:#337ab7; color:#fff; text-shadow:0 -1px 0 rgba(0,0,0,.25) }
  .datetimepicker table td.active.today:before { border-bottom-color:#fff }
  .datetimepicker table td.disabled,
  .datetimepicker table td.disabled:hover { background:none; color:#777; cursor:not-allowed }
  .datetimepicker table td span { display:inline-block; width:54px; height:54px; line-height:54px; margin:2px 1.5px; cursor:pointer; border-radius:4px }
  .datetimepicker table td span:hover { background:#eee }
  .datetimepicker table td span.active { background-color:#337ab7; color:#fff; text-shadow:0 -1px 0 rgba(0,0,0,.25) }
  .datetimepicker table td span.old { color:#777 }
  .datetimepicker table td span.disabled,
  .datetimepicker table td span.disabled:hover { background:none; color:#777; cursor:not-allowed }
  .datetimepicker .datepicker-months { display:none }
  .datetimepicker .datepicker-months .month { cursor:pointer }
  .datetimepicker .datepicker-months .month:hover { background:#eee; cursor:pointer }
  .datetimepicker .datepicker-months .month.active,
  .datetimepicker .datepicker-months .month.active:hover { background-color:#337ab7; color:#fff; text-shadow:0 -1px 0 rgba(0,0,0,.25) }
  .datetimepicker .datepicker.show-months .datepicker-days { display:none }
  .datetimepicker .datepicker.show-months .datepicker-months { display:block }
  .datetimepicker.usetwentyfour td.hour { height:27px; line-height:27px }
  .datetimepicker.wider { width:21em }
  .datetimepicker .datepicker-decades .decade { line-height:1.8em!important }
  .input-group.date .input-group-addon { cursor:pointer }

  .datetimepicker a > span:is(.glyphicon-remove, .glyphicon-time, .glyphicon-calendar, .glyphicon-chevron-up, .glyphicon-chevron-down) { color: var(--skin-color); }
  .datetimepicker .datepicker .active                      { background-color: var(--skin-color); }
  .datetimepicker.dropdown-menu                            { color: #000; white-space: normal !important; }
  .datetimepicker.dropdown-menu:after,
  .datetimepicker.dropdown-menu:before                     { content: none !important; }
  </style>`);
})();
