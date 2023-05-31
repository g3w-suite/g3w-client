/**
 * @since 3.9.0
 */

import $script from 'scriptjs';
window.$script = $script;

import _ from 'lodash';
window._ = _;

import * as jsts from 'jsts/dist/jsts.min';
window.jsts = jsts;


import isMobile from 'ismobilejs';
window.isMobile = isMobile;

import { saveAs } from 'file-saver';
window.saveAs = saveAs;

import moment from 'moment';
window.moment = moment;

import EventEmitter from 'eventemitter';
window.EventEmitter = EventEmitter;

import proj4 from 'proj4';
window.proj4 = proj4;

/**
 * OpenLayers
 */

import * as ol from 'ol';
window.ol = ol;

/**
 * ol proj
 */
import {register} from 'ol/proj/proj4';
import Projection from 'ol/proj/Projection';
import projections from 'ol/proj/projections';
import Units from 'ol/proj/Units';
import {get, addProjection, transformExtent, transform} from 'ol/proj';

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
  addProjection
};

/**
 * ol extent
 */
import {
  extend,
  getWidth,
  getHeight,
  getCenter,
  containsExtent
} from 'ol/extent';

ol.extent = {
  extend,
  getWidth,
  getHeight,
  getCenter,
  containsExtent,
}

/**
 * ol source
 */
import * as source from 'ol/source';
ol.source = source;

/**
 * ol layer
 */
import * as layer from 'ol/layer'
ol.layer = layer;

/**
 * ol interaction
 */

import * as interaction from 'ol/interaction';
ol.interaction = interaction;

/**
 * ol control
 */
import * as control from 'ol/control';
ol.control = control;

/**
 * ol geom
 */
import * as geom from 'ol/geom';
ol.geom = geom;

/**
 * ol style
 */
import * as style from 'ol/style';
ol.style = style;

/**
 * ol coordinate
 */
import * as coordinate from 'ol/coordinate';
ol.coordinate = coordinate;

/**
 * ol format
 */
import * as format from 'ol/format';
ol.format = format;

/**
 * ol color
 */
import * as color from 'ol/color';
ol.color = color;

/**
 * ol Observable
 */
import {unByKey} from 'ol/Observable';
ol.Observable.unByKey = unByKey;

/**
 * End Openlayers
 */

window.Vue = require('vue2/dist/vue.min');

window.jQuery = window.$ = require('jquery');
/**
 * Here all jquery dependencies
 */

window.bootbox = require('bootbox');

require('bootstrap');

require('bootstrap-datetimepicker-npm');

require('jquery-ui');

require('select2')( window.jQuery );

require('datatables.net')( window, window.jQuery );

require('blueimp-file-upload')

require('jquery-file-download');
