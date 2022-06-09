import {TIMEOUT} from "constant";
import {EXPRESSION_OPERATORS} from 'core/layers/filter/operators'
import Filter from 'core/layers/filter/filter';
import Expression from 'core/layers/filter/expression';
//import geoutils from "./geo";
//const {getAlphanumericPropertiesFromFeature} = geoutils;
let _uid = 0;

const utils = {
  getUniqueDomId() {
    _uid+=1;
    return `${_uid}_${Date.now()}`;
  },

  uniqueId() {
    return utils.getUniqueDomId();
  },

  basemixin(destination, source) {
    return utils.merge(destination.prototype, source);
  },

  mixin(destination,source){
    const sourceInstance = new source;
    utils.merge(destination, sourceInstance);
    utils.merge(destination.prototype, source.prototype);
  },
  merge(destination, source) {
    let key;
    for (key in source) {
      if (utils.hasOwn(source, key)) destination[key] = source[key];
    }
  },
  hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  },

  noop(){},

  truefnc(){return true},

  falsefnc(){return true},

  resolve(value){
    const d = $.Deferred();
    d.resolve(value);
    return d.promise();
  },

  reject(value){
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
  trimValue: value => value.replace(/ /g,''),
  /**
   * Method to check if is a url
   * @param url
   * @returns {boolean}
   */
  isURL: url => url && url.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g),

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

  convertObjectToUrlParams(params = {}) {
    return $.param(params)
  },
  // Appends query parameters to a URI
  appendParams(uri, params) {
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
  imageToDataURL({src, type='image/jpeg', callback=()=>{}}) {
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
  toRawType(value) {
    const _toString = Object.prototype.toString;
    return _toString.call(value).slice(8, -1)
  },
  isEmptyObject(obj){
    return JSON.stringify(obj) === '{}';
  },
  // build throttle function
  throttle(fnc, delay=500) {
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
  getRandomColor(){
    return `#${((1<<24)*Math.random() | 0).toString(16)}`;
  },
  copyUrl(url){
    const tempinput = document.createElement('input');
    document.body.appendChild(tempinput);
    tempinput.value = url;
    tempinput.select();
    document.execCommand('copy');
    document.body.removeChild(tempinput);
  },
  downloadFile({filename, content, url, mime_type='text/plain'}={}){
    const download = blob =>{
      let temapAncor = document.createElement('a');
      temapAncor.setAttribute('href', window.URL.createObjectURL(blob));
      temapAncor.setAttribute('download', filename);
      temapAncor.dataset.downloadurl = [mime_type, temapAncor.download, temapAncor.href].join(':');
      temapAncor.click();
      temapAncor = null;
    };
    return new Promise((resolve, reject) =>{
      if (content) {
        const blob = new Blob([content], {type: mime_type});
        download(blob);
        resolve();
      } else if (url) {
       fetch(url)
         .then(async response => {
           if (response.status === 200) {
             mime_type = mime_type || response.headers.get('content-type');
             filename = filename || response.headers.get('content-disposition').split('filename=').length ?
               response.headers.get('content-disposition').split('filename=')[1] : 'g3w_download_file';
             return response.blob();
           } else if (response.status === 400 || response.status === 500){
             const {message} = await response.json();
             return Promise.reject(message)
           }
         })
         .then(blob =>{
           download(blob);
           resolve();
         }).catch(error =>{
          reject(error)
        })
      }
    })
  },
  downloadCSVLayerFeatures({layer, alias=true}={}) {
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
  /**
   * Method to set timeout
   * @param timeout
   * @param resolve
   * @param data
   * @returns {number}
   */
  getTimeoutPromise({timeout=TIMEOUT, resolve, data}){
    const timeoutKey = setTimeout(()=>{
      resolve(data)
    }, timeout);
    return timeoutKey;
  },
  XHR: {
    get({url, params={}}={}) {
      return new Promise((resolve, reject) => {
        url ?
          $.get(url, params)
            .then(response => {
              resolve(response)
            })
            .fail(error => reject(error))
        : reject('No url')
      })
    },
    post({url, data, formdata = false, contentType} = {}, getResponseStatusHeaders=false) {
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
          }).then((response, status, request) => {
            getResponseStatusHeaders ? resolve({
                data: response,
                status,
                request
              }) : resolve(response)
            })
            .fail(error => {
              reject(error);
            })
        } else if (contentType) {
          $.ajax({
            type: 'POST',
            url,
            data,
            processData: false,
            contentType: contentType || false
          }).then((response, status, request) => {
            getResponseStatusHeaders ? resolve({
              data: response,
              status,
              request
            }) : resolve(response)
          })
            .fail(error => {
              reject(error);
            })
        } else {
          $.post(url, data)
            .then((response, status, request) => {
              getResponseStatusHeaders ? resolve({
                data: response,
                status,
                request
              }) : resolve(response)
            })
            .fail(error => {
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
    fileDownload({url, data, httpMethod="POST"} = {}) {
      let timeoutId;
      return new Promise((resolve, reject) => {
        const downloadPromise = $.fileDownload(url, {
          httpMethod,
          data
        });
        timeoutId = setTimeout(()=>{
          reject('Timeout');
          downloadPromise.abort();
        }, TIMEOUT);
        downloadPromise
          .done(()=>resolve())
          .fail(()=> reject())
          .always(()=>{
            clearTimeout(timeoutId)
          });
      })
    }
  },
  createSingleFieldParameter({field, value, operator='eq', logicop=null}){
    logicop = logicop && `|${logicop}`;
    if (Array.isArray(value)){
      let filter = '';
      const valueLenght = value.length;
      value.forEach((value, index) =>{
        filter+=`${field}|${operator}|${encodeURIComponent(value)}${index < valueLenght - 1 ? `${logicop},` : ''}`
      });
      return filter
    } else return `${field}|${operator.toLowerCase()}|${encodeURIComponent(value)}${logicop || ''}`;
  },
  createFilterFromString({layer, search_endpoint='ows', filter=''}){
    let stringFilter = filter;
    switch (search_endpoint) {
      case 'ows':
        const layerName = layer.getWMSLayerName();
        const expression = new Expression({
           layerName,
           filter:stringFilter
         });
         filter = new Filter();
         filter.setExpression(expression.get());
        break;
      case 'api':
        //remove all blank space between operators
        Object.values(EXPRESSION_OPERATORS).forEach(operator =>{
          const regexoperator = new RegExp(`\\s+${operator}\\s+`, 'g');
          stringFilter = stringFilter.replace(regexoperator, `${operator}`);
          let regexsinglequote = new RegExp(`'${operator}`, 'g');
          stringFilter = stringFilter.replace(regexsinglequote, `${operator}`);
          regexsinglequote = new RegExp(`${operator}'`, 'g');
          stringFilter = stringFilter.replace(regexsinglequote, `${operator}`);
        });
        stringFilter = stringFilter.replace(/'$/g, '');
        filter = stringFilter.replace(/"/g, '');
        Object.entries(EXPRESSION_OPERATORS).forEach(([key,value]) =>{
          const re = new RegExp(value, "g");
          const replaceValue = value === 'AND' || value === 'OR' ? `|${key},` : `|${key}|`;
          filter = filter.replace(re, replaceValue);
        });
        //encode value
        filter = filter.split('|').map((value, index) => ((index +1) % 3 === 0) ? encodeURIComponent(value) : value).join('|');
        break;
    }
    return filter;
  },
  /**
   *
   * @param layer single layer or an array of layers
   * @param search_endpoint
   * @param inputs
   * @returns {*}
   */
  createFilterFormInputs({layer, search_endpoint='ows', inputs=[]}){
    const isLayerArray = Array.isArray(layer);
    let filter;
    let filters = []; // in case of layer is an array
    switch (search_endpoint) {
      case 'ows':
        if (isLayerArray){
          layer.forEach(layer =>{
            const expression = new Expression();
            const layerName = layer.getWMSLayerName();
            expression.createExpressionFromFilter(inputs, layerName);
            filter = new Filter();
            filter.setExpression(expression.get());
            filters.push(filter);
          })
        } else {
          const expression = new Expression();
          const layerName = layer.getWMSLayerName();
          expression.createExpressionFromFilter(inputs, layerName);
          filter = new Filter();
          filter.setExpression(expression.get());
        }
        break;
      case 'api':
        const inputsLength = inputs.length -1;
        const fields = inputs.map((input, index) => utils.createSingleFieldParameter({
            field: input.attribute,
            value: input.value,
            operator: input.operator,
            logicop: index < inputsLength ?  input.logicop: null
          })
        );
        filter = fields.length ? fields.join() : undefined;
        isLayerArray && layer.forEach(()=>filters.push(filter));
        break;
    }
    return isLayerArray ? filters  : filter;
  },
  //method to create filter from field based on search_endpoint
  createFilterFormField({layer, search_endpoint='ows', field, value, operator='eq'}){
    let filter;
    switch (search_endpoint) {
      case 'ows':
        const expression = new Expression();
        const layerName = layer.getWMSLayerName();
        expression.createExpressionFromField({
          layerName,
          field,
          value,
          operator
        });
        filter = new Filter();
        filter.setExpression(expression.get());
        break;
      case 'api':
        filter = utils.createSingleFieldParameter({
            field,
            value,
            operator
          });
        break;
    }
    return filter;
  },
  splitContextAndMethod(string=''){
    const [context, method] = string.split(':')
    return {
      context,
      method
    }
  },

  /**
   * Convert Hex value color to RGB array
   * @param color
   * @returns {number[]}
   */
  colorHEXToRGB(color='#FFFFFF'){
    const r = parseInt(color.substr(1,2), 16);
    const g = parseInt(color.substr(3,2), 16);
    const b = parseInt(color.substr(5,2), 16);
    return [r,g,b]
  },
};

export default utils;
