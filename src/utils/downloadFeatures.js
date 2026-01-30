/**
 * @file
 * @since 4.0.0
 */

import {
  G3W_FID,
  TIMEOUT,
}                                 from 'g3w-constants';
import { VM }                     from 'g3w-eventbus';
import { gettext as _ }           from 'g3w-i18n';
import ApplicationState           from 'store/application';
import GUI                        from 'services/gui';
import { saveBlob }               from 'utils/saveBlob';
import { getCatalogLayerById }    from 'utils/getCatalogLayerById';
import { getCatalogLayers }       from 'utils/getCatalogLayers';
import { getUniqueDomId }         from 'utils/getUniqueDomId';

import CsvAttributes              from 'components/QueryResultsActionQueryPolygonCSVAttributes.vue';
import DownloadFormats            from 'components/QueryResultsActionDownloadFormats.vue';

import shpwrite                   from '@mapbox/shp-write';

// set download action tool
GUI.once('ready', () => {
  GUI.getService('queryresults').onafter('addActionsForLayers', (actions, layers) => {
    const QUERY = GUI.getService('queryresults');
    layers
      .filter(layer => layer.downloads.length > 0)
      .forEach((layer) => {
        actions[layer.id].push({
          id:         'downloads',
          download:   true,
          class:      GUI.getFontClass('download'),
          state:      Vue.observable({ toggled: layer.features.reduce((a, _ , i ) => Object.assign(a, { [i]: null }), {}) }),
          toggleable: true,
          hint:       'Downloads',
          change({ features }) {
            features.forEach((_, i) => undefined === this.state.toggled[i] ? VM.$set(this.state.toggled, i, false) : (this.state.toggled[i] = false))
          },
          cbk: (layer, feature, action, index) => {
            action.state.toggled[index] = !action.state.toggled[index];
            QUERY.setCurrentActionLayerFeatureTool({ layer, index, action, component: (action.state.toggled[index] ? DownloadFormats : null) });
          }
        });
        QUERY.state.actiontools.downloadformats = QUERY.state.actiontools.downloadformats || {};
        QUERY.state.actiontools.downloadformats[layer.id] = {
          downloads: layer.downloads.map(format => ({
            id:       `download_${format}_feature`,
            download: true,
            format,
            class:    GUI.getFontClass(format),
            hint:     `download_types.${format}`,
            cbk: (layer, feature, action, index, html, down_with_relations) => {
              // un-toggle downloads action
              downloadFeatures(format, layer, feature, action, index, html, down_with_relations);
              if ('polygon' !== QUERY.state.query.type) {
                const downloadsaction = actions[layer.id].find(a => 'downloads' === a.id);
                downloadsaction.cbk(layer, feature, downloadsaction, index, html, down_with_relations);
              }
            }
          }))
        };
      });
  });
});

/**
 * @TODO simplify, always make use of <dialog> element
 */
