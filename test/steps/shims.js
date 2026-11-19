const assert = require('node:assert/strict');
const { Then } = require('@cucumber/cucumber');

Then('the DOM shim composes collection, traversal, styling, and utility operations', async function () {
  const result = await this.corePage.evaluate(async () => {
    const root = document.querySelector('#fixture');
    root.innerHTML = `
      <section id="tree">
        <div class="branch" data-state="true" data-count="3" data-config='{"ready":true}'>
          <button class="leaf" type="button"><i>Leaf</i></button>
          <span class="peer">Peer</span>
        </div>
        <div class="branch second"><span class="peer">Second</span></div>
      </section>
      <div id="123" class="numeric-id"></div>
      <div class="box" style="width:100px;height:40px;padding:5px;border:2px solid;margin:3px"></div>
      <div class="before"></div><div class="after"></div>
      <div class="target"></div><div class="target"></div>
      <input id="check" type="checkbox" value="yes">
      <select id="choice"><option value="a">A</option><option value="b">B</option></select>`;
    const $tree = $('#tree');
    const $leaf = $('.leaf');
    const $branches = $('.branch');
    const traversal = {
      collection: [$branches.length, $branches.get(-1).className, $branches.eq(-1).end().length,
        $branches.first().length, $branches.last().length, $branches.slice(0, 1).length],
      index: [$branches.index(), $branches.index('.branch'), $('.peer').index()],
      predicates: [$leaf.is('button'), $leaf.filter('.leaf').length, $leaf.not('.leaf').length,
        $leaf.add('.peer').length, $tree.find('button').length],
      ancestry: [$leaf.parent().length, $leaf.parents('section').length, $leaf.closest('#tree').length,
        $tree.children('.branch').length, $leaf.contents().length, $('.leaf').siblings().length,
        $('.leaf').next().length, $('.peer').prev().length],
      numericSelector: $('div#123').hasClass('numeric-id'),
    };

    const $targets = $('.target');
    $targets.append('<b class="copy">copy</b>');
    $targets.prepend('<i class="first">first</i>');
    $('.before').before('<em class="inserted-before">before</em>');
    $('.after').after('<em class="inserted-after">after</em>');
    $('.inserted-after').replaceWith('<strong class="replacement">after</strong>');
    $('<u>appended</u>').appendTo('.before');
    $('<u>prepended</u>').prependTo('.after');
    $('.before').html(12);
    $('.before').text('reset');
    $('.before').append('<small>child</small>');
    const manipulation = {
      copies: $('.copy').length,
      order: Array.from($targets[0].children).map(node => node.className),
      replaced: $('.replacement').text(),
      html: $('.before').html(),
      text: $('.before').text(),
      clone: $('.branch').clone().length,
      contents: $tree.contents().length,
    };
    $('.replacement').empty().append('<span>again</span>').detach();
    $('.target').last().remove();
    manipulation.cleanup = [$('.replacement').length, $('.target').length];

    const $leafButton = $('.leaf');
    $leafButton.attr({ title: 'leaf', 'aria-label': 'Leaf' }).attr('title', null);
    $leafButton.prop({ disabled: true, tabIndex: 2 }).prop('disabled', false);
    $leafButton.addClass('hot warm').toggleClass('warm', false).removeClass('hot');
    $leafButton.toggleClass('selected').toggleClass('selected', false);
    const $box = $('.box');
    $box.css({ 'font-weight': 600, opacity: 0.5, width: '100px' });
    const style = $box.css(['font-weight', 'opacity', 'width']);
    $box.width(100);
    $box.css('overflow', 'auto').html('<div style="width:300px;height:120px"></div>');
    const sizes = {
      content: Math.round($box.width()),
      inner: Math.round($box.innerWidth()),
      outer: Math.round($box.outerWidth()),
      margins: Math.round($box.outerWidth(true)),
      height: Math.round($box.height()),
      hasClass: $leafButton.hasClass('selected'),
      attr: $leafButton.attr('aria-label'),
      noAttr: $leafButton.attr('title'),
      prop: $leafButton.prop('tabIndex'),
      style,
      offset: Object.values($box.offset()).every(Number.isFinite),
      position: Object.values($box.position()).every(Number.isFinite),
    };
    $box.hide();
    const hidden = $box.css('display');
    $box.toggle().show();
    const shown = $box.css('display');
    $box.animate({ opacity: 1 });
    $box.stop();
    $box.scrollTop(4).scrollLeft(3);
    const scroll = [$box.scrollTop(), $box.scrollLeft()];
    const windowDimensions = [$(window).width(), $(document).height()].every(Number.isFinite);
    $(window).scrollTop();
    $(window).scrollLeft();

    $('[data-state]').data('state');
    const data = $('[data-state]').data();
    $.data(root, 'sharedValue', 2);
    const shared = $.hasData(root) && $.data(root, 'sharedValue');
    $.removeData(root, 'sharedValue');
    $('[data-state]').data({ extraValue: 4 }).removeData('extra-value');
    const parsedData = [data.state, data.count, data.config.ready, $.parseHTML('<i>x</i>').length];
    parsedData.push($.parseJSON('{"x":1}').x, $.contains(root, $('.leaf')[0]), $.contains(root, root));

    const eachValues = [];
    $.each({ a: 1, b: 2 }, function (key, value) { eachValues.push(`${key}:${value}`); });
    const eachArray = [];
    $.each(['x', 'y'], function (index, value) { eachArray.push(`${index}:${value}`); });
    const list = [];
    $.grep([1, 2, 3], value => value > 1).forEach(value => list.push(value));
    const inverted = $.grep([1, 2, 3], value => value > 1, true);
    const mapped = $.map({ a: 1, b: 2 }, (value, key) => [key, value]);
    const arrayLike = $.makeArray($('.branch'));
    const merged = $.merge(['a'], ['b']);
    const proxyTarget = { base: 2, add(value) { return this.base + value; } };
    const boundProxy = $.proxy(function (prefix, value) { return `${prefix}:${this.base + value}`; }, proxyTarget, 'sum');
    const namedProxy = $.proxy(proxyTarget, 'add');
    const helpers = {
      eachValues, eachArray, list, inverted, mapped, arrayLike: arrayLike.length, merged,
      param: $.param({ q: 'a b', nested: { ids: [1, 2] } }),
      traditional: $.param({ ids: [1, 2] }, true),
      form: $.param([{ name: 'x', value: 'a b' }, { name: 'x', value: 2 }]),
      proxy: [boundProxy(3), namedProxy(4)],
      types: [$.type(null), $.type(2), $.isArray([]), $.isFunction(boundProxy),
        $.isPlainObject({}), $.isWindow(window), $.isEmptyObject({}), $.isNumeric('3')],
      misc: [$.inArray('b', ['a', 'b']), $.trim(' x '), $.now() > 0, $.noop() === undefined],
      makeScalars: [$.makeArray(null).length, $.makeArray('x')[0]],
      hasData: shared,
    };
    let effectDone = false;
    await new Promise(resolve => $box.fadeOut(function () { effectDone = true; resolve(); }));
    let readyContext;
    await new Promise(resolve => $(function ($instance) {
      readyContext = this === document && $instance === $;
      resolve();
    }));
    return {
      traversal, manipulation, sizes, hidden, shown, scroll, windowDimensions,
      parsedData, helpers, effectDone, readyContext,
    };
  });

  assert.deepEqual(result.traversal, {
    collection: [2, 'branch second', 2, 1, 1, 1],
    index: [0, 0, 1],
    predicates: [true, 1, 0, 3, 1],
    ancestry: [1, 1, 1, 2, 1, 1, 1, 1],
    numericSelector: true,
  });
  assert.deepEqual(result.manipulation, {
    copies: 2, order: ['first', 'copy'], replaced: 'after',
    html: 'reset<small>child</small>', text: 'resetchild',
    clone: 2, contents: 5, cleanup: [0, 1],
  });
  assert.equal(result.sizes.content, 100);
  assert.equal(result.sizes.inner, 110);
  assert.equal(result.sizes.outer, 114);
  assert.equal(result.sizes.margins, 120);
  assert.equal(result.sizes.height, 40);
  assert.equal(result.sizes.hasClass, false);
  assert.equal(result.sizes.attr, 'Leaf');
  assert.equal(result.sizes.noAttr, undefined);
  assert.equal(result.sizes.prop, 2);
  assert.equal(result.sizes.style['font-weight'], '600');
  assert.equal(result.sizes.style.opacity, '0.5');
  assert.equal(result.sizes.offset, true);
  assert.equal(result.sizes.position, true);
  assert.equal(result.hidden, 'none');
  assert.notEqual(result.shown, 'none');
  assert.deepEqual(result.scroll, [4, 3]);
  assert.equal(result.windowDimensions, true);
  assert.deepEqual(result.parsedData, [true, 3, true, 1, 1, true, false]);
  assert.deepEqual(result.helpers.eachValues, ['a:1', 'b:2']);
  assert.deepEqual(result.helpers.eachArray, ['0:x', '1:y']);
  assert.deepEqual(result.helpers.list, [2, 3]);
  assert.deepEqual(result.helpers.inverted, [1]);
  assert.deepEqual(result.helpers.mapped, ['a', 1, 'b', 2]);
  assert.equal(result.helpers.arrayLike, 2);
  assert.deepEqual(result.helpers.merged, ['a', 'b']);
  assert.equal(result.helpers.param, 'q=a+b&nested%5Bids%5D%5B%5D=1&nested%5Bids%5D%5B%5D=2');
  assert.equal(result.helpers.traditional, 'ids=1&ids=2');
  assert.equal(result.helpers.form, 'x=a+b&x=2');
  assert.deepEqual(result.helpers.proxy, ['sum:5', 6]);
  assert.deepEqual(result.helpers.types, ['null', 'number', true, true, true, true, true, true]);
  assert.deepEqual(result.helpers.misc.slice(0, 2), [1, 'x']);
  assert.deepEqual(result.helpers.misc.slice(2), [true, true]);
  assert.deepEqual(result.helpers.makeScalars, [0, 'x']);
  assert.equal(result.helpers.hasData, 2);
  assert.equal(result.effectDone, true);
  assert.equal(result.readyContext, true);
});

