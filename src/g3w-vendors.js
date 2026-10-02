/**
 * @file
 * @since 3.11.0
 */

// polyfills
import '@ungap/with-resolvers';
import 'invokers-polyfill';
import 'temporal-polyfill/global'; // installed only when native Temporal is missing

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
import { jQuery }           from 'shims/jquery';
import { moment }           from 'shims/moment';
import { select2 }          from 'shims/select2';
import { datetimepicker }   from 'shims/datetimepicker';

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
 * jQuery v2.2 compatible API backed by native DOM
 */
globalThis.$ = globalThis.jQuery = jQuery;

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

/**
 * select2 compatible jQuery plugin backed by <x-select>
 */
select2(jQuery);

/**
 * Moment.js compatible API backed by native Temporal
 */
globalThis.moment = moment;

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

/**
 * Native date-time picker widget compatible with legacy jQuery API.
 */
datetimepicker($);
