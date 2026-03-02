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

import shpwrite                from '@mapbox/shp-write';


// set download action tool
GUI.onafter('addActionsForLayers', (actions, layers) => {
  layers
    .filter(l => l.downloads.length > 0)
    .forEach((layer) => {
      actions[layer.id].push({
        id:         'downloads',
        download:   true,
        class:      "fas fa-download",
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
  layer,
  features = [],
  action,
  index,
  down_with_polygon = false,
  filter
} = opts) {

  // sanity check
  if (features && !Array.isArray(features)) {
    features = [features];
  }

  if (!layer) {
    throw 'no layer';
  }

  const catalog_layer  = getCatalogLayerById(layer.id);
  const external_layer = !catalog_layer && layer;
  const dialog = Object.assign(document.createElement('template'), {
    innerHTML: /* html */`
      <dialog>
        <h4 style="margin: 0; padding: .5em; color: #FFF; position: sticky; top: 0; background-color: #212c31"><i class="fas fa-download" style="margin-right: .5ch;"></i> ${ _('Export features') }</h4>
        <form method="dialog">

          <div class="form-group">
            <label>${ _('Layer') }</label>
            <select name="layer" class="form-control" disabled>
              <option value="${layer.id}" selected>${ layer.name || layer.title } ${ features.length ? `(${features.length})` : ''}</option>
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
                  catalog_layer?.isGeoTIFFDownloadable?.()                        ? /* html */`<option value="GeoTiff">${ _('GeoTiff') }</option>` : '',
                  catalog_layer?.isGeoTIFFDownloadable?.()                        ? /* html */`<option value="GeoTiff-at-map-extent">${ _('GeoTiff (current view)') }</option>` : '',
                  catalog_layer?.isShpDownloadable?.()                            ? /* html */`<option value="Shp">${ _('Shapefile') }</option>` : '',
                  catalog_layer?.isGpxDownloadable?.()                            ? /* html */`<option value="Gpx">${ _('GPX') }</option>` : '',
                  catalog_layer?.isGpkgDownloadable?.()                           ? /* html */`<option value="Gpkg">${ _('GeoPackage') }</option>` : '',
                  catalog_layer?.isCsvDownloadable?.()                            ? /* html */`<option value="Csv">${ _('CSV') }</option>` : '',
                  catalog_layer?.isXlsDownloadable?.()                            ? /* html */`<option value="Xls">${ _('Excel') }</option>` : '',
                  1 === features.length && catalog_layer?.state?.download_pdf     ? /* html */`<option value="Pdf">${ _('PDF') }</option>` : '',
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
              <option value = "0">${ _('mapcontrols.querybypolygon.download.choiches.feature.label') }</option>
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

  dialog.querySelector('form').addEventListener('input', e => {
    // disable "down_with_relations" in case of PDF format
    if ('format' === e.target.name && catalog_layer?.hasDowloadableRelations?.()) {
      e.target.form.querySelector('[name="down_with_relations"]').value    = Number('Pdf' !== e.target.value);
      e.target.form.querySelector('[name="down_with_relations"]').disabled = 'Pdf' === e.target.value;
    }
  });

  dialog.addEventListener('close', async () => {
    if ('confirm' === dialog.returnValue) {
      ApplicationState.download = true;
      try {
        const format              = dialog.querySelector('[name="format"]').value;
        //@since 4.0.6 Check if layer has relation downloadble otherwise force to 0
        const down_with_relations = 1 * Boolean(catalog_layer?.hasDowloadableRelations?.()) * Number(dialog.querySelector('[name="down_with_relations"]').value);        const down_with_polygon   = dialog.querySelector('[name="down_with_polygon"]')?.value;
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
            ...( !filter ? { fids: features?.map(f => f.attributes[G3W_FID]).join(',') } : {} ),
            ...(catalog_layer.getToken() ? { filtertoken: catalog_layer.getToken() } : {}),
            ...(filter || {}),
            ...('GeoTiff-at-map-extent' === format ? { map_extent: GUI.getMapExtent().toString() } : {}),
            ...('Pdf' === format ? { html:  document.querySelector(`[feature-html-content="${layer.id}_${index}"]`).innerHTML } : {})
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
      } catch(e) {
        GUI.showUserMessage({ type: 'alert', message: e.message || e });
      }
      ApplicationState.download = false;
    }
    if (action) {
      action.state.toggled[index] = false;
    }
    dialog.remove();
  });

  document.body.appendChild(dialog);
  dialog.showModal();
}