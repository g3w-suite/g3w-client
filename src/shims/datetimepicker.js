/**
 * @file Native date-time picker widget compatible with legacy jQuery API (`$.fn.datetimepicker`, `dp.*` events).
 *
 * Initally based on Bootstrap Datetime Picker v4.17.49
 * Copyright 2015-2020 Jonathan Peterson
 * Licensed under MIT (https://github.com/Eonasdan/bootstrap-datetimepicker/blob/master/LICENSE)
 *
 * @since 4.2.0
 */

/**
 * @param { jQuery } $
 */
export function datetimepicker($) {
  class DateTimePicker {

    static instances = new WeakMap();

    static #uid = 0;

    #element;
    #options;
    #anchorName;
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
    #view = 'days';

    constructor(element, options) {
      this.#element = element;
      this.#anchorName = `--datetimepicker-${++DateTimePicker.#uid}`;
      this.#options = Object.assign({
        format: false,
        minDate: false,
        maxDate: false,
        useCurrent: true,
        locale: moment.locale(),
        defaultDate: false,
        disabledDates: false,
        enabledDates: false,
        ignoreReadonly: false,
      }, options);

      this.#input     = element.matches('input') ? element : element.querySelector('input');
      this.#component = element.classList.contains('input-group') ? element.querySelector('.input-group-addon') : null;
      this.#widget    = null;
      this.#date      = null;
      this.#viewDate  = moment().locale(this.#options.locale);
      this.#bound     = {
        documentClick: event => this.#onDocumentClick(event),
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
      this.#input.addEventListener('change',     () => this.#setDate(this.#input.value));
      this.#input.addEventListener('keydown',     e => this.#onKeyDown(e));
      this.#input.addEventListener('blur',       () => this.hide());
      this.#input.addEventListener('focus',      () => this.#show());
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
      const date = moment(value, formats, false);
      if (!date.isValid() && 'string' === typeof value) {
        // ISO strings (eg. minDate: '2020-01-03') when they don't match the display format
        return moment(value, moment.ISO_8601);
      }
      return date;
    }

    #trigger(type, values) {
      this.#element.dispatchEvent(new CustomEvent(`dp.${type}`, { detail: values, }));
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
          <div class = "datetimepicker ${this.#use24Hours ? 'usetwentyfour' : ''}" popover="manual">
            <div class = "picker-switch">
              <a href = "#" data-action = "close" aria-label = "Close">&times;</a>
            </div>
            ${this.#hasDate ? /* html */`
              <div class = "datepicker show-${this.#view}">
                <table class = "days">
                  <thead>
                    <tr>
                      <th class = "prev" data-action = "previous" aria-label = "Previous month">&lsaquo;</th>
                      <th class = "picker-switch" data-action = "pickerSwitch" colspan = "5">${this.#viewDate.format('MMMM YYYY')}</th>
                      <th class = "next" data-action = "next" aria-label = "Next month">&rsaquo;</th>
                    </tr>
                    <tr>
                      ${this.#viewDate.localeData().weekdaysMin(true).map(day => /* html */`<th class = "dow">${day}</th>`).join('')}
                    </tr>
                  </thead>
                  <tbody>
                    ${Array.from({ length: 6 }, (_, week) => /* html */`
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
                    `).join('')}
                  </tbody>
                </table>
                <table class = "months">
                  <thead>
                    <tr>
                      <th class = "prev" data-action = "previous" aria-label = "Previous year">&lsaquo;</th>
                      <th class = "picker-switch" data-action = "pickerSwitch" colspan = "1">${this.#viewDate.format('YYYY')}</th>
                      <th class = "next" data-action = "next" aria-label = "Next year">&rsaquo;</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${Array.from({ length: 4 }, (_, row) => /* html */`
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
                    `).join('')}
                  </tbody>
                </table>
                <table class = "years">
                  <thead>
                    <tr>
                      <th class = "prev" data-action = "previous" aria-label = "Previous decade">&lsaquo;</th>
                      <th class = "picker-switch" colspan = "1">${this.#viewDate.clone().subtract(5, 'year').format('YYYY')}-${this.#viewDate.clone().add(6, 'year').format('YYYY')}</th>
                      <th class = "next" data-action = "next" aria-label = "Next decade">&rsaquo;</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${Array.from({ length: 4 }, (_, row) => /* html */`
                      <tr>${Array.from({ length: 3 }, (_, column) => ((year) => /* html */`
                        <td
                          class = "year ${(this.#date?.isSame(year, 'year') && 'active') || ''}"
                          data-action = "selectYear"
                          data-year = "${year.year()}"
                        >${year.format('YYYY')}</td>
                      `)(this.#viewDate.clone().subtract(5, 'year').add(row * 3 + column, 'year'))).join('')}</tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}
            ${this.#hasTime ? /* html */`
              <table class = "timepicker-picker">
                <tbody>
                  <tr>
                    <td><a href = "#" tabindex = "-1" data-action = "incrementHours" aria-label = "Increment hours">&uarr;</a></td>
                    <td class = "separator">:</td>
                    <td><a href = "#" tabindex = "-1" data-action = "incrementMinutes" aria-label = "Increment minutes">&uarr;</a></td>
                    ${/s/.test(this.#format) ? /* html */`
                      <td class = "separator">:</td>
                      <td><a href = "#" tabindex = "-1" data-action = "incrementSeconds" aria-label = "Increment seconds">&uarr;</a></td>
                    ` : ''}
                  </tr>
                  <tr>
                    <td><span data-action = "showHours">${(this.#date || this.#viewDate).format(this.#use24Hours ? 'HH' : 'hh')}</span></td>
                    <td class = "separator">:</td>
                    <td><span data-action = "showMinutes">${(this.#date || this.#viewDate).format('mm')}</span></td>
                    ${/s/.test(this.#format) ? /* html */`
                      <td class = "separator">:</td>
                      <td><span data-action = "showSeconds">${(this.#date || this.#viewDate).format('ss')}</span></td>
                    ` : ''}
                    ${!this.#use24Hours ? /* html */`
                      <td><button class = "btn btn-primary" data-action = "togglePeriod">${(this.#date || this.#viewDate).format('A')}</button></td>
                    ` : ''}
                  </tr>
                  <tr>
                    <td><a href = "#" tabindex = "-1" data-action = "decrementHours" aria-label = "Decrement hours">&darr;</a></td>
                    <td class = "separator">:</td>
                    <td><a href = "#" tabindex = "-1" data-action = "decrementMinutes" aria-label = "Decrement minutes">&darr;</a></td>
                    ${/s/.test(this.#format) ? /* html */`
                      <td class = "separator">:</td>
                      <td><a href = "#" tabindex = "-1" data-action = "decrementSeconds" aria-label = "Decrement seconds">&darr;</a></td>
                    ` : ''}
                  </tr>
                </tbody>
              </table>
            ` : ''}
          </div>
        `
      }).content.firstElementChild;
      widget.addEventListener('click', event => this.#onWidgetClick(event));
      widget.addEventListener('mousedown', event => event.preventDefault());
      return widget;
    }

    #render() {
      if (this.#widget) {
        const replacement = this.#buildWidget();
        this.#widget.replaceWith(replacement);
        this.#widget = replacement;
        this.#element.append(this.#widget);
        this.#element.style.anchorName    = this.#anchorName;
        this.#widget.style.positionAnchor = this.#anchorName;
        this.#widget.showPopover();
      }
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
        pickerSwitch:     () => {
          this.#view = this.#view === 'days' ? 'months' : 'years';
          this.#render();
        },
        selectDay:        target => this.#selectDate(target.dataset.date),
        selectMonth:      target => this.#selectMonth(Number(target.dataset.month)),
        selectYear:       target => this.#selectYear(Number(target.dataset.year)),
        incrementHours:   () => this.#setDate((this.#date || moment()).clone().add(1, 'hour')),
        decrementHours:   () => this.#setDate((this.#date || moment()).clone().add(-1, 'hour')),
        incrementMinutes: () => this.#setDate((this.#date || moment()).clone().add(1, 'minute')),
        decrementMinutes: () => this.#setDate((this.#date || moment()).clone().add(-1, 'minute')),
        incrementSeconds: () => this.#setDate((this.#date || moment()).clone().add(1, 'second')),
        decrementSeconds: () => this.#setDate((this.#date || moment()).clone().add(-1, 'second')),
        togglePeriod:     () => {
          const date = (this.#date || moment()).clone();
          return this.#setDate(date.add(date.hour() >= 12 ? -12 : 12, 'hour'));
        },
        today:            () => this.#setDate(moment()),
        clear:            () => this.#setDate(null),
        close:            () => this.hide(),
      })[action]?.(event.target.closest('[data-action]'));
    }

    #navigate(amount) {
      this.#viewDate.add(amount * { days: 1, months: 12, years: 144 }[this.#view], 'month');
      this.#render();
      this.#trigger('update', { change: 'M', viewDate: this.#viewDate.clone() });
    }

    #selectMonth(month) {
      this.#viewDate.month(month);
      this.#view = 'days';
      this.#render();
      this.#trigger('update', { change: 'M', viewDate: this.#viewDate.clone() });
    }

    #selectYear(year) {
      this.#viewDate.year(year);
      this.#view = 'months';
      this.#render();
      this.#trigger('update', { change: 'y', viewDate: this.#viewDate.clone() });
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

    #setDate(value) {
      const date    = this.#parseDate(value);
      const oldDate = this.#date?.clone() || false;
      if (!date) {
        this.#date = null;
        this.#input.value = '';
        this.#trigger('change', { date: false, oldDate });
        this.#render();
        return this;
      }
      date.locale(this.#options.locale);
      if (!this.#isValid(date)) {
        this.#trigger('error', { date, oldDate });
        return this;
      }
      this.#date        = date;
      this.#viewDate    = date.clone();
      this.#input.value = date.format(this.#format);
      if (!oldDate || !date.isSame(oldDate)) {
        this.#trigger('change', { date: date.clone(), oldDate });
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
      this.#element.append(this.#widget);
      this.#element.style.anchorName    = this.#anchorName;
      this.#widget.style.positionAnchor = this.#anchorName;
      this.#widget.showPopover();
      document.addEventListener('mousedown', this.#bound.documentClick);
      this.#trigger('show');
      return this;
    }

    hide() {
      if (this.#widget) {
        if (this.#widget.matches(':popover-open')) {
          this.#widget.hidePopover();
        }
        this.#widget.remove();
        this.#widget = null;
        document.removeEventListener('mousedown', this.#bound.documentClick);
        this.#trigger('hide', { date: this.#date?.clone() || false });
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
      return { ...this.#options.enabledDates };
    }

  }

  $.fn.datetimepicker = function(options) {
    const args = Array.from(arguments).slice(1);
    let result = this;
    this.each(function() {
      let instance = DateTimePicker.instances.get(this) || $(this).data('DateTimePicker');
      if (typeof options === 'object' || options === undefined) {
        if (!instance) {
          const element = this;
          instance = new DateTimePicker(element, $.extend(true, {}, options, $(element).data().dateOptions || {}));
          ['dp.change', 'dp.error', 'dp.hide', 'dp.show', 'dp.update'].forEach(type => {
            element.addEventListener(`${type}`, event => {
              $(element).trigger($.Event(type, event.detail));
            });
          });
          DateTimePicker.instances.set(element, instance);
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
  .datetimepicker                                          { position: fixed; z-index: 1000; min-width: min(260px, calc(100vw - 24px)); width: min(28rem, calc(100vw - 24px)); max-height: calc(100vh - 24px); overflow: auto; font-size: 14px; text-align: left; background-color: #fff; background-clip: padding-box; border: 1px solid rgba(0, 0, 0, .18); border-radius: 6px; margin: unset; inset: unset; position-area: bottom; position-try-fallbacks: flip-block; position-try-order: most-height; padding: 10px; color: #263238; box-shadow: 0 10px 28px rgba(0, 0, 0, .24); }
  .datetimepicker a[data-action]                           { display:inline-block; padding:7px 12px; color: #607d8b; text-decoration: none; border-radius: 4px; }
  .datetimepicker a[data-action]:hover,
  .datetimepicker a[data-action]:focus-visible             { color: var(--skin-color); background: rgba(0, 0, 0, .06); outline: none; }
  .datetimepicker a[data-action]:active                    { box-shadow:none }
  .datetimepicker .picker-switch > a,
  .datetimepicker .timepicker-picker a[data-action]        { font-size:1em; line-height:1; padding:6px 4px; }
  .datetimepicker .picker-switch > a[data-action="close"],
  .datetimepicker th:is(.prev, .next)                      { font-size:1.5em; line-height:1 }
  .datetimepicker .timepicker-hour,
  .datetimepicker .timepicker-minute,
  .datetimepicker .timepicker-second                       { width:54px; font-weight:700; font-size:1.2em; margin:0 }
  .datetimepicker button[data-action]                      { padding:6px }
  .datetimepicker .picker-switch                           { text-align:center; padding:2px 0; font-weight: 700; }
  .datetimepicker .picker-switch a                         { min-width:34px; text-align:center }
  .datetimepicker table                                    { width:100%; margin:0 }
  .datetimepicker :is(td, th)                              { text-align:center; border-radius:4px; height:34px; line-height:34px; width:34px; }
  .datetimepicker .disabled,
  .datetimepicker .disabled:hover                          { background:none; color:#777; cursor:not-allowed }
  .datetimepicker .prev:after                              { position:absolute; width:1px; height:1px; margin:-1px; padding:0; overflow:hidden; clip:rect(0,0,0,0); border:0; content:"Previous Month" }
  .datetimepicker .next:after                              { position:absolute; width:1px; height:1px; margin:-1px; padding:0; overflow:hidden; clip:rect(0,0,0,0); border:0; content:"Next Month" }
  .datetimepicker thead tr:first-child th                  { cursor:pointer }
  .datetimepicker thead tr:first-child th:hover,
  .datetimepicker thead tr:first-child th:focus-visible    { background:#eef3f4; outline: none; }
  .datetimepicker td                                       { height:42px; line-height:42px; width:42px }
  .datetimepicker .day                                     { height:30px; line-height:30px; width:30px }
  .datetimepicker :is(.day, .hour, .minute, .second, span, .month, .year):hover { background:#eee; cursor:pointer }
  .datetimepicker :is(.old, .new)                          { color:#90a0a8 }
  .datetimepicker .today                                   { position:relative }
  .datetimepicker .today:before                            { content:""; display:inline-block; border:solid transparent; border-width:0 0 7px 7px; border-bottom-color:#337ab7; border-top-color:#0003; position:absolute; bottom:4px; right:4px }
  .datetimepicker .active,
  .datetimepicker .active:hover                            { background-color:#337ab7; color:#fff; text-shadow:0 -1px 0 rgba(0,0,0,.25) }
  .datetimepicker .active.today:before                     { border-bottom-color:#fff }
  .datetimepicker .active                                  { background-color:#337ab7; color:#fff; text-shadow:0 -1px 0 rgba(0,0,0,.25) }
  .datetimepicker .active                                  { background-color: var(--skin-color); }
  .datetimepicker :is(.disabled, .disabled:hover)          { background:none; color:#777; cursor:not-allowed }
  .datetimepicker span                                     { display:inline-block; width:42px; height:42px; line-height:42px; margin:2px 1.5px; cursor:pointer; border-radius:4px }
  .datetimepicker :is(.day, .hour, .minute, .second, span, .month, .year):focus-visible { outline: 2px solid var(--skin-color); outline-offset: 1px; }
  .datetimepicker .timepicker-picker                     { width: 100%; table-layout: fixed; margin-top: 6px; border-top: 1px solid #e6eaec; }
  .datetimepicker .timepicker-picker td                   { width: auto; height: 30px; line-height: 30px; padding: 0 2px; }
  .datetimepicker .timepicker-picker span                 { width: auto; min-width: 28px; height: 34px; line-height: 34px; font-weight: 700; }
  .datetimepicker .timepicker-picker .separator           { width: 10px; padding: 0; }
  .datetimepicker .timepicker-picker button               { min-width: 38px; padding: 6px 8px; }
  .datetimepicker .months                                  { display:none }
  .datetimepicker .month,
  .datetimepicker .year                                    { cursor:pointer }
  .datetimepicker .show-months .days                       { display:none }
  .datetimepicker .show-months .months                     { display:table }
  .datetimepicker .years                                   { display:none }
  .datetimepicker .show-years .days,
  .datetimepicker .show-years .months                      { display:none }
  .datetimepicker .show-years .years                       { display:table }
  .datetimepicker.usetwentyfour .hour                      { height:27px; line-height:27px }
  .datetimepicker .decade                                  { line-height:1.8em!important }
  </style>`);
}
