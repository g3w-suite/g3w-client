import { DOTS_PER_INCH } from 'constant';

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
              DPI:         DOTS_PER_INCH,
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

};

module.exports = RasterLayers;