Then('the DOM shim dispatches namespaced events and settles deferred work', async function () {
  const result = await this.corePage.evaluate(() => {
    const root = document.querySelector('#fixture');
    root.innerHTML = '<div id="event-root"><button class="child">Run</button><input id="focus"></div>';
    const calls = [];
    const $root = $('#event-root');
    $root.on('click.outer', '.child', { source: 'delegated' }, function (event, value) {
      calls.push(`${event.data.source}:${this.className}:${value}`);
    });
    $root.on({
      'click.outer': () => calls.push('outer'),
      'click.other': () => calls.push('other'),
    });
    const once = () => calls.push('once');
    $('.child').one('click.once', once);
    $('.child').trigger('click.outer', ['payload']);
    $('.child').trigger('click.once');
    $('.child').trigger('click.once');
    $root.off('.outer');
    $('.child').trigger('click');
    $root.off('click.other');

    const short = [];
    $('#focus').on('custom.ns', event => { short.push(event.namespace); return 'result'; });
    $('#focus').on('custom.ns', event => { event.preventDefault(); short.push(event.isDefaultPrevented()); });
    const handled = $('#focus').triggerHandler($.Event('custom.ns', { detail: 7 }));
    const event = $.Event('manual');
    event.stopImmediatePropagation();
    short.push(event.isImmediatePropagationStopped(), event.isPropagationStopped());
    $('#focus').bind('keyup.legacy', () => short.push('bind'));
    $('#focus').trigger('keyup.legacy').unbind('.legacy');
    $('#focus').trigger('keyup.legacy');
    $('#focus').on('custom.remove', function (e) { $(this).off(e); calls.push('removed-current'); });
    $('#focus').trigger('custom.remove').trigger('custom.remove');
    let nativeFocus = 0;
    $('#focus').on('focus', () => nativeFocus++);
    $('#focus').trigger('focus');

    const deferredCalls = [];
    const deferred = $.Deferred();
    deferred.progress(value => deferredCalls.push(`progress:${value}`));
    deferred.done(value => deferredCalls.push(`done:${value}`));
    deferred.always(() => deferredCalls.push('always'));
    deferred.notify('working');
    deferred.resolveWith({ name: 'context' }, ['saved']);
    deferred.done(value => deferredCalls.push(`memory:${value}`));
    const chained = $.Deferred();
    const transformed = chained.then(value => value + 1);
    transformed.done(value => deferredCalls.push(`then:${value}`));
    chained.resolve(4);
    const rejected = $.Deferred();
    rejected.catch(error => deferredCalls.push(`catch:${error}`));
    rejected.reject('failure');
    const aggregate = [];
    $.when(2, $.Deferred(d => d.resolve('ready'))).done((first, second) => aggregate.push(first, second));
    $.when().done(() => aggregate.push('empty'));
    const child = $.Deferred(d => d.resolve('pass'));
    $.when(child).done(value => aggregate.push(value));
    return {
      calls, short, handled, nativeFocus, deferredCalls, aggregate,
      states: [deferred.state(), chained.state(), rejected.state()],
      promise: deferred.promise({ label: 'mixed' }).label,
      pipe: $.Deferred().pipe !== undefined,
      extend: $.extend(true, {}, { nested: { values: [1] } }, { nested: { extra: 2 } }),
    };
  });
  assert.deepEqual(result.calls, [
    'delegated:child:payload', 'outer', 'once', 'other', 'removed-current',
  ]);
  assert.deepEqual(result.short, ['ns', true, true, true, 'bind']);
  assert.equal(result.handled, 'result');
  assert.equal(result.nativeFocus, 1);
  assert.deepEqual(result.deferredCalls, [
    'progress:working', 'done:saved', 'always', 'memory:saved', 'then:5', 'catch:failure',
  ]);
  assert.deepEqual(result.aggregate, [2, 'ready', 'empty', 'pass']);
  assert.deepEqual(result.states, ['resolved', 'resolved', 'rejected']);
  assert.equal(result.promise, 'mixed');
  assert.equal(result.pipe, true);
  assert.deepEqual(result.extend, { nested: { values: [1], extra: 2 } });
});