export async function downloadFeatures(type, layer, features = [], action, index, html, down_with_relations = 0) {

  const QUERY = GUI.getService('queryresults');

  const catalog_layer = getCatalogLayerById(layer.id);

  // download started from CONTEXT MENU
  if (undefined === type && layer) {
    const external_layer = !catalog_layer && layer;
    const dialog = Object.assign(document.createElement('template'), {
      innerHTML: /* html */`
        <dialog>
          <h4 style="margin: 0; padding: .5em; color: #FFF; position: sticky; top: 0; background-color: #212c31"><i class="fas fa-download" style="margin-right: .5ch;"></i> ${ _('Export features') }</h4>
          <form method="dialog">

            <div class="form-group">
              <label>${ _('Layer') }</label>
              <select name="layer" class="form-control" disabled>
                <option value="${layer.id}" selected>${ layer.name }</option>
                ${
                  getCatalogLayers()
                  .filter(l => layer.id !== l.getId())
                  .map(l => /* html */`<option value="${l.getId()}">${ l.getName() }</option>`).join()
                }
              </select>
            </div>

            <div class="form-group">
              <label>${ _('Data Format') }</label>
              <select name="format" class="form-control">
                ${[
                    catalog_layer?.isGeoTIFFDownloadable?.() ? /* html */`<option value="GeoTiff">${ _('GeoTiff') }</option>` : '',
                    catalog_layer?.isGeoTIFFDownloadable?.() ? /* html */`<option value="GeoTiff-at-map-extent">${ _('GeoTiff (current view)') }</option>` : '',
                    catalog_layer?.isShpDownloadable?.()     ? /* html */`<option value="Shp">${ _('Shapefile') }</option>` : '',
                    catalog_layer?.isGpxDownloadable?.()     ? /* html */`<option value="Gpx">${ _('GPX') }</option>` : '',
                    catalog_layer?.isGpkgDownloadable?.()    ? /* html */`<option value="Gpkg">${ _('GeoPackage') }</option>` : '',
                    catalog_layer?.isCsvDownloadable?.()     ? /* html */`<option value="Csv">${ _('CSV') }</option>` : '',
                    catalog_layer?.isXlsDownloadable?.()     ? /* html */`<option value="Xls">${ _('Excel') }</option>` : '',
                    external_layer && 'wms' !== external_layer._type && external_layer.downloadUrl  ? /* html */`<option value="external-url">External URL</option>` : '',
                    external_layer && 'wms' !== external_layer._type && !external_layer.downloadUrl ? /* html */`<option value="external-shp">${ _('Shapefile') }</option>` : '',
                  ].filter(Boolean).join('')
                }
              </select>
            </div>

            <div class="form-group" ${ catalog_layer?.hasDowloadableRelations?.() ? '' : 'hidden' }>
              <label>${ _('Include relations in exported file?') }</label>
              <select name="down_with_relations" class="form-control">
                <option value="1">${ _('yes') }</option>
                <option value="0">${ _('no') }</option>
              </select>
            </div>

            <menu style="display: flex; justify-content: space-between;">
              <button id="confirm_button" type="submit" value="confirm" class="btn btn-block btn-success">Download</button>
            </menu>
          </form>

        </dialog>
      `.trim()
    }).content.firstChild;

    dialog.addEventListener("click", e => {
      if (e.target === dialog) {
        dialog.close();
      }
    });

    dialog.addEventListener('close', async () => {
      if ('confirm' === dialog.returnValue) {
        ApplicationState.download = true;
        try {
          const format              = dialog.querySelector('[name="format"]').value;
          //@since 4.0.6 Check if lauet has relation downloadble otherwise force to 0
          const down_with_relations = 1 * Boolean(catalog_layer?.hasDowloadableRelations?.()) * Number(dialog.querySelector('[name="down_with_relations"]').value);
          let blob, filename;

          if ('external-url' === format) {
            const response = external_layer.downloadUrl && await fetch(external_layer.downloadUrl, {
              headers: { 'Access-Control-Expose-Headers': 'Content-Disposition' }, // get filename from server
              signal:  AbortSignal.timeout(TIMEOUT),
            });
            if (!response?.ok) {
              throw (await response.json()).message;
            }
            blob     = await response.blob()
            filename = (response.headers.get('content-disposition') || 'filename=g3w_download_file').split('filename=').at(-1);
          }

          else if ('external-shp' === format) {
            filename     = layer.name.split(`.${external_layer.type}`)[0];
            blob         = await shpwrite.zip(
              // GeoJSONFile
              (new ol.format.GeoJSON()).writeFeaturesObject(
                GUI.getService('map').getLayerByName(external_layer.name).getSource().getFeatures(),
                { dataProjection: external_layer.crs, featureProjection: GUI.getService('map').getEpsg() || external_layer.crs }
              ),
              {
                outputType:     "blob",
                prj:            external_layer.crs,
                folder:         filename,
                types: {
                  point:        filename,
                  mulipoint:    filename,
                  polygon:      filename,
                  multipolygon: filename,
                  line:         filename,
                  polyline:     filename,
                  multiline:    filename,
                }
            });
          }

          else {
            const data = {
              down_with_relations,
              filtertoken: catalog_layer.getFilterToken(),
              ...('GeoTiff-at-map-extent' === format ? { map_extent: GUI.getService('map').getMapExtent().toString() } : {})
            };
            url       = catalog_layer.getUrl(format.replace('-at-map-extent', '').toLowerCase());
            response  = url && await fetch(url, {
              body:     Object.keys(data || {}).reduce((a, k) => { a.append(k, data[k]); return a; }, new FormData()),
              method:  'POST',
              headers: { 'Access-Control-Expose-Headers': 'Content-Disposition' }, // get filename from server
              signal:  AbortSignal.timeout(TIMEOUT),
            });
            if (!response?.ok) {
              throw (await response.json()).message;
            }
            blob     = await response.blob();
            filename = response.headers.get('content-disposition');
          }

          saveBlob(blob, filename);
        } catch (e) {
          GUI.notify.error(e.message || e);
        }
        ApplicationState.download = false;
      }
      dialog.remove();
    });

    document.body.appendChild(dialog);
    dialog.showModal();
  }

  // download started from QUERY RESULTS
  else {

    if (features && !Array.isArray(features)) {
      features = [features];
    }

    const { query = {} } = QUERY.state;

    // filter out undefined properties
    const data = Object.fromEntries(Object.entries({

      down_with_relations,

      // search results + pagination (see: https://github.com/g3w-suite/g3w-client/pull/743)
      field: 'search' === query.type && query.search
        ? query.search.join()
        : undefined,

      // other query types ('point', 'polygon', 'bbox' ..)
      fids: 'search' !== query.type || !query.search
        ? query.fids || features.filter(f => !layer.filter?.active || f.selection.selected).map(f => f.attributes[G3W_FID]).join(',')
        : undefined,

      // html element (pdf)
      html: 'pdf' === type ? html : undefined,

    }).filter(([_, v]) => v !== undefined));

    /**
     * A function that che be called in case of querybypolygon
     *
     * @param active
     */
    const runDownload = async (active = false) => {

      if (features.length > 1) {
        layer.downloadformats.active = active;
        QUERY.setLayerActionTool({ layer });
      }

      GUI.setLoadingContent(true);
  
      try {
        data.filtertoken = catalog_layer.getFilterToken();

        let url, response;

        if ('pdf' === type) {
          url       = catalog_layer.getUrl('pdf');
          response  = url && await fetch(url, {
            body:    JSON.stringify(data),
            method:  'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Expose-Headers': 'Content-Disposition' },
            signal:  AbortSignal.timeout(TIMEOUT),
          });
        } else {
          url       = catalog_layer.getUrl('shapefile' === type ? 'shp' : type);
          response  = url && await fetch(url, {
            body:     Object.keys(data || {}).reduce((a, k) => { a.append(k, data[k]); return a; }, new FormData()),
            method:  'POST',
            headers: { 'Access-Control-Expose-Headers': 'Content-Disposition' }, // get filename from server
            signal:  AbortSignal.timeout(TIMEOUT),
          });
        }

        if (!response?.ok) {
          throw (await response.json()).message;
        }

        saveBlob(await response.blob(), response.headers.get('content-disposition'));
      } catch(e) {
        GUI.showUserMessage({ type: 'alert', message: e || 'server_error', textMessage: !!e })
      }

      ApplicationState.download = true;
      ApplicationState.download = false;
  
      GUI.setLoadingContent(false);

      const downloadsactions = QUERY.state.layersactions[layer.id].find(action => 'downloads' === action.id);

      /** @FIXME add description */
      if (features.length > 1 && undefined === downloadsactions) {
        layer[type].active = false;
        QUERY.setLayerActionTool({ layer });
      }

      /** @FIXME add description */
      if (features.length > 1 && undefined !== downloadsactions) {
        layer.downloadformats.active = false;
      }

      /** @FIXME add description */
      if (features.length <= 1 && undefined === downloadsactions) {
        action.state.toggled[index] = false;
      }

      /** @FIXME add description */
      if (features.length <= 1 && undefined !== downloadsactions) {
        downloadsactions.state.toggled[index] = false;
      }

      /** @FIXME add description */
      if (features.length <= 1) {
        QUERY.setCurrentActionLayerFeatureTool({ index, action, layer });
      }
    };

    /** @FIXME add description */
    if ('polygon' !== query.type) {
      await runDownload();
      return;
    }

    // check if multi-download if present
    const downloadsactions = QUERY.state.layersactions[layer.id].find(action => 'downloads' === action.id);

    const config = {
      choices: [
        {
          id: getUniqueDomId(),
          type: 'feature',
          label: 'mapcontrols.querybypolygon.download.choiches.feature.label',
        },
        {
          id: getUniqueDomId(),
          type: 'polygon',
          label: 'mapcontrols.querybypolygon.download.choiches.feature_polygon.label',
        },
      ],
      // choose between only feature attribute or also polygon attribute
      download: (type) => {
        if ('polygon' === type) { // id type polygon add parameters to api download
          data.sbp_qgs_layer_id = layer.id;
          data.sbp_fid          = query.fid;
        } else {                  // force to remove
          delete data.sbp_fid;
          delete data.sbp_qgs_layer_id;
        }
        runDownload(true)
      }
    };

    /** @FIXME add description */
    if (1 === features.length && undefined === downloadsactions) {
      action.state.toggled[index] = true;
    }

    /** @FIXME add description */
    if (1 === features.length) {
      QUERY.state.actiontools[CsvAttributes.name] = QUERY.state.actiontools[layer.id] || {};
      QUERY.state.actiontools[CsvAttributes.name][layer.id] = config;
      QUERY.setCurrentActionLayerFeatureTool({
        layer,
        index,
        action,
        component: CsvAttributes,
      });
    }

    /** @FIXME add description */
    if (undefined === downloadsactions && 1 !== features.length) {
      layer[type].active = !layer[type].active;
    }

    /** @FIXME add description */
    if (1 !== features.length) {
      const has_config = (downloadsactions || (layer[type].active && undefined === downloadsactions));
      QUERY.setLayerActionTool({
        layer,
        component: has_config ? CsvAttributes : null,
        config:    has_config ? config : null,
      });
    }
  }

}

/**
 * @FIXME add description
 *
 * @param layer
 */
export function showDownloadFormats(layer) {
  const QUERY = GUI.getService('queryresults');

  layer.downloadformats.active = !layer.downloadformats.active;
  QUERY.setLayerActionTool({
    layer,
    component: layer.downloadformats.active ? DownloadFormats : null,
    config: layer.downloadformats.active
      ? {
          ...QUERY.state.actiontools.downloadformats[layer.id],
          //for download layer need to filter pdf format because it works only for a single feature
          downloads: QUERY.state.actiontools.downloadformats[layer.id].downloads.filter(d => 'pdf' !== d.format)
        }
      : null
  })
}