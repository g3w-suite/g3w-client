import { getDPI } from 'utils/getDPI';

const DPI          = getDPI();

const RasterLayers = {

  WMSLayer(opts = {}, method = 'GET') {
    return new (opts.tiled ? ol.layer.Tile : ol.layer.Image)({
      id:            opts.layerObj.id,
      name:          opts.layerObj.name,
      opacity:       undefined !== opts.layerObj.opacity ? opts.layerObj.opacity : 1.0,
      visible:       opts.layerObj.visible,
      extent:        opts.layerObj.extent,
      maxResolution: opts.layerObj.maxResolution,
      source: new (opts.tiled ? ol.source.TileWMS : ol.source.ImageWMS)({
        ratio:      1,
        url:        opts.layerObj.url,
        projection: (opts.layerObj.projection) ? opts.layerObj.projection.getCode() : null,
        params:     {
          ...Object.fromEntries(
            Object.entries({
              DPI,
              TRANSPARENT: true,
              FORMAT:      opts.layerObj.format,
              LAYERS:      undefined !== opts.layerObj.layers      ? opts.layerObj.layers : '',
              VERSION:     undefined !== opts.layerObj.version     ? opts.layerObj.version : '1.3.0',
              SLD_VERSION: undefined !== opts.layerObj.sld_version ? opts.layerObj.sld_version : '1.1.0',
            })
            // prevents sending "FORMAT" parameter when undefined
            .filter(([key, val])=>('FORMAT' !== key ? true : undefined !== val))
        ),
        ...(opts.extraParams || {})
        },
        imageLoadFunction: (opts.layerObj.iframe_internal || 'POST' === method)
          ? (tile, url) => {
            fetch('POST' === method ? (url || '').split('?')[0] : url, {
              method,
              headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
              body:    'POST' === method ? url.split('?')[1] : undefined,
            })
            .then(async response => tile.getImage().src = window.URL.createObjectURL(await response.blob()))
            .catch(e => { console.error('Invalid tile', ol.TileState.ERROR, e); tile.setState(ol.TileState.ERROR); });
          }
          : undefined,
      })
    });

  },

  XYZLayer(opts = {}, method = 'GET') {
    if (opts.url) {
      return new ol.layer.Tile({
        visible:    undefined !== opts.visible ? opts.visible : true,
        projection: opts.projection,
        source:     new ol.source.XYZ({
          url:              opts.url,
          maxZoom:          opts.maxZoom,
          minZoom:          opts.minZoom,
          projection:       opts.projection,
          crossOrigin:      opts.crossOrigin,
          tileLoadFunction: (opts.iframe_internal) ? (tile, url) => {
            fetch('POST' === method ? (url || '').split('?')[0] : url, {
              method,
              headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
              body:    'POST' === method ? url.split('?')[1] : undefined,
            })
            .then(async response => tile.getImage().src = window.URL.createObjectURL(await response.blob()))
            .catch(e => { console.error('Invalid tile', ol.TileState.ERROR, e); tile.setState(ol.TileState.ERROR); });
          } : undefined,
          /** @since 3.10.0 - Map Proxy cache_provider **/
          tileGrid: ('degrees' === opts.projection.getUnits() || 'mapproxy' === opts.cache_provider) ? new ol.tilegrid.TileGrid({
            // Need to remove the first resolution because in this version of ol createXYZ doesn't accept maxResolution options.
            // The extent of EPSG:4326 is not squared [-180, -90, 180, 90] as EPSG:3857 so the resolution is calculated
            // by Math.max(width(extent)/tileSize,Height(extent)/tileSize)
            // we need to calculate to Math.min instead, so we have to remove the first resolution
            resolutions: ol.tilegrid.createXYZ({ extent: opts.projection.getExtent(), maxZoom: opts.maxZoom }).getResolutions().slice(1),
            extent:      opts.projection.getExtent(),
          }) : undefined,
        })
      });
    }
  }

};

module.exports = RasterLayers;