Then('the DOM shim serializes requests and reports success, failure, and cancellation', { timeout: 15_000 }, async function () {
  const requests = [];
  await this.corePage.unroute('**/*');
  await this.corePage.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname !== 'core.test' || !url.pathname.startsWith('/shim-ajax')) {
      return route.abort('blockedbyclient');
    }
    requests.push({
      method: request.method(),
      url: request.url(),
      body: request.postData(),
      requestedWith: request.headers()['x-requested-with'],
      contentType: request.headers()['content-type'],
    });
    if (new URL(request.url()).pathname.endsWith('/missing')) {
      await route.fulfill({ status: 503, body: 'unavailable' });
    } else {
      await route.fulfill({ contentType: 'application/json', headers: { 'x-fixture': 'local' }, body: '{"ok":true}' });
    }
  });
  const result = await this.corePage.evaluate(async () => {
    const success = await new Promise(resolve => {
      $.ajax({
        url: '/shim-ajax/success',
        type: 'POST',
        data: { query: 'roads', filter: { active: true } },
        dataType: 'json',
        headers: { 'X-Test': 'shim' },
        success(data, status, xhr) {
          resolve({ data, status, header: xhr.getResponseHeader('x-fixture'), readyState: xhr.readyState });
        },
        complete(xhr, status) { window.ajaxComplete = status; },
      });
    });
    const failure = await new Promise(resolve => $.getJSON('/shim-ajax/missing').fail((xhr, status, error) => {
      resolve({ code: xhr.status, status, error });
    }));
    let canceled = false;
    const canceledRequest = $.ajax({
      url: '/shim-ajax/never',
      beforeSend() { return false; },
    }).fail((xhr, status) => { canceled = status === 'canceled'; });
    const query = $.param({ ids: [{ id: 1 }, { id: 2 }], empty: null, value() { return 'computed'; } });
    const shortcuts = await new Promise(resolve => $.getJSON('/shim-ajax/get', data => resolve(data)));
    return {
      success, failure, canceled, canceledState: canceledRequest.state(),
      complete: window.ajaxComplete, query, shortcuts,
    };
  });
  assert.deepEqual(result.success, { data: { ok: true }, status: 'success', header: 'local', readyState: 4 });
  assert.equal(result.failure.code, 503);
  assert.equal(result.failure.status, 'error');
  assert.equal(result.failure.error, 'Service Unavailable');
  assert.equal(result.canceled, true);
  assert.equal(result.canceledState, 'rejected');
  assert.equal(result.complete, 'success');
  assert.equal(result.query, 'ids%5B0%5D%5Bid%5D=1&ids%5B1%5D%5Bid%5D=2&empty=&value=computed');
  assert.deepEqual(result.shortcuts, { ok: true });
  assert.equal(requests.length, 3);
  assert.equal(requests[0].method, 'POST');
  assert.match(requests[0].body, /query=roads/);
  assert.match(requests[0].body, /filter%5Bactive%5D=true/);
  assert.equal(requests[0].requestedWith, 'XMLHttpRequest');
  assert.equal(requests[0].contentType, 'application/x-www-form-urlencoded; charset=UTF-8');
  assert.match(requests[1].url, /\/shim-ajax\/missing$/);
  assert.match(requests[2].url, /\/shim-ajax\/get$/);
});

