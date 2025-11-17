/**
 * @file
 * @since 4.0.0
 */

import {
  G3W_FID,
  TIMEOUT,
}                              from 'g3w-constants';
import { gettext as _ }        from 'g3w-i18n';
import ApplicationState        from 'g3w-state';
import GUI                     from 'g3w-app';
import { saveBlob }            from 'utils/saveBlob';
import { getCatalogLayerById } from 'utils/getCatalogLayerById';
import { getCatalogLayers }    from 'utils/getCatalogLayers';
import { getUniqueDomId }      from 'utils/getUniqueDomId';

import shpwrite                from '@mapbox/shp-write';


// set download action tool
GUI.onafter('addActionsForLayers', (actions, layers) => {
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
          features.forEach((_, i) => undefined === this.state.toggled[i] ? Vue.set(this.state.toggled, i, false) : (this.state.toggled[i] = false))
        },
        cbk: (layer, feature, action, index) => {
          action.state.toggled[index] = !action.state.toggled[index];
          downloadFeatures({
            layer,
            features: [feature],
            action,
            index,
            down_with_polygon: 'polygon' === GUI.state.query.type && `${ GUI.state.query.fid }`
          });
        }
      });
    });
});

/**
 * @TODO simplify, always make use of <dialog> element
 */
export async function downloadFeatures({
  type,
  layer,
  features = [],
  action,
  index,
  html,
  down_with_relations = 0,
  down_with_polygon = false,
} = opts) {
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
                <option value="${layer.id}" selected>${ layer.name || layer.title }</option>
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
              <select name = "down_with_relations" class="form-control">
                <option value="1">${ _('yes') }</option>
                <option value="0">${ _('no') }</option>
              </select>
            </div>

            ${down_with_polygon ? /* html */` 
              <label>${ _('mapcontrols.querybypolygon.download.title') }</label>
              <select name = "down_with_polygon" style = "width: 100%" class = "form-control">
                <option value = "0">${ _('mapcontrols.querybypolygon.download.choiches.feature.label') } </option>
                <option value = "1">${ _('mapcontrols.querybypolygon.download.choiches.feature_polygon.label') }</option>
              </select> ` : '' 
            }

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
          const down_with_relations = Number(dialog.querySelector('[name="down_with_relations"]').value);
          const down_with_polygon   = dialog.querySelector('[name="down_with_polygon"]')?.value;
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
                GUI.getLayerByName(external_layer.name).getSource().getFeatures(),
                { dataProjection: external_layer.crs, featureProjection: GUI.getEpsg() || external_layer.crs }
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
              ...(down_with_polygon ? { sbp_qgs_layer_id: layer.id, sbp_fid: down_with_polygon } : {}),
              fids: features?.map(f => f.attributes[G3W_FID]).join(','),
              filtertoken: catalog_layer.getToken(),
              ...('GeoTiff-at-map-extent' === format ? { map_extent: GUI.getMapExtent().toString() } : {})
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
          GUI.showUserMessage({ type: 'alert', message: e.message || e });
        }
        ApplicationState.download = false;
      }
      if (action) action.state.toggled[index] = false;
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

    const { query = {} } = GUI.state;

    // filter out undefined properties
    const data = Object.fromEntries(Object.entries({

      down_with_relations,

      // search results + pagination (see: https://github.com/g3w-suite/g3w-client/pull/743)
      field: 'search' === query.type && query.search
        ? query.search.join()
        : undefined,

      // other query types ('point', 'polygon', 'bbox' ..)
      fids: 'search' !== query.type || !query.search
        ? query.fids || features.filter(f => !layer.filter?.active || f.selected).map(f => f.attributes[G3W_FID]).join(',')
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
        GUI.setLayerActionTool({ layer });
      }

      GUI.setLoadingContent(true);
  
      try {
        data.filtertoken = catalog_layer.getToken();

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

      const downloadsactions = GUI.state.layersactions[layer.id].find(action => 'downloads' === action.id);

      /** @FIXME add description */
      if (features.length > 1 && undefined === downloadsactions) {
        layer[type].active = false;
        GUI.setLayerActionTool({ layer });
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
        GUI.setCurrentActionLayerFeatureTool({ index, action, layer });
      }
    };

    /** @FIXME add description */
    if ('polygon' !== query.type) {
      await runDownload();
      return;
    }

    // check if multi-download if present
    const downloadsactions = GUI.state.layersactions[layer.id].find(action => 'downloads' === action.id);

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
      GUI.state.actiontools[CsvAttributes.name] = GUI.state.actiontools[layer.id] || {};
      GUI.state.actiontools[CsvAttributes.name][layer.id] = config;
      GUI.setCurrentActionLayerFeatureTool({
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
      GUI.setLayerActionTool({
        layer,
        component: has_config ? CsvAttributes : null,
        config:    has_config ? config : null,
      });
    }
  }

}