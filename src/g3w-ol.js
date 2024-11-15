/**
 * @file
 * @since 3.11.0
 */

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
import * as layer           from 'ol/layer';
import * as loadingstrategy from 'ol/loadingstrategy';
import * as Observable      from 'ol/Observable';
import * as proj            from 'ol/proj';
import * as proj4           from 'ol/proj/proj4';
import * as projections     from 'ol/proj/projections';
import * as Units           from 'ol/proj/Units';
import * as render          from 'ol/render';
import * as size            from 'ol/size';
import * as source          from 'ol/source';
import * as sphere          from 'ol/sphere';
import * as style           from 'ol/style';
import * as tilegrid        from 'ol/tilegrid';
import * as xml             from 'ol/xml';

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
  format: Object.assign({}, format, { filter }),
  geom:   Object.assign({}, geom,   { Polygon: Object.assign(geom.Polygon, Polygon) }),
  has,
  interaction,
  layer,
  loadingstrategy,
  proj:   Object.assign({}, proj,   { proj4, projections, Units, }),
  render,
  size,
  source,
  sphere,
  style,
  tilegrid,
  xml,
  Observable,
});