Then('the date shim round-trips tokens, inputs, locale formats, and calendar operations', async function () {
  const result = await this.corePage.evaluate(() => {
    const date = moment('2024-04-03T13:05:06.789');
    const tokenFormat = 'YYYYYY YYYY YY Y Q MMMM MMM MM M DD D dddd ddd dd d E HH H hh h kk k mm m ss s S SS SSS SSSS SSSSSSSSS A a ZZ Z X x [UTC]';
    const rendered = date.format(tokenFormat);
    const roundTrip = moment(rendered, tokenFormat, 'en', true);
    const getters = moment('2024-01-15T08:09:10.011');
    const aliases = [
      getters.year(), getters.years(), getters.month(), getters.months(),
      getters.date(), getters.dates(), getters.day(), getters.days(),
      getters.hour(), getters.hours(), getters.minute(), getters.minutes(),
      getters.second(), getters.seconds(), getters.millisecond(), getters.milliseconds(),
    ];
    getters.years(2025).months(1).dates(28).days(4).hours(10).minutes(11).seconds(12).milliseconds(13);
    const units = moment('2024-06-15T13:27:39.444');
    const before = units.valueOf();
    units.add({ days: 1, hours: 2 }).subtract('days', 1).add(0.5, 'day');
    const calendar = {
      year: moment('2024-06-15').startOf('year').format('YYYY-MM-DD HH:mm:ss.SSS'),
      quarter: moment('2024-06-15').startOf('quarter').format('YYYY-MM-DD'),
      week: moment('2024-06-15').startOf('week').format('YYYY-MM-DD'),
      isoWeek: moment('2024-06-15').startOf('isoWeek').format('YYYY-MM-DD'),
      dayEnd: moment('2024-06-15').endOf('day').format('HH:mm:ss.SSS'),
      fractional: units.valueOf() - before,
    };
    const en = moment.localeData('en');
    const localized = moment('2024-04-03T13:05:06.789').locale('es');
    const spanish = {
      label: localized.format('LLLL'),
      month: localized.localeData().monthsShort()[3],
      weekdays: localized.localeData().weekdays(true).length,
      firstDay: localized.localeData().firstDayOfWeek(),
      formats: ['LT', 'LTS', 'L', 'LL', 'LLL', 'LLLL', 'l', 'll', 'lll', 'llll'].map(key => en.longDateFormat(key)),
    };
    const genitive = moment('2024-03-05').locale('pl').format('D MMMM');
    const inputs = [
      moment([2024, 1, 29]).format('YYYY-MM-DD'),
      moment({ year: 2024, month: 1, day: 29, hour: 5 }).format('YYYY-MM-DD HH'),
      moment({}).isValid(),
      moment(new Date(0)).valueOf(),
      moment(0).unix(),
      moment('2024-04', moment.ISO_8601).format('YYYY-MM-DD'),
      moment('2024-04-03', ['DD/MM/YYYY', 'YYYY-MM-DD'], 'en', true).format('YYYY-MM-DD'),
      moment('29 Feb 2024', 'D MMM YYYY', 'en').format('YYYY-MM-DD'),
      moment('Feb 29 2024', 'MMM D YYYY', 'en').format('YYYY-MM-DD'),
      moment('2024-02-29', 'YYYY-MM-DD', 'unsupported-locale').locale(),
    ];
    const twelveHour = [
      moment('12:15 AM', 'hh:mm A', 'en', true).format('HH:mm'),
      moment('12:15 PM', 'hh:mm A', 'en', true).format('HH:mm'),
    ];
    const offset = moment('2024-02-29T12:30+02:00', 'YYYY-MM-DDTHH:mmZ', 'en', true);
    const epochs = [
      moment('1700000000', 'X', 'en', true).valueOf(),
      moment('1700000000000', 'x', 'en', true).valueOf(),
    ];
    const dateSetter = moment('2024-01-31').month(1);
    const dateOverflow = moment('2024-02-29').date(32).format('YYYY-MM-DD');
    return {
      rendered,
      roundTrip: [roundTrip.isValid(), roundTrip.format('YYYY-MM-DD HH:mm:ss.SSS')],
      aliases,
      setters: getters.format('YYYY-MM-DD HH:mm:ss.SSS'),
      calendar,
      locale: [spanish.month, spanish.weekdays, spanish.firstDay, spanish.formats.every(Boolean), genitive],
      inputs,
      twelveHour,
      offsetValid: offset.isValid(),
      offsetInstant: offset.toISOString(),
      epochs,
      monthOverflow: dateSetter.format('YYYY-MM-DD'),
      dateOverflow,
      invalidStrict: moment('2024-2-29', 'YYYY-MM-DD', 'en', true).isValid(),
      forgiving: moment('on 2024-02-29', 'YYYY-MM-DD').format('YYYY-MM-DD'),
    };
  });
  assert.equal(result.roundTrip[0], true);
  assert.equal(result.roundTrip[1], '2024-04-03 13:05:06.789');
  assert.deepEqual(result.aliases, [2024, 2024, 0, 0, 15, 15, 1, 1, 8, 8, 9, 9, 10, 10, 11, 11]);
  assert.equal(result.setters, '2025-02-27 10:11:12.013');
  assert.deepEqual(result.calendar, {
    year: '2024-01-01 00:00:00.000', quarter: '2024-04-01',
    week: '2024-06-09', isoWeek: '2024-06-10', dayEnd: '23:59:59.999',
    fractional: 93600000,
  });
  assert.deepEqual(result.locale, ['abr.', 7, 1, true, '5 marca']);
  assert.deepEqual(result.inputs, [
    '2024-02-29', '2024-02-29 05', true, 0, 0, '2024-04-01',
    '2024-04-03', '2024-02-29', '2024-02-29', 'en',
  ]);
  assert.deepEqual(result.twelveHour, ['00:15', '12:15']);
  assert.equal(result.offsetValid, true);
  assert.equal(result.offsetInstant, '2024-02-29T10:30:00.000Z');
  assert.deepEqual(result.epochs, [1700000000000, 1700000000000]);
  assert.equal(result.monthOverflow, '2024-02-29');
  assert.equal(result.dateOverflow, '2024-03-03');
  assert.equal(result.invalidStrict, false);
  assert.equal(result.forgiving, '2024-02-29');
  assert.match(result.rendered, /Wednesday Wed We 3 3/);
});

