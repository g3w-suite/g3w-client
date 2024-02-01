import ApplicationState from "store/application-state";
import GUI from 'services/gui';
const Control = require('./control');
const { toRawType, XHR } = require('core/utils/utils');
const Projections = require('g3w-ol/projection/projections');
/**
 * Classes for all element of dom control
 * @type {{country: string, hidden: string, city: string, road: string, spin: string, namespace: string, inputText: {container: string, result: string, input: string, reset: string, control: string}, olControl: string, inputResetId: string, inputQueryId: string}}
 */
const cssClasses = {
  namespace: "ol-geocoder",
  spin: "gcd-pseudo-rotate",
  hidden: "gcd-hidden",
  inputQueryId: "gcd-input-query",
  inputResetId: "gcd-input-reset",
  country: "gcd-country",
  city: "gcd-city",
  road: "gcd-road",
  olControl: "ol-control",
  inputText: {
    container: "gcd-txt-container",
    control: "gcd-txt-control",
    input: "gcd-txt-input",
    reset: "gcd-txt-reset",
    result: "gcd-txt-result"
  }
};

const utils = {
  isNumeric(str) {
    return /^\d+$/.test(str);
  },
  classRegex(classname) {
    return new RegExp(("(^|\\s+) " + classname + " (\\s+|$)"));
  },
  /**
   * @param {Element|Array<Element>} element DOM node or array of nodes.
   * @param {String|Array<String>} classname Class or array of classes.
   * For example: 'class1 class2' or ['class1', 'class2']
   * @param {Number|undefined} timeout Timeout to remove a class.
   */
  addClass(element, classname, timeout) {
    if (Array.isArray(element)) {
      element.forEach(each => this.addClass(each, classname));
      return;
    }
    const array = (Array.isArray(classname))
      ? classname
      : classname.split(/\s+/);
    let i = array.length;

    while (i--) {
      if (!this.hasClass(element, array[i])) this._addClass(element, array[i], timeout);
    }
  },
  _addClass(el, klass, timeout) {
    // use native if available
    if (el.classList) el.classList.add(klass);
    else el.className = (el.className + ' ' + klass).trim();
    if (timeout && this.isNumeric(timeout)) setTimeout( () => this._removeClass(el, klass), timeout);
  },
  /**
   * @param {Element|Array<Element>} element DOM node or array of nodes.
   * @param {String|Array<String>} classname Class or array of classes.
   * For example: 'class1 class2' or ['class1', 'class2']
   * @param {Number|undefined} timeout Timeout to add a class.
   */
  removeClass(element, classname, timeout) {
    if (Array.isArray(element)) {
      element.forEach(each => this.removeClass(each, classname, timeout));
      return;
    }
    const array = (Array.isArray(classname))
      ? classname
      : classname.split(/\s+/);
    let i = array.length;

    while (i--) {
      if (this.hasClass(element, array[i])) this._removeClass(element, array[i], timeout);
    }
  },
  _removeClass(el, klass, timeout) {
    if (el.classList) el.classList.remove(klass);
    else el.className = (el.className.replace(this.classRegex(klass), ' ')).trim();
    if (timeout && this.isNumeric(timeout)) setTimeout( () => this._addClass(el, klass), timeout);
  },
  /**
   * @param {Element} element DOM node.
   * @param {String} classname Classname.
   * @return {Boolean}
   */
  hasClass(element, c) {
    // use native if available
    return element.classList ? element.classList.contains(c) : this.classRegex(c).test(element.className);
  },
  /**
   * @param {Element|Array<Element>} element DOM node or array of nodes.
   * @param {String} classname Classe.
   */
  toggleClass(element, classname) {
    if (Array.isArray(element)) {
      element.forEach( each => this.toggleClass(each, classname));
      return;
    }
    // use native if available
    if (element.classList) element.classList.toggle(classname);
    else {
      if (this.hasClass(element, classname)) this._removeClass(element, classname);
      else this._addClass(element, classname);
    }
  },
  /**
   * Abstraction to querySelectorAll for increased
   * performance and greater usability
   * @param {String} selector
   * @param {Element} context (optional)
   * @param {Boolean} find_all (optional)
   * @return (find_all) {Element} : {Array}
   */
  find(selector, context, find_all) {
    if(context === void 0) context = window.document;
    let simpleRe = /^(#?[\w-]+|\.[\w-.]+)$/,
      periodRe = /\./g,
      slice = Array.prototype.slice,
      matches = [];
    // Redirect call to the more performant function
    // if it's a simple selector and return an array
    // for easier usage
    if (simpleRe.test(selector)) {
      switch (selector[0]) {
        case '#':
          matches = [this.$(selector.substr(1))];
          break;
        case '.':
          matches = slice.call(context.getElementsByClassName(
            selector.substr(1).replace(periodRe, ' ')));
          break;
        default:
          matches = slice.call(context.getElementsByTagName(selector));
      }
    } else {
      // If not a simple selector, query the DOM as usual
      // and return an array for easier usage
      matches = slice.call(context.querySelectorAll(selector));
    }
    return find_all ? matches : matches[0];
  },
  $(id) {
    id = (id[0] === '#') ? id.substr(1, id.length) : id;
    return document.getElementById(id);
  },
  isElement(obj) {
    // DOM, Level2
    if ('HTMLElement' in window) return (!!obj && obj instanceof HTMLElement);
    // Older browsers
    return (!!obj && typeof obj === 'object' && obj.nodeType === 1 &&
      !!obj.nodeName);
  },
  getAllChildren(node, tag) {
    return [].slice.call(node.getElementsByTagName(tag));
  },
  isEmpty(str) {
    return (!str || 0 === str.length);
  },
  emptyArray(array) {
    while (array.length) {
      array.pop();
    }
  },
  anyMatchInArray(source, target) {
    return source.some(each => target.indexOf(each) >= 0);
  },
  everyMatchInArrayy(arr1, arr2) {
    return arr2.every(each => arr1.indexOf(each) >= 0);
  },
  anyItemHasValue(obj, has) {
    if (has === undefined) has = false;
    const keys = Object.keys(obj);
    keys.forEach(key=>  {
      if (!this.isEmpty(obj[key])) {
        has = true;
      }
    });
    return has;
  },
  removeAllChildren(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  },
  removeAll(collection) {
    let node;
    while ((node = collection[0])) {
      node.parentNode.removeChild(node);
    }
  },
  getChildren(node, tag) {
    return [].filter.call(
      node.childNodes, function (el) {
        return tag
          ? el.nodeType === 1 && el.tagName.toLowerCase() === tag
          : el.nodeType === 1;
      }
    );
  },
  template(html, row) {
    return html.replace(/\{ *([\w_-]+) *\}/g, (htm, key) => {
      const value = (row[key] === undefined) ? '' : row[key];
      return this.htmlEscape(value);
    });
  },
  htmlEscape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
  createElement(node, html) {
    let elem;
    if (Array.isArray(node)) {
      elem = document.createElement(node[0]);
      if (node[1].id) elem.id = node[1].id;
      if (node[1].classname) elem.className = node[1].classname;
      if (node[1].attr) {
        const attr = node[1].attr;
        if (Array.isArray(attr)) {
          let i = -1;
          while (++i < attr.length) {
            elem.setAttribute(attr[i].name, attr[i].value);
          }
        } else elem.setAttribute(attr.name, attr.value);
      }
    } else elem = document.createElement(node);
    elem.innerHTML = html;
    const frag = document.createDocumentFragment();
    while (elem.childNodes[0]) {
      frag.appendChild(elem.childNodes[0]);
    }
    elem.appendChild(frag);
    return elem;
  }
};

/**
 * Providers
 */
class Nominatim {
  constructor(options={}) {
    this.id = 'Nominatim (OSM)';
    this.active = true;
    const extent = ol.proj.transformExtent(options.viewbox, options.mapCrs, 'EPSG:4326');
    this.settings = {
      url: 'https://nominatim.openstreetmap.org/search',
      params: {
        q: '',
        format: 'json',
        addressdetails: 1,
        limit: 10
      },
      extent,
      viewbox: extent.join(',')
    };
  }
  getParameters(options) {
    const {url, viewbox, params:{limit}} = this.settings;
    return {
      url,
      params: {
        q: options.query,
        format: 'json',
        addressdetails: 1,
        limit: options.limit || limit,
        viewbox,
        bounded: 1
      }
    };
  };
  handleResponse(response=[]) {
    const results = response
      .filter(place => ol.extent.containsXY(this.settings.extent, place.lon, place.lat))
      .map(result => ({
          lon: result.lon,
          lat: result.lat,
          address: {
            name: result.address.neighbourhood || '',
            road: result.address.road || '',
            postcode: result.address.postcode,
            city: result.address.city || result.address.town,
            state: result.address.state,
            country: result.address.country
          },
          original: {
            formatted: result.display_name,
            details: result.address
          }
        })
      );
    return {
      results,
      header: {
        title: this.id
      }
    }
  }
}

class Google {
  constructor(options={}) {
    this.id = 'Google';
    this.active = ApplicationState.keys.vendorkeys.google !== undefined; // PUT HERE A CONDITION TO ACTIVATE OR NOT GOODGLE GEOCODING PROVIDER
    const extent = ol.proj.transformExtent(options.viewbox, options.mapCrs, 'EPSG:4326');
    this.settings = {
      url: 'https://maps.googleapis.com/maps/api/geocode/json',
      extent,
      viewbox: `${extent[1]},${extent[0]}|${extent[3]},${extent[2]}`
    };
  }
  getParameters(options={}) {
    const { lang:language } = options;
    const {url, viewbox } = this.settings;
    const params = {
      address: options.query,
      key: ApplicationState.keys.vendorkeys.google,
      bounds: viewbox,
      language
    };

    return {
      url,
      params
    };
  };
  handleResponse(response= {}) {
    let results = []; // Set  to be an Array

    if (response.status === 'OK') {
      results = response.results
        .filter(result => ol.extent.containsXY(this.settings.extent, result.geometry.location.lng, result.geometry.location.lat))
        .map(result => {
          let name,
            road,
            city,
            postcode,
            state,
            country;
          result.address_components.forEach(({types, short_name, long_name}) => {
            if (types.find( type => type === 'route')) name = long_name;
            else if (types.find( type => type === 'locality')) city = long_name;
            else if (types.find( type => type === 'country')) country = long_name
          });
          return {
            lon: result.geometry.location.lng,
            lat: result.geometry.location.lat,
            address: {
              name,
              road,
              postcode: '',
              city,
              state,
              country
            },
            original: {
              formatted: result.display_name,
              details: result.address
            }
          };
        })
    } else if (response.status === 'REQUEST_DENIED') { /* disable google geocoding provider on API key error */
      this.active = false;
    }

    return {
      results,
      header: {
        title: this.id
      }
    }
  }
}

/**
 * Geocoding class
 * @param options
 * @constructor
 */
function GeocodingControl(options={}) {
  this.options = {
    provider: 'osm',
    placeholder: options.placeholder || 'Città, indirizzo ... ',
    noresults: options.noresults || 'Nessun risultato ',
    notresponseserver: options.notresponseserver || 'Il server non risponde',
    lang: ApplicationState.language || 'it-IT',
    limit: options.limit || 5,
    keepOpen: true,
    preventDefault: false,
    autoComplete: false,
    autoCompleteMinLength: 4,
    debug: false,
    viewbox: options.bbox,
    bounded: 1,
    mapCrs: options.mapCrs,
    fontIcon: GUI.getFontClass('search')
  };

  const {placeholder, fontIcon, mapCrs, viewbox} = this.options;
  /**
   * Providers
   * @type []
   */
  this.providers = [
    new Google({
      mapCrs,
      viewbox
    }),
    new Nominatim({
      mapCrs,
      viewbox
    }),
  ];

  /**
   * Layer to show marker after search
   * IN FUTURE SET AS CONTROL UTILITY (at moment duplicate also in GEOLOCATION CONTROL)
   */

  this.layer = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: new ol.style.Style({
      text: new ol.style.Text({
        offsetY: -15, //move marker icon on base point coordinate and not center
        text: '\uf3c5',
        font: '900 3em "Font Awesome 5 Free"',
        stroke: new ol.style.Stroke({
          color: 'red',
          width: 3
        }),
        fill: new ol.style.Fill({
          color: 'rgba(255, 0,0, 0.7)'
        })
      })
    })
  });

  this.projection;

  const containerClass = `${cssClasses.namespace} ${cssClasses.inputText.container}`;
  const self = this;

  const GeocoderVueContainer = Vue.extend({
    functional: true,
    render(h){
      return h('div', {class: {[containerClass]: true}}, [
        h('div', {
          class: {
            [cssClasses.inputText.control]: true,
          }
        }, [
          h('input', {
            attrs: {
              type: 'text',
              id: cssClasses.inputQueryId,
              autocomplete: 'off'
            },
            class:{
              [cssClasses.inputText.input]: true
            },
            directives:[
              {
                name: 't-placeholder',
                value: placeholder
              }
            ]
          }),
          h('button', {
            attrs: {
              type: 'button',
              id: 'search_nominatim'
            },
            class:{
              btn: true
            },
            on: {
              click() {
                const value = $(`input.${cssClasses.inputText.input}`).val();
                self.query(value);
              }
            }
          }, [h('i', {
            attrs: {
              'aria-hidden': true
            },
            style: {
              color:'#ffffff'
            },
            class: {
              [fontIcon]: true
            }
          })]),
          h('button', {
            attrs: {
              type: 'button',
              id:  cssClasses.inputResetId
            },
            class: {
              [`${cssClasses.inputText.reset}  ${cssClasses.hidden}`]: true
            }
          }),
        ]),
        h('ul', {
          class: {
            [cssClasses.inputText.result]: true
          }
        })])
    }
  });
  this.container = new GeocoderVueContainer().$mount().$el;
  this.lastQuery = '';
  this.registeredListeners = {
    mapClick: false
  };

  this.showMarker = function(coordinates, options={transform: true}) {
    const {transform} = options;
    this.hideMarker();
    coordinates = transform ? ol.proj.transform(coordinates, 'EPSG:4326', this.getMap().getView().getProjection()) : coordinates;
    const geometry =  new ol.geom.Point(coordinates);
    const feature = new ol.Feature(geometry);
    this.layer.getSource().addFeature(feature);
    this.getMap().addLayer(this.layer);
    GUI.getService('map').zoomToGeometry(geometry)
  };

  this.hideMarker = function(){
    this.layer.getSource().clear();
    this.getMap().removeLayer(this.layer);
  };
  /**
   * Methods
   */
  this.createControl = function() {
    let timeout, lastQuery;
    this.control = utils.find('.' + cssClasses.inputText.control, this.container);
    this.input = utils.find('.' + cssClasses.inputText.input, this.container);
    this.reset = utils.find('.' + cssClasses.inputText.reset, this.container);
    this.result = utils.find('.' + cssClasses.inputText.result, this.container);
    const query =  evt => {
      const value = evt.target.value.trim();
      const hit = evt.key ? evt.key === 'Enter' : evt.which ? evt.which === 13 : evt.keyCode ? evt.keyCode === 13 : false;
      if (hit) {
        evt.preventDefault();
        this.query(value);
      }
    };
    const reset = () => {
      this.input.focus();
      this.input.value = '';
      this.lastQuery = '';
      utils.addClass(this.reset, cssClasses.hidden);
      this.clearResults();
    };
    const handleValue =  evt => {
      const value = evt.target.value.trim();
      value.length ? utils.removeClass(this.reset, cssClasses.hidden) : utils.addClass(this.reset, cssClasses.hidden);
      if (this.options.autoComplete && value !== lastQuery) {
        lastQuery = value;
        timeout && clearTimeout(timeout);
        timeout = setTimeout( () =>  (value.length >= this.options.autoCompleteMinLength) && this.query(value), 200);
      }
    };
    this.input.addEventListener('keyup', query, false);
    this.input.addEventListener('input', handleValue, false);
    this.reset.addEventListener('click', reset, false);
  };
  this.query = function(q) {
    /**
     * Clear source
     */
    this.hideMarker();
    return new Promise(async (resolve, reject) => {
      const isNumber = value => toRawType(value) === 'Number' && !Number.isNaN(value);
      let coordinates = null;
      let transform = false;
      if (q) {
        const [x, y, epsg] = q.split(',');
        coordinates = isNumber(1*x) && isNumber(1*y) ? [1*x, 1*y] : null;
        const projection = epsg && await Projections.registerProjection(`EPSG:${epsg.trim()}`);
        try {
          /**
           * check if is sett epsg code and if is register on project
           */
          if (projection) {
            coordinates = ol.proj.transform(coordinates, projection.getCode(), 'EPSG:4326');
            transform = true;
          }
        } catch(err){}
      }
      if (coordinates) {
        this.showMarker(coordinates, {
          transform
        });
        resolve(coordinates);
      } else {
        if (this.lastQuery === q && this.result.firstChild) { return; }
        const promises = [];
        /**
         * For loop to active Providers
         */
        const providers = this.providers.filter(provider => provider.active);
        providers.forEach(provider => {
          const {url, params} = provider.getParameters({
            query: q,
            lang: this.options.lang,
            countrycodes: this.options.countrycodes,
            limit: this.options.limit
          });
          this.lastQuery = q;
          this.clearResults();
          utils.addClass(this.reset, cssClasses.spin);
          promises.push(XHR.get({
            url,
            params
          }))
        });
        const responses = await Promise.allSettled(promises);
        responses.forEach(({status, value: response}, index) => {
          if (status === 'fulfilled') {
            const {header, results} = providers[index].handleResponse(response);
            if (providers[index].active) {
              this.createList({
                header,
                results
              });
            }
          }
        });
        utils.removeClass(this.reset, cssClasses.spin);
      }
    })
  };
  this.createList = function({header, results={}}={}) {
    const ul = this.result;
    ul.appendChild(this.createHeaderProviderResults(header));
    if (results.length) {
      results.forEach(result => {
        const addressHtml = this.addressTemplate(result.address),
          html = ['<a href="#">', addressHtml, '</a>'].join(''),
          li = utils.createElement('li', html);
        li.addEventListener('click', evt => {
          evt.preventDefault();
          this.chosen(result, addressHtml, result.address, result.original);
        }, false);
        ul.appendChild(li);
      });
    } else {
      const {noresults} = this.options;
      const elementVue = Vue.extend({
        functional: true,
        render(h){
          return h('li', {
            class: {
              'nominatim-noresult': true
            },
            directives:[{name: 't', value: noresults}]
          })
        }
      });
      const li = new elementVue().$mount().$el;
      ul.appendChild(li);
    }
  };
  this.chosen = function(place, addressHtml, addressObj, addressOriginal) {
    const coord = [parseFloat(place.lon), parseFloat(place.lat)];
    this.options.keepOpen === false && this.clearResults(true);
    this.showMarker(coord);
  };
  this.createHeaderProviderResults = function(header={}){
    const headerNodeElement = `
      <div style="display: flex; justify-content: space-between; padding: 5px">
        <span  style="color: #FFFFFF; font-weight: bold">${header.title}</span>
      </div>`;
    const li = utils.createElement('li', headerNodeElement);
    li.classList.add("skin-background-color");
    return li;
  };

  this.addressTemplate = function(address) {
    const html = [];
    if (address.name) html.push(['<div class="', cssClasses.road, '">{name}</div>'].join(''));
    if (address.road || address.building || address.house_number) {
      html.push([
        '<div class="', cssClasses.road,
        '">{building} {road} {house_number}</div>'
      ].join(''));
    }
    if (address.city || address.town || address.village) {
      html.push([
        '<div class="', cssClasses.city,
        '">{postcode} {city} {town} {village}</div>'
      ].join(''));
    }
    if (address.state || address.country) {
      html.push([
        '<div class="', cssClasses.country, '">{state} {country}</div>'
      ].join(''));
    }
    return utils.template(html.join('<br>'), address);
  };
  this.expand = function() {
    utils.removeClass(this.input, cssClasses.spin);
    utils.addClass(this.control, cssClasses.glass.expanded);
    setTimeout( () =>  this.input.focus(), 100);
  };
  this.collapse = function() {
    this.input.value = '';
    this.input.blur();
    utils.addClass(this.reset, cssClasses.hidden);
    this.clearResults();
  };

  this.clearResults = function() {
    utils.removeAllChildren(this.result);
    this.hideMarker();
  };
  this.getSource = function() {
    return this.layer.getSource();
  };
  this.addLayer = function() {
    const map = this.getMap();
    const layer = map.getLayers().find(layer =>  layer === this.layer);
    !layer && map.addLayer(this.layer);
  };
  /**
   * End methods
   */

  this.createControl();

  Control.call(this, {
    element: this.container,
    name: "nominatim",
    offline: false
  });
}

ol.inherits(GeocodingControl, Control);

module.exports = GeocodingControl;
