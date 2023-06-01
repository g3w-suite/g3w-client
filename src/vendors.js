/**
 * @file
 * @since 3.9.0
 */

import $script from 'scriptjs';
import _ from 'lodash';
import * as jsts from 'jsts/dist/jsts.min';
import isMobile from 'ismobilejs';
import { saveAs } from 'file-saver';
import moment from 'moment';
import EventEmitter from 'eventemitter';
import proj4 from 'proj4';
import * as ol from 'ol';
import { register } from 'ol/proj/proj4';
import Projection from 'ol/proj/Projection';
import projections from 'ol/proj/projections';
import Units from 'ol/proj/Units';
import { get, addProjection, transformExtent, transform } from 'ol/proj';
import { extend, getWidth, getHeight, getCenter, containsExtent, boundingExtent } from 'ol/extent';
import * as source from 'ol/source';
import * as layer from 'ol/layer';
import * as interaction from 'ol/interaction';
import * as control from 'ol/control';
import * as geom from 'ol/geom';
import { fromExtent } from 'ol/geom/Polygon';
import * as style from 'ol/style';
import * as coordinate from 'ol/coordinate';
import * as format from 'ol/format';
import * as filter from 'ol/format/filter';
import * as sphere from 'ol/sphere';
import * as color from 'ol/color';
import * as has from 'ol/has';
import {unByKey} from 'ol/Observable';
import VueI18n from "vue-i18n";

window.$script = $script;

window._ = _;

window.jsts = jsts;

window.isMobile = isMobile;

window.saveAs = saveAs;

window.moment = moment;

window.EventEmitter = EventEmitter;

window.proj4 = proj4;

/**
 * OpenLayers
 */

window.ol = ol;

ol.proj = {
  Projection,
  proj4: {
    register
  },
  transform,
  transformExtent,
  projections,
  Units,
  get,
  addProjection,
};

ol.extent = {
  extend,
  getWidth,
  getHeight,
  getCenter,
  containsExtent,
  boundingExtent,
}

ol.source = source;

ol.layer = layer;

ol.interaction = interaction;

ol.control = control;

ol.geom = geom;

ol.geom.Polygon.fromExtent = fromExtent;

ol.style = style;

ol.coordinate = coordinate;

ol.format = format;

ol.format.filter = filter;

ol.sphere = sphere;

ol.color = color;

ol.Observable.unByKey = unByKey;

ol.has = has;

/**
 * Vue
 */
window.Vue = require('vue2/dist/vue.min');

window.VueI18n = VueI18n;

/**
 * jQuery
 */
window.jQuery = window.$ = require('jquery');

window.bootbox = require('bootbox');

require('bootstrap');

require('bootstrap-datetimepicker-npm')(window.jQuery);

require('jquery-ui');

require('select2')(window.jQuery);

require('datatables.net')(window, window.jQuery);

require('blueimp-file-upload');

require('jquery-file-download');