Then('the date shim compares, reduces, and serializes date values', async function () {
  const result = await this.corePage.evaluate(() => {
    const jan = moment('2024-01-15T12:00:00');
    const feb = moment('2024-02-15T12:00:00');
    const invalid = moment.invalid();
    const clone = moment(jan).locale('fr');
    const before = jan.clone().isBefore(feb);
    const after = feb.isAfter(jan);
    const same = jan.isSame('2024-01-15T18:00:00', 'day');
    const date = moment('2024-01-15T12:00:00.500');
    return {
      comparisons: [
        before, after, same, jan.isSameOrBefore(feb), feb.isSameOrAfter(jan),
        jan.isBefore(feb, 'month'), feb.isAfter(jan, 'month'), jan.diff(feb, 'day'),
        jan.diff(feb, 'month'), jan.diff(feb, 'month', true),
        invalid.diff(jan), invalid.isBefore(jan), jan.isAfter(invalid),
      ],
      minimum: moment.min(jan, [feb, moment('2023-01-01')]).format('YYYY-MM-DD'),
      maximum: moment.max([jan, feb]).format('YYYY-MM-DD'),
      invalidWins: moment.min(jan, invalid).isValid(),
      emptyReduction: moment.max().isValid(),
      identity: [moment.isMoment(jan), moment.isMoment({ _isAMomentObject: true }), moment.isDate(new Date()), moment.isDate(jan)],
      conversion: [
        jan.unix(), jan.toDate().toISOString(), jan.toISOString(), jan.toJSON(),
        jan.toString(), jan.utcOffset(), jan.daysInMonth(), jan.localeData()._abbr,
        clone.locale(), clone.format('YYYY-MM-DD'), moment.locale('en'),
      ],
      invalidConversion: [invalid.format(), invalid.toISOString(), invalid.toJSON(), invalid.utcOffset(), invalid.daysInMonth()],
      units: [
        date.diff('2024-01-15T12:00:00', 'millisecond'),
        moment('2024-01-01').add(1, 'quarter').format('YYYY-MM-DD'),
        moment('2024-01-01').subtract(1, 'week').format('YYYY-MM-DD'),
        moment('2024-01-01').startOf('nonsense').format('YYYY-MM-DD'),
        moment('2024-01-01').add('fortnights', 2).format('YYYY-MM-DD'),
      ],
    };
  });
  assert.deepEqual(result.comparisons, [
    true, true, true, true, true, true, true, -31, -1, -1,
    NaN, false, false,
  ]);
  assert.equal(result.minimum, '2023-01-01');
  assert.equal(result.maximum, '2024-02-15');
  assert.equal(result.invalidWins, false);
  assert.equal(result.emptyReduction, true);
  assert.deepEqual(result.identity, [true, true, true, false]);
  assert.equal(result.conversion[0], Date.parse('2024-01-15T12:00:00') / 1000);
  assert.deepEqual(result.conversion.slice(1, 4), [
    new Date('2024-01-15T12:00:00').toISOString(),
    new Date('2024-01-15T12:00:00').toISOString(),
    new Date('2024-01-15T12:00:00').toISOString(),
  ]);
  assert.match(result.conversion[4], /Mon Jan 15 2024 12:00:00 GMT/);
  assert.equal(typeof result.conversion[5], 'number');
  assert.equal(result.conversion[6], 31);
  assert.deepEqual(result.conversion.slice(7), ['en', 'fr', '2024-01-15', 'en']);
  assert.deepEqual(result.invalidConversion, ['Invalid date', null, null, NaN, NaN]);
  assert.deepEqual(result.units, [500, '2024-04-01', '2023-12-25', '2024-01-01', '2024-01-01']);
});

