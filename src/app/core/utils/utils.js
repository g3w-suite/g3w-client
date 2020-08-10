/**
 * Decimal adjustment of a number.
 *
 * @param {String}  type  The type of adjustment.
 * @param {Number}  value The number.
 * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
 * @returns {Number} The adjusted value.
 */
function decimalAdjust(type, value, exp) {
  // If the exp is undefined or zero...
  if (typeof exp === 'undefined' || +exp === 0) {
    return Math[type](value);
  }
  value = +value;
  exp = +exp;
  // If the value is not a number or the exp is not an integer...
  if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
    return NaN;
  }
  // Shift
  value = value.toString().split('e');
  value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
  // Shift back
  value = value.toString().split('e');
  return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
}

// Decimal round
if (!Math.round10) {
  Math.round10 = function(value, exp) {
    return decimalAdjust('round', value, exp);
  };
}
// Decimal floor
if (!Math.floor10) {
  Math.floor10 = function(value, exp) {
    return decimalAdjust('floor', value, exp);
  };
}
// Decimal ceil
if (!Math.ceil10) {
  Math.ceil10 = function(value, exp) {
    return decimalAdjust('ceil', value, exp);
  };
}

String.prototype.hashCode = function() {
  let hash = 0, i, chr, len;
  if (this.length === 0) return hash;
  for (i = 0, len = this.length; i < len; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash;
};

const Base64 = {_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){let t="";let n,r,i,s,o,u,a;let f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){let t="";let n,r,i;let s,o,u,a;let f=0;e=e.replace(/[^A-Za-z0-9+/=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/rn/g,"n");let t="";for(let n=0;n<e.length;n++){let r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){let t="";let n=0;let r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}};

let _uid = 0;

const utils = {
  getUniqueDomId: function() {
    _uid+=1;
    return `${_uid}_${Date.now()}`;
  },

  uniqueId: function() {
    return utils.getUniqueDomId();
  },

  basemixin: function mixin(destination, source) {
      return utils.merge(destination.prototype, source);
  },

  mixin: function mixininstance(destination,source){
      const sourceInstance = new source;
      utils.merge(destination, sourceInstance);
      utils.merge(destination.prototype, source.prototype);
  },
  merge: function merge(destination, source) {
      let key;
      for (key in source) {
          if (utils.hasOwn(source, key)) {
              destination[key] = source[key];
          }
      }
  },
  hasOwn: function hasOwn(object, key) {
      return Object.prototype.hasOwnProperty.call(object, key);
  },
  // google closure library impememtation
  inherit:function(childCtor, parentCtor) {
    function tempCtor() {}
    tempCtor.prototype = parentCtor.prototype;
    childCtor.superClass_ = parentCtor.prototype;
    childCtor.prototype = new tempCtor();
    childCtor.prototype.constructor = childCtor;
  },
  // goole closure library implementation
  base: function(me, opt_methodName, var_args) {
    // who call base
    const caller = arguments.callee.caller;
    if (caller.superClass_) {
      // This function constructor (that inherith from superClass_). Call the superclass constructor.
      //It is a easy way to cal super class in binding to this
      return caller.superClass_.constructor.apply(
          me, Array.prototype.slice.call(arguments, 1));
    }
    const args = Array.prototype.slice.call(arguments, 2);
    let foundCaller = false;
    //constructor is the costructor function of the object
    for (let ctor = me.constructor;
         ctor; ctor = ctor.superClass_ && ctor.superClass_.constructor) {
      if (ctor.prototype[opt_methodName] === caller) {
        foundCaller = true;
      } else if (foundCaller) {
        return ctor.prototype[opt_methodName].apply(me, args);
      }
    }
    // If we did not find the caller in the prototype chain,
    // then one of two things happened:
    // 1) The caller is an instance method.
    // 2) This method was not called by the right caller.
    if (me[opt_methodName] === caller) {
      // call the function from prototype object
      return me.constructor.prototype[opt_methodName].apply(me, args);
    } else {
      throw Error(
          'base called from a method of one name ' +
          'to a method of a different name');
    }
  },

  noop: function(){},

  truefnc: function(){return true},

  falsefnc: function(){return true},

  resolve: function(value){
    const d = $.Deferred();
    d.resolve(value);
    return d.promise();
  },

  reject: function(value){
    const d = $.Deferred();
    d.reject(value);
    return d.promise();
  },

  getValueFromG3WObjectEvent() {
    //TODO
  },
  getAjaxResponses(listRequests = []) {
    let requestsLenght = listRequests.length;
    const d = $.Deferred();
    const DoneRespones = [];
    const FailedResponses = [];
    listRequests.forEach((request) => {
      request.then((response) => {
        DoneRespones.push(response)
      })
      .fail((err) => {
        FailedResponses.push(err)
      }).always(() => {
        requestsLenght = requestsLenght > 0 ? requestsLenght - 1: requestsLenght;
        if (requestsLenght === 0)
          d.resolve({
            done: DoneRespones,
            fail: FailedResponses
          })
      })
    });
    return d.promise();
  },

  sanitizeUrl({url, reserverParameters=[]}={}){
    const checkUrl = new URL(url);
    reserverParameters.forEach((param) => {
      let _params = [param.toUpperCase(), param.toLowerCase()];
      for (let i=0; i < 2; i++) {
        const _param = _params[i];
        let _value = checkUrl.searchParams.get(_param);
        if (_value) {
          url = url.replace(`${_param}=${_value}`, '');
          break;
        }
      }
    });
    return url;
  },

  convertObjectToUrlParams: function(params = {}) {
    return $.param(params)
  },
  // Appends query parameters to a URI
  appendParams: function(uri, params) {
    const keyParams = [];
    // Skip any null or undefined parameter values
    Object.keys(params).forEach(function (k) {
      if (params[k] !== null && params[k] !== undefined) {
        keyParams.push(k + '=' + encodeURIComponent(params[k]));
      }
    });
    const qs = keyParams.join('&');
    // remove any trailing ? or &
    uri = uri.replace(/[?&]$/, '');
    // append ? or & depending on whether uri has existing parameters
    uri = uri.indexOf('?') === -1 ? uri + '?' : uri + '&';
    return uri + qs;
  },
  imageToDataURL: function({src, type='image/jpeg', callback=()=>{}}) {
    const image = new Image();
    image.onload = function() {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = this.naturalHeight;
      canvas.width = this.naturalWidth;
      context.drawImage(this, 0, 0);
      const dataURL = canvas.toDataURL(type);
      callback(dataURL);
    };
    image.src = src;
  },
  capitalize_first_letter(string){
    return `${string[0].toUpperCase()}${string.slice(1)}`;
  },
  Base64: Base64,
  toRawType(value) {
    const _toString = Object.prototype.toString;
    return _toString.call(value).slice(8, -1)
  },
  // build throttle function
  throttle: function(fnc, delay=500) {
    let lastCall;
    return function (...args) {
      let previousCall = lastCall;
      lastCall = Date.now();
      if (previousCall === undefined // function is being called for the first time
        || (lastCall - previousCall) > delay) { // throttle time has elapsed
        fnc(...args);
      }
    }
  },
  //build debounce function
  debounce(func, delay=500) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(()=>{
        func(...args)
      }, delay);
    };
  },
  copyUrl(url){
    const tempinput = document.createElement('input');
    document.body.appendChild(tempinput);
    tempinput.value = url;
    tempinput.select();
    document.execCommand('copy');
    document.body.removeChild(tempinput);
  },
  downloadFile({filename, content, mime_type='text/plain'}={}){
    const temapAncor = document.createElement('a');
    const bb = new Blob([content], {type: mime_type});
    temapAncor.setAttribute('href', window.URL.createObjectURL(bb));
    temapAncor.setAttribute('download', filename);
    temapAncor.dataset.downloadurl = [mime_type, temapAncor.download, temapAncor.href].join(':');
    temapAncor.click();
  },
  downloadCSVLayerFeatures({layer, alias=true}={}) {
    const {getAlphanumericPropertiesFromFeature} = require('core/utils/geo');
    //get headers
    const attributes = Object.keys(layer.features[0].attributes);
    const properties = getAlphanumericPropertiesFromFeature(attributes);
    const headers = !alias ? properties : properties.map((property) => {
      const attribute = layer.attributes.find(attribute => attribute.name === property);
      return attribute ? attribute.label : property;
    });
    const items = layer.features.map((feature) => {
      const attributes = feature.attributes;
      const item = {};
      properties.forEach((property, index) => {
        const key = !alias && property || headers[index];
        item[key] = attributes[property];
      });
      return item;
    });

    utils.downloadCSV({
      filename: layer.id,
      items
    })
  },

  downloadCSV({filename= utils.getUniqueDomId(), items=[]}={}){
    function convertToCSV(items) {
      let str = '';
      for (let i = 0; i < items.length; i++) {
        let line = '';
        for (let index in items[i]) {
          if (line !== '') line += ';';
          line += items[i][index];
        }
        str += line + '\r\n';
      }
      return str;
    }
    const exportedFilenmae = `${filename}.csv`;
    const csv = convertToCSV(items);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    if (navigator.msSaveBlob) { // IE 10+
      navigator.msSaveBlob(blob, exportedFilenmae);
    } else {
      const link = document.createElement("a");
      if (link.download !== undefined) { 
        // Browsers that support HTML5 download attribute
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", exportedFilenmae);
        link.style.visibility = 'hidden';
        link.click();
      }
    }
  },
  XHR: {
    get({url, params={}}={}) {
      return new Promise((resolve, reject) => {
        if (url) {
          $.get(url, params)
            .then((result) => {
              resolve(result);
            })
            .fail((err) => {
              reject(err);
            })
        } else {
          reject('No url')
        }
      })
    },
    post({url, data, formdata = false, contentType} = {}) {
      return new Promise((resolve, reject) => {
        if (formdata) {
          const formdata = new FormData();
          for (const param in data) {
            formdata.append(param, data[param])
          }
          $.ajax({
            type: 'POST',
            url,
            data: formdata,
            processData: false,
            contentType: false
          }).then((response) => {
              resolve(response)
            })
            .fail((error) => {
              reject(error);
            })
        } else if (contentType) {
          $.ajax({
            type: 'POST',
            url,
            data,
            processData: false,
            contentType: contentType || false
          }).then((response) => {
            resolve(response)
          })
            .fail((error) => {
              reject(error);
            })
        } else {
          $.post(url, data)
            .then((response) => {
              resolve(response)
            })
            .fail((error) => {
              reject(error)
            })
        }
      })
    },
    htmlescape(string){
      string = string.replace("&", "&amp;");
      string = string.replace("<", "&lt;");
      string = string.replace(">", "&gt;");
      string = string.replace('"', "&quot;");
      return string;
    },
    
    fileDownload({url, data={}, httpMethod="POST"} = {}) {
      return new Promise((resolve, reject) => {
        $.fileDownload(url, {
          httpMethod,
          data,
        }).done(()=>{
          resolve()
        }).fail(()=>{
          reject()
        })
      })
    }
  }
};

module.exports = utils;
