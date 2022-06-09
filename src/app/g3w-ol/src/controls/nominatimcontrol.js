import Control  from './control';
import {transformExtent, transform} from "ol/proj";
import {containsXY} from "ol/extent";

function NominatimControl(options={}) {
  const self = this;
  this.options = {
    lonlat: options.lonlat,
    provider: 'osm',
    placeholder: options.placeholder || 'Città, indirizzo ... ',
    noresults: options.noresults || 'Nessun risultato ',
    notresponseserver: options.notresponseserver || 'Il server non risponde',
    targetType: 'text-input',
    lang: 'it-IT',
    limit: 5,
    keepOpen: true,
    preventDefault: false,
    autoComplete: false,
    autoCompleteMinLength: 4,
    debug: false,
    viewbox: options.bbox,
    bounded: 1,
    classMobile: options.isMobile ? 'nominatim-mobile' : '',
    mapCrs: options.mapCrs,
    fontIcon: options.fontIcon || "fa fa-search fas fa-search"
  };

  const inputQueryId = "gcd-input-query";
  const inputResetId = "gcd-input-reset";
  const cssClasses = {
    "namespace": "ol-geocoder",
    "spin": "gcd-pseudo-rotate",
    "hidden": "gcd-hidden",
    "country": "gcd-country",
    "city": "gcd-city",
    "road": "gcd-road",
    "olControl": "ol-control",
    "glass": {
      "container": "gcd-gl-container",
      "control": "gcd-gl-control",
      "button": "gcd-gl-btn",
      "input": "gcd-gl-input",
      "expanded": "gcd-gl-expanded",
      "reset": "gcd-gl-reset",
      "result": "gcd-gl-result"
    },
    "inputText": {
      "container": "gcd-txt-container",
      "control": "gcd-txt-control",
      "input": "gcd-txt-input",
      "reset": "gcd-txt-reset",
      "icon": "gcd-txt-glass",
      "result": "gcd-txt-result"
    }
  };

  const targetType = {
    GLASS: 'glass-button',
    INPUT: 'text-input'
  };
  const vars = Object.freeze({
    inputQueryId: inputQueryId,
    inputResetId: inputResetId,
    cssClasses: cssClasses,
    default: {
      inputQueryId: inputQueryId,
      inputResetId: inputResetId,
      cssClasses: cssClasses
    }
  });

  const utils = {
    toQueryString(obj) {
      const this$1 = this;
      return Object.keys(obj).reduce(function (a, k) {
        a.push(
          typeof obj[k] === 'object' ?
            this$1.toQueryString(obj[k]) :
            encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])
        );
        return a;
      }, []).join('&');
    },
    encodeUrlXhr(url, data) {
      if(data && typeof data === 'object') {
        var str_data = this.toQueryString(data);
        url += (/\?/.test(url) ? '&' : '?') + str_data;
      }
      return url;
    },
    json(url, data) {
      return $.get(url, data)
      },
    jsonp(url, key, callback) {
        // https://github.com/Fresheyeball/micro-jsonp/blob/master/src/jsonp.js
      const head = document.head,
          script = document.createElement('script'),
          // generate minimally unique name for callback function
          callbackName = 'f' + Math.round(Math.random() * Date.now());

        // set request url
        script.setAttribute('src',
          /*  add callback parameter to the url
           where key is the parameter key supplied
           and callbackName is the parameter value */
          (url + (url.indexOf('?') > 0 ? '&' : '?') + key + '=' + callbackName));

        /*  place jsonp callback on window,
         the script sent by the server should call this
         function as it was passed as a url parameter */
        window[callbackName] = function (json) {
          window[callbackName] = undefined;

          // clean up script tag created for request
          setTimeout(function () {
            head.removeChild(script);
          }, 0);

          // hand data back to the user
          callback(json);
        };

        // actually make the request
        head.appendChild(script);
      },
      now() {
        // Polyfill for window.performance.now()
        // @license http://opensource.org/licenses/MIT
        // copyright Paul Irish 2015
        // https://gist.github.com/paulirish/5438650
        if('performance' in window === false) {
          window.performance = {};
        }

        Date.now = (Date.now || function () {  // thanks IE8
          return new Date().getTime();
        });

        if('now' in window.performance === false) {

          let nowOffset = Date.now();

          if(performance.timing && performance.timing.navigationStart) {
            nowOffset = performance.timing.navigationStart;
          }

          window.performance.now = function now() {
            return Date.now() - nowOffset;
          };
        }
        return window.performance.now();
      },

      flyTo(map, coord, duration, resolution) {
        resolution = resolution || 2.388657133911758;
        duration = duration || 500;
        const view = map.getView();
        view.animate({duration: duration, resolution: resolution},
          {duration: duration, center: coord});
      },
      randomId(prefix) {
        const id = this.now().toString(36);
        return prefix ? prefix + id : id;
      },
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
        const this$1 = this;

        if(Array.isArray(element)) {
          element.forEach(function (each) {
            this$1.addClass(each, classname);
          });
          return;
        }

        const array = (Array.isArray(classname))
          ? classname
          : classname.split(/\s+/);
        let i = array.length;

        while (i--) {
          if(!this$1.hasClass(element, array[i])) {
            this$1._addClass(element, array[i], timeout);
          }
        }
      },
      _addClass(el, klass, timeout) {
        const this$1 = this;

        // use native if available
        if(el.classList) {
          el.classList.add(klass);
        } else {
          el.className = (el.className + ' ' + klass).trim();
        }

        if(timeout && this.isNumeric(timeout)) {
          window.setTimeout(function () {
            this$1._removeClass(el, klass);
          }, timeout);
        }
      },
      /**
       * @param {Element|Array<Element>} element DOM node or array of nodes.
       * @param {String|Array<String>} classname Class or array of classes.
       * For example: 'class1 class2' or ['class1', 'class2']
       * @param {Number|undefined} timeout Timeout to add a class.
       */
      removeClass(element, classname, timeout) {
        const this$1 = this;

        if(Array.isArray(element)) {
          element.forEach(function (each) {
            this$1.removeClass(each, classname, timeout);
          });
          return;
        }

        const array = (Array.isArray(classname))
          ? classname
          : classname.split(/\s+/);
        let i = array.length;

        while (i--) {
          if(this$1.hasClass(element, array[i])) {
            this$1._removeClass(element, array[i], timeout);
          }
        }
      },
      _removeClass(el, klass, timeout) {
        const this$1 = this;

        if(el.classList) {
          el.classList.remove(klass);
        } else {
          el.className = (el.className.replace(this.classRegex(klass), ' ')).trim();
        }
        if(timeout && this.isNumeric(timeout)) {
          window.setTimeout(function () {
            this$1._addClass(el, klass);
          }, timeout);
        }
      },
      /**
       * @param {Element} element DOM node.
       * @param {String} classname Classname.
       * @return {Boolean}
       */
      hasClass(element, c) {
        // use native if available
        return element.classList
          ? element.classList.contains(c)
          : this.classRegex(c).test(element.className);
      },
      /**
       * @param {Element|Array<Element>} element DOM node or array of nodes.
       * @param {String} classname Classe.
       */
      toggleClass(element, classname) {
        const this$1 = this;

        if(Array.isArray(element)) {
          element.forEach(function (each) {
            this$1.toggleClass(each, classname);
          });
          return;
        }

        // use native if available
        if(element.classList) {
          element.classList.toggle(classname);
        } else {
          if(this.hasClass(element, classname)) {
            this._removeClass(element, classname);
          } else {
            this._addClass(element, classname);
          }
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
        if(simpleRe.test(selector)) {
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
        return (find_all) ? matches : matches[0];
      },
      $(id) {
        id = (id[0] === '#') ? id.substr(1, id.length) : id;
        return document.getElementById(id);
      },
      isElement(obj) {
        // DOM, Level2
        if('HTMLElement' in window) {
          return (!!obj && obj instanceof HTMLElement);
        }
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
        return source.some(function (each) {
          return target.indexOf(each) >= 0;
        });
      },
      everyMatchInArrayy(arr1, arr2) {
        return arr2.every(function (each) {
          return arr1.indexOf(each) >= 0;
        });
      },
      anyItemHasValue(obj, has) {
        const this$1 = this;
        if(has === void 0) has = false;

        const keys = Object.keys(obj);
        keys.forEach(function (key) {
          if(!this$1.isEmpty(obj[key])) {
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
        const this$1 = this;

        return html.replace(/\{ *([\w_-]+) *\}/g, function (htm, key) {
          const value = (row[key] === undefined) ? '' : row[key];
          return this$1.htmlEscape(value);
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
      /**
       * Overwrites obj1's values with obj2's and adds
       * obj2's if non existent in obj1
       * @returns obj3 a new object based on obj1 and obj2
       */
      mergeOptions(obj1, obj2) {
        const obj3 = {};
        for (var attr1 in obj1) {
          obj3[attr1] = obj1[attr1];
        }
        for (var attr2 in obj2) {
          obj3[attr2] = obj2[attr2];
        }
        return obj3;
      },
      createElement(node, html) {
        let elem;
        if(Array.isArray(node)) {
          elem = document.createElement(node[0]);

          if(node[1].id) {
            elem.id = node[1].id;
          }
          if(node[1].classname) {
            elem.className = node[1].classname;
          }

          if(node[1].attr) {
            const attr = node[1].attr;
            if(Array.isArray(attr)) {
              let i = -1;
              while (++i < attr.length) {
                elem.setAttribute(attr[i].name, attr[i].value);
              }
            } else {
              elem.setAttribute(attr.name, attr.value);
            }
          }
        } else {
          elem = document.createElement(node);
        }
        elem.innerHTML = html;
        const frag = document.createDocumentFragment();

        while (elem.childNodes[0]) {
          frag.appendChild(elem.childNodes[0]);
        }
        elem.appendChild(frag);
        return elem;
      },
      assert(condition, message) {
        if(message === void 0) message = 'Assertion failed';

        if(!condition) {
          if(typeof Error !== 'undefined') {
            throw new Error(message);
          }
          throw message; // Fallback
        }
      }
    };

  const klasses = vars.cssClasses;
  const klasses$1 = vars.cssClasses;

  // classe Html //
  const Html = function Html(base) {
    this.options = base.options;
    this.els = this.createControl();
  };

  Html.prototype.createControl = function createControl () {
    let container, containerClass, elements;
    if (this.options.targetType === targetType.INPUT) {
      container = Html.container;
      elements = {
        container: container,
        control: utils.find('.' + klasses.inputText.control, container),
        input: utils.find('.' + klasses.inputText.input, container),
        reset: utils.find('.' + klasses.inputText.reset, container),
        result: utils.find('.' + klasses.inputText.result, container)
      };
    } else {
      containerClass = klasses.namespace + ' ' + klasses.glass.container;
      container = utils.createElement(
        ['div', { classname: containerClass }], Html.glass);
      elements = {
        container: container,
        control: utils.find('.' + klasses.glass.control, container),
        button: utils.find('.' + klasses.glass.button, container),
        input: utils.find('.' + klasses.glass.input, container),
        reset: utils.find('.' + klasses.glass.reset, container),
        result: utils.find('.' + klasses.glass.result, container)
      };
    }
    //set placeholder from options
    //elements.input.placeholder = this.options.placeholder;
    return elements;
  };

  /* eslint-disable indent */
  Html.glass = [
    '<div class="', klasses.glass.control, ' ', klasses.olControl, '">',
    '<button type="button" class="', klasses.glass.button, '"></button>',
    '<input type="text"',
    ' id="', vars.inputQueryId, '"',
    ' class="', klasses.glass.input, '"',
    ' autocomplete="off" placeholder="Search ...">',
    '<a',
    ' id="', vars.inputResetId, '"',
    ' class="', klasses.glass.reset, ' ', klasses.hidden, '"',
    '></a>',
    '</div>',
    '<ul class="', klasses.glass.result, '"></ul>'
  ].join('');

  const {placeholder, fontIcon} = this.options;
  const containerClass = klasses.namespace + ' ' + klasses.inputText.container + ' ' + this.options.classMobile;
  const nominatimVueContainer = Vue.extend({
    functional: true,
    render(h){
      return h('div', {class: {[containerClass]: true}}, [
        h('div', {
          class: {
            [klasses.inputText.control]: true,
          }
        }, [
          h('input', {
            attrs: {
              type: 'text',
              id: vars.inputQueryId,
              autocomplete: 'off'
            },
            class:{
              [klasses.inputText.input]: true
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
              id:  vars.inputResetId
            },
            class: {
              [`${klasses.inputText.reset}  ${klasses.hidden}`]: true
            }
          }),
        ]),
        h('ul', {
          class: {
            [klasses.inputText.result]: true
          }
        })]
      )
    }
  });
  Html.container = new nominatimVueContainer().$mount().$el;

  Html.input = [
    '<div class="', klasses.inputText.control, '">',
    '<input type="text"',
    ' id="', vars.inputQueryId, '"',
    ' class="', klasses.inputText.input, '"',
    ' autocomplete="off" placeholder="Search ...">',
    '<button type="button" class="btn" id="search_nominatim"><i style="color:#ffffff" class="' + this.options.fontIcon +'" aria-hidden="true"></i></button>',
    '<button type="button"',
    ' id="', vars.inputResetId, '"',
    ' class="', klasses.inputText.reset, ' ', klasses.hidden, '"',
    '></button>',
    '</div>',
    '<ul class="', klasses.inputText.result, '"></ul>'
  ].join('');

  // classe Html fine //

  // classe OpenStreet //

  const OpenStreet = function OpenStreet() {
    this.settings = {
      url: 'https://nominatim.openstreetmap.org/search/',
      params: {
        q: '',
        format: 'json',
        addressdetails: 1,
        limit: 10,
        //countrycodes: 'IT',
        //'accept-language': 'it-IT',
      }
    };
  };


  OpenStreet.prototype.getParameters = function getParameters(options) {
    let viewbox = transformExtent(self.options.viewbox, self.options.mapCrs, 'EPSG:4326').join(',');
    return {
      url: this.settings.url,
      params: {
        q: options.query,
        format: 'json',
        addressdetails: 1,
        limit: options.limit || this.settings.params.limit,
        //countrycodes: options.countrycodes || this.settings.params.countrycodes,
        //'accept-language': options.lang || this.settings.params['accept-language'],
        viewbox,
        bounded: 1
      }
    };
  };

  OpenStreet.prototype.handleResponse = function handleResponse(results) {
    return results.map(function (result) {
      return ({
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
      });
    });
  };

  // classe OpenStreet fine //

  // classe Nomitatim //

  const Nominatim = function Nominatim(base, els) {
    this.Base = base;
    this.options = base.options;
    this.options.provider = this.options.provider.toLowerCase();
    this.els = els;
    this.lastQuery = '';
    this.container = this.els.container;
    this.registeredListeners = { mapClick: false };
    this.setListeners();
    this.OpenStreet = new OpenStreet();

  };

  Nominatim.prototype.setListeners = function setListeners () {
    const this$1 = this;
    let timeout, lastQuery;
    const openSearch = function () {
      utils.hasClass(this$1.els.control, klasses$1.glass.expanded) ?
        this$1.collapse() : this$1.expand();
    };
    const query = function (evt) {
      var value = evt.target.value.trim();
      var hit = evt.key ? evt.key === 'Enter' :
        evt.which ? evt.which === 13 :
          evt.keyCode ? evt.keyCode === 13 : false;

      if (hit) {
        evt.preventDefault();
        this$1.query(value);
      }
    };
    const reset = function (evt) {
      this$1.els.input.focus();
      this$1.els.input.value = '';
      this$1.lastQuery = '';
      utils.addClass(this$1.els.reset, klasses$1.hidden);
      this$1.clearResults();
    };
    const handleValue = function (evt) {
      const value = evt.target.value.trim();

      value.length
        ? utils.removeClass(this$1.els.reset, klasses$1.hidden)
        : utils.addClass(this$1.els.reset, klasses$1.hidden);

      if (this$1.options.autoComplete && value !== lastQuery) {
        lastQuery = value;
        timeout && clearTimeout(timeout);
        timeout = setTimeout(function () {
          if (value.length >= this$1.options.autoCompleteMinLength) {
            this$1.query(value);
          }
        }, 200);
      }
    };
    this.els.input.addEventListener('keyup', query, false);
    this.els.input.addEventListener('input', handleValue, false);
    this.els.reset.addEventListener('click', reset, false);
    if (this.options.targetType === targetType.GLASS) {
      this.els.button.addEventListener('click', openSearch, false);
    }
  };

  Nominatim.prototype.query = function query (q) {
    return new Promise((resolve, reject) => {
      const isNumber = (value) => {
        return typeof value === 'number' && !Number.isNaN(value);
      };
      let lonlat = null;
      if (q && q.split(',').length === 2) {
        lonlat = q.split(',');
        lonlat = isNumber(1*lonlat[0]) && isNumber(1*lonlat[1]) ? lonlat.map(coordinate => 1*coordinate) : null;
      }
      if (lonlat) {
        this.options.lonlat(lonlat);
      } else {
        const this$1 = this;
        const ajax = {
        }, options = this.options;
        const provider = this.getProvider({
          query: q,
          provider: options.provider,
          key: options.key,
          lang: options.lang,
          countrycodes: options.countrycodes,
          limit: options.limit
        });
        if (this.lastQuery === q && this.els.result.firstChild) { return; }
        this.lastQuery = q;
        this.clearResults();
        utils.addClass(this.els.reset, klasses$1.spin);
        ajax.url = provider.url;
        ajax.data = provider.params;
        utils.json(ajax)
          .done(function(res) {
            const extent = provider.params.viewbox.split(',').map(coordinate => 1*coordinate);
            res = res.filter(place => containsXY(extent, place.lon, place.lat));
            utils.removeClass(this$1.els.reset, klasses$1.spin);
            const res_= res.length ? this$1.OpenStreet.handleResponse(res) : undefined;
            this$1.createList(res_);
            res_ && this$1.listenMapClick();
            resolve(res_ ? res_ : []);
          })
          .fail(function(error){
            utils.removeClass(this$1.els.reset, klasses$1.spin);
            const li = utils.createElement(
              'li', `<h5>  ${this$1.options.notresponseserver}</h5>`);
            this$1.els.result.appendChild(li);
            reject(error)
          })
      }

    })
  };

  Nominatim.prototype.createList = function createList (response) {
    const this$1 = this;
    const ul = this.els.result;
    if (response) {
      response.forEach(function (row) {
        const addressHtml = this$1.addressTemplate(row.address),
          html = ['<a href="#">', addressHtml, '</a>'].join(''),
          li = utils.createElement('li', html);
        li.addEventListener('click', function (evt) {
          evt.preventDefault();
          this$1.chosen(row, addressHtml, row.address, row.original);
        }, false);
        ul.appendChild(li);
      });
    } else {
      const noresults = this.options.noresults;
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

  Nominatim.prototype.chosen = function chosen(place, addressHtml, addressObj, addressOriginal) {
    const map = this.Base.getMap();
    const coord_ = [parseFloat(place.lon), parseFloat(place.lat)];
    const projection = map.getView().getProjection();
    const coord = transform(coord_, 'EPSG:4326', projection);
    const address = {
      formatted: addressHtml,
      details: addressObj,
      original: addressOriginal
    };
    this.options.keepOpen === false && this.clearResults(true);
    this.Base.dispatchEvent({
      type: 'addresschosen',
      address: address,
      coordinate: coord
    });
  };

  Nominatim.prototype.addressTemplate = function addressTemplate (address) {
    const html = [];
    if (address.name) {
      html.push(['<div class="', klasses$1.road, '">{name}</div>'].join(''));
    }
    if (address.road || address.building || address.house_number) {
      html.push([
        '<div class="', klasses$1.road,
        '">{building} {road} {house_number}</div>'
      ].join(''));
    }
    if (address.city || address.town || address.village) {
      html.push([
        '<div class="', klasses$1.city,
        '">{postcode} {city} {town} {village}</div>'
      ].join(''));
    }
    if (address.state || address.country) {
      html.push([
        '<div class="', klasses$1.country, '">{state} {country}</div>'
      ].join(''));
    }
    return utils.template(html.join('<br>'), address);
  };

  Nominatim.prototype.getProvider = function getProvider (options) {
    return this.OpenStreet.getParameters(options);
  };

  Nominatim.prototype.expand = function expand () {
    const this$1 = this;

    utils.removeClass(this.els.input, klasses$1.spin);
    utils.addClass(this.els.control, klasses$1.glass.expanded);
    window.setTimeout(function () { return this$1.els.input.focus(); }, 100);
    this.listenMapClick();
  };

  Nominatim.prototype.collapse = function collapse () {
    this.els.input.value = '';
    this.els.input.blur();
    utils.addClass(this.els.reset, klasses$1.hidden);
    utils.removeClass(this.els.control, klasses$1.glass.expanded);
    this.clearResults();
  };

  Nominatim.prototype.listenMapClick = function listenMapClick () {
    // already registered
    if (this.registeredListeners.mapClick) { return; }

    const this_ = this;
    const mapElement = this.Base.getMap().getTargetElement();
    this.registeredListeners.mapClick = true;

    //one-time fire click
    mapElement.addEventListener('click', {
      handleEvent (evt) {
        this_.clearResults(true);
        mapElement.removeEventListener(evt.type, this, false);
        this_.registeredListeners.mapClick = false;
      }
    }, false);
  };

  Nominatim.prototype.clearResults = function clearResults (collapse) {
    collapse && this.options.targetType === targetType.GLASS ?
      this.collapse() : utils.removeAllChildren(this.els.result);
  };

  Nominatim.prototype.getSource = function getSource () {
    return this.layer.getSource();
  };

  Nominatim.prototype.addLayer = function addLayer () {
    const this$1 = this;

    let found = false;
    const map = this.Base.getMap();

    map.getLayers().forEach(function (layer) {
      if (layer === this$1.layer) { found = true; }
    });
    if (!found) { map.addLayer(this.layer); }
  };

  // classe Nomitatim fine //

  const $html = new Html(this);
  this.container = $html.els.container;
  this.nominatim = new Nominatim(this, $html.els);
  this.layer = this.nominatim.layer;
  Control.call(this, {
    element: this.container,
    name: "nominatim",
    offline: false
  });
}


export default  NominatimControl;