Then('the select shim handles templates, user changes, tags, and teardown', async function () {
  const result = await this.corePage.evaluate(async () => {
    const fixture = document.querySelector('#fixture');
    fixture.innerHTML = `
      <select id="single">
        <option value="">Choose</option>
        <option value="roads" selected>Roads</option>
        <option value="parcels">Parcels</option>
      </select>
      <select id="multiple" multiple>
        <option value="red" selected>Red</option>
        <option value="blue">Blue</option>
      </select>`;
    const single = $('#single');
    const events = [];
    single.on('change', () => events.push('change'));
    single.on('select2:select', e => events.push(`select:${e.params.data.id}`));
    single.on('select2:unselect', e => events.push(`unselect:${e.params.data.id}`));
    single.select2({
      placeholder: { text: 'Pick a road' },
      allowClear: true,
      minimumResultsForSearch: 2,
      templateResult: data => `Result: ${data.text}`,
      templateSelection: data => Object.assign(document.createElement('strong'), { textContent: data.text }),
    });
    await Vue.nextTick();
    const instance = single.data('select2');
    const widget = instance.$container[0];
    const details = {
      hidden: single.attr('aria-hidden'),
      selected: single.select2('data').map(item => [item.id, item.text, item.selected]),
      getters: [instance.$container.length, instance.$selection.length, instance.$dropdown.length],
      searchable: widget.hasAttribute('searchable'),
      templated: widget.querySelector('x-option').textContent,
      selectionTemplate: widget.content.querySelector('strong')?.textContent,
      clearVisible: !widget.trigger.querySelector('.x-clear').hidden,
    };
    single.select2('open');
    const opened = widget.isOpen;
    single.select2('close');
    const closed = !widget.isOpen;
    single.select2('val', 'parcels');
    await Vue.nextTick();
    const value = single.select2('val');
    const selectedValue = single.select2('data')[0].id;
    const classTarget = single.select2('data').length && single.select2('data')[0].element;
    instance.$container.addClass('validation-error');
    single[0].disabled = true;
    await new Promise(resolve => setTimeout(resolve, 0));
    const rerender = instance.xs !== widget &&
      instance.$container.hasClass('validation-error') && instance.xs.hasAttribute('disabled');

    const current = instance.xs;
    current.select('roads');
    await Vue.nextTick();
    const nativeChange = single.val();
    const clear = instance.xs.trigger.querySelector('.x-clear');
    clear.click();
    await Vue.nextTick();
    const cleared = single.val();
    $(instance.xs).trigger($.Event('select2:select', { params: { data: { id: 'roads' } } }));
    const selectedByLegacyEvent = instance.xs.getAttribute('value');

    single.select2('destroy');
    const teardown = [
      !fixture.querySelector('#single + x-select'),
      !single.data('select2'),
      !single.attr('data-select2-id'),
      !single.attr('aria-hidden'),
      single[0].tabIndex !== -1,
    ];

    const multiple = $('#multiple');
    const multiEvents = [];
    multiple.on('change', () => multiEvents.push('change'));
    multiple.on('select2:select', e => multiEvents.push(`select:${e.params.data.id}`));
    multiple.on('select2:unselect', e => multiEvents.push(`unselect:${e.params.data.id}`));
    multiple.select2({ tags: true, minimumResultsForSearch: -1 });
    await Vue.nextTick();
    const multi = multiple.data('select2');
    const multiWidget = multi.xs;
    const multipleMode = multi._multiple && multiWidget.hasAttribute('multiple') &&
      multiWidget.hasAttribute('createTag') && !multiWidget.hasAttribute('searchable');
    multiWidget.select('blue');
    await Vue.nextTick();
    const multipleSelection = multiple.val();
    const tagOption = document.createElement('x-option');
    tagOption.setAttribute('value', 'custom-tag');
    tagOption.textContent = 'Custom tag';
    multiWidget.append(tagOption);
    multiWidget.select('custom-tag');
    await Vue.nextTick();
    const tag = Array.from(multiple[0].options).find(option => option.value === 'custom-tag');
    const tagCreated = Boolean(tag && tag.getAttribute('data-select2-tag') === 'true');
    const data = multiple.select2('data').map(item => [item.id, item.text, item.selected]);
    multiple.val(['red']).trigger('change');
    await Vue.nextTick();
    const nativeSync = multi.xs !== multiWidget && multiple.val();
    multiple.select2('destroy');
    document.querySelector('#fixture').innerHTML = '';
    return {
      details, opened, closed, value, selectedValue, classTarget: classTarget.textContent,
      rerender, nativeChange, cleared, events, selectedByLegacyEvent, teardown,
      multipleMode, multipleSelection, tagCreated, data, multiEvents, nativeSync,
    };
  });
  assert.equal(result.details.hidden, 'true');
  assert.deepEqual(result.details.selected, [['roads', 'Roads', true]]);
  assert.deepEqual(result.details.getters, [1, 1, 1]);
  assert.equal(result.details.searchable, true);
  assert.equal(result.details.templated, 'Result: Choose');
  assert.equal(result.details.selectionTemplate, 'Roads');
  assert.equal(result.details.clearVisible, true);
  assert.equal(result.opened, true);
  assert.equal(result.closed, true);
  assert.equal(result.value, 'parcels');
  assert.equal(result.selectedValue, 'parcels');
  assert.equal(result.classTarget, 'Parcels');
  assert.equal(result.rerender, true);
  assert.equal(result.nativeChange, 'roads');
  assert.equal(result.cleared, null);
  assert.deepEqual(result.events, ['change', 'change', 'select:roads', 'unselect:roads', 'change', 'change', 'select:roads']);
  assert.equal(result.selectedByLegacyEvent, 'roads');
  assert.deepEqual(result.teardown, [true, true, true, true, true]);
  assert.equal(result.multipleMode, true);
  assert.deepEqual(result.multipleSelection, ['red', 'blue']);
  assert.equal(result.tagCreated, true);
  assert.deepEqual(result.data, [['red', 'Red', true], ['blue', 'Blue', true], ['custom-tag', 'custom-tag', true]]);
  assert.deepEqual(result.multiEvents, ['change', 'select:blue', 'change', 'select:custom-tag', 'change']);
  assert.deepEqual(result.nativeSync, ['red']);
});

Then('the date-time shim publishes navigation, selection, and keyboard events', async function () {
  const result = await this.corePage.evaluate(() => {
    const clickAction = action => {
      const target = document.querySelector(`[data-action="${action}"]`);
      if (!target) throw new Error(`Missing date-time action: ${action}`);
      target.click();
    };
    const fixture = document.querySelector('#fixture');
    fixture.innerHTML = '<input id="date" value="2024-02-10 11:20:30">';
    const field = $('#date');
    const events = [];
    field.on('dp.show', () => events.push('show'));
    field.on('dp.update', event => events.push(`update:${event.viewDate.format('YYYY-MM-DD')}`));
    field.on('dp.change', event => events.push(`change:${event.date ? event.date.format('YYYY-MM-DD HH:mm:ss') : 'clear'}`));
    field.on('dp.hide', () => events.push('hide'));
    field.datetimepicker({ format: 'YYYY-MM-DD HH:mm:ss', useCurrent: false });
    const picker = field.data('DateTimePicker');
    const getter = picker.date().format('YYYY-MM-DD HH:mm:ss');
    field[0].focus();
    const shown = Boolean(document.querySelector('.datetimepicker'));
    clickAction('previous');
    clickAction('next');
    document.querySelector('.datepicker .picker-switch').click();
    const monthsShown = document.querySelector('.datepicker.show-months') !== null;
    document.querySelector('.datepicker .picker-switch').click();
    const yearsShown = document.querySelector('.datepicker.show-years') !== null;
    const year = document.querySelector('.years [data-action="selectYear"][data-year="2024"]');
    if (!year) throw new Error('Missing 2024 year option');
    year.click();
    const selectedYear = picker.date().year();
    document.querySelector('.months [data-action="selectMonth"][data-month="1"]').click();
    const selectedMonth = picker.date().month();
    document.querySelector('.days [data-action="selectDay"][data-date="2024-02-12"]').click();
    const selectedDate = picker.date().format('YYYY-MM-DD HH:mm:ss');
    clickAction('incrementHours');
    clickAction('decrementHours');
    clickAction('incrementMinutes');
    clickAction('decrementMinutes');
    clickAction('incrementSeconds');
    clickAction('decrementSeconds');
    const stableTime = field.val();
    field.val('');
    field[0].dispatchEvent(new Event('change', { bubbles: true }));
    const cleared = picker.date() === null && field.val() === '';
    field[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    const openedByKey = Boolean(document.querySelector('.datetimepicker'));
    field[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const closedByKey = !document.querySelector('.datetimepicker');
    const currentField = document.createElement('input');
    fixture.append(currentField);
    $(currentField).datetimepicker({ format: 'YYYY-MM-DD', useCurrent: 'day' });
    currentField.focus();
    const todaySet = moment(currentField.value, 'YYYY-MM-DD', true).isValid();
    $(currentField).data('DateTimePicker').hide();

    const timeFixture = document.createElement('div');
    timeFixture.innerHTML = '<input id="time" value="2024-02-10 11:20 AM">';
    fixture.append(timeFixture);
    const timeField = $('#time');
    timeField.datetimepicker({ format: 'YYYY-MM-DD h:mm A', useCurrent: false });
    timeField[0].focus();
    clickAction('togglePeriod');
    const period = timeField.data('DateTimePicker').date().format('A');
    clickAction('close');
    const closedByButton = !timeFixture.querySelector('.datetimepicker');
    return {
      getter, shown, monthsShown, yearsShown, selectedYear, selectedMonth,
      selectedDate, stableTime, todaySet, cleared, openedByKey, closedByKey,
      period, closedByButton, events,
    };
  });
  assert.equal(result.getter, '2024-02-10 11:20:30');
  assert.equal(result.shown, true);
  assert.equal(result.monthsShown, true);
  assert.equal(result.yearsShown, true);
  assert.equal(result.selectedYear, 2024);
  assert.equal(result.selectedMonth, 1);
  assert.equal(result.selectedDate, '2024-02-12 11:20:30');
  assert.match(result.stableTime, /2024-02-12 11:20:30/);
  assert.equal(result.todaySet, true);
  assert.equal(result.cleared, true);
  assert.equal(result.openedByKey, true);
  assert.equal(result.closedByKey, true);
  assert.equal(result.period, 'PM');
  assert.equal(result.closedByButton, true);
  assert.ok(result.events.includes('update:2024-01-10'));
  assert.ok(result.events.includes('update:2024-02-10'));
  assert.ok(result.events.includes('change:2024-02-12 11:20:30'));
  assert.ok(result.events.includes('hide'));
});

Then('the date-time shim rejects invalid dates and honors its lifecycle options', async function () {
  const result = await this.corePage.evaluate(() => {
    const fixture = document.querySelector('#fixture');
    fixture.innerHTML = `
      <div id="group" class="input-group">
        <input id="constrained" readonly>
        <button class="input-group-addon" type="button">Calendar</button>
      </div>
      <input id="empty">`;
    const field = $('#group');
    const input = $('#constrained');
    const events = [];
    field.on('dp.error', event => events.push(`error:${event.date.format('YYYY-MM-DD')}`));
    field.on('dp.change', event => events.push(`change:${event.date ? event.date.format('YYYY-MM-DD') : 'clear'}`));
    field.datetimepicker({
      format: 'YYYY-MM-DD',
      useCurrent: false,
      ignoreReadonly: true,
      minDate: '2024-02-01',
      maxDate: moment('2024-02-29'),
      enabledDates: ['2024-02-10', '2024-02-20'],
      disabledDates: ['2024-02-20'],
    });
    const picker = field.data('DateTimePicker');
    const limits = [
      picker.minDate().format('YYYY-MM-DD'),
      picker.maxDate().format('YYYY-MM-DD'),
      Object.keys(picker.enabledDates()).sort(),
    ];
    picker.date('2024-02-09');
    const unchangedAfterInvalid = picker.date() === null;
    picker.date('2024-02-20');
    const disabledByRule = picker.date() === null;
    picker.date(moment('2024-02-10'));
    const selected = picker.date().format('YYYY-MM-DD');
    picker.minDate('2024-02-08').maxDate('2024-02-25');
    const updatedLimits = [picker.minDate().format('YYYY-MM-DD'), picker.maxDate().format('YYYY-MM-DD')];
    picker.enabledDates(['2024-02-11']);
    const replacedAllowList = Object.keys(picker.enabledDates());
    const clearedLimits = picker.minDate(false).maxDate(null) === picker;
    picker.maxDate('2024-02-29');
    const clearedMaxDate = picker.maxDate().format('YYYY-MM-DD');
    input[0].dispatchEvent(new Event('change', { bubbles: true }));
    input.val('');
    input[0].dispatchEvent(new Event('change', { bubbles: true }));
    const component = fixture.querySelector('.input-group-addon');
    component.click();
    const openedByComponent = Boolean(fixture.querySelector('.datetimepicker'));
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    const closedOutside = !fixture.querySelector('.datetimepicker');

    const readOnly = document.createElement('input');
    readOnly.readOnly = true;
    fixture.append(readOnly);
    $(readOnly).datetimepicker({ format: 'YYYY-MM-DD', useCurrent: false });
    readOnly.focus();
    const blockedReadonly = !fixture.querySelector('.datetimepicker');
    readOnly.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    const stillBlocked = !fixture.querySelector('.datetimepicker');

    const empty = $('#empty');
    let initializedError = '';
    try { empty.datetimepicker('date'); } catch (error) { initializedError = error.message; }
    let missingInputError = '';
    try { $('<div></div>').datetimepicker(); } catch (error) { missingInputError = error.message; }
    return {
      limits, unchangedAfterInvalid, disabledByRule, selected, updatedLimits,
      replacedAllowList, clearedLimits, clearedMaxDate,
      events, openedByComponent, closedOutside, blockedReadonly, stillBlocked,
      initializedError, missingInputError,
    };
  });
  assert.deepEqual(result.limits, ['2024-02-01', '2024-02-29', ['2024-02-10', '2024-02-20']]);
  assert.equal(result.unchangedAfterInvalid, true);
  assert.equal(result.disabledByRule, true);
  assert.equal(result.selected, '2024-02-10');
  assert.deepEqual(result.updatedLimits, ['2024-02-08', '2024-02-25']);
  assert.deepEqual(result.replacedAllowList, ['2024-02-11']);
  assert.equal(result.clearedLimits, true);
  assert.equal(result.clearedMaxDate, '2024-02-29');
  assert.deepEqual(result.events, ['error:2024-02-09', 'error:2024-02-20', 'change:2024-02-10', 'error:2024-02-10', 'change:clear']);
  assert.equal(result.openedByComponent, true);
  assert.equal(result.closedOutside, true);
  assert.equal(result.blockedReadonly, true);
  assert.equal(result.stillBlocked, true);
  assert.match(result.initializedError, /not using DateTimePicker/);
  assert.match(result.missingInputError, /without an input element/);
});
