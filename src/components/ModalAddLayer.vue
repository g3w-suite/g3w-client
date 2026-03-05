<!--
  @file
  @since 3.11.0
-->

<template>
  <dialog
    id            = "modal-addlayer"
    @beforetoggle = "onBeforetoggle"
    :style        = "{ width: wms_config ? 'min(85vw, 1400px)' : 'min(85vw, 600px)' }"
    :aria-label   = "$t('Add Layer')"
  >
    <form method="dialog" style="padding: 15px;">

      <button value="cancel" formnovalidate style="border: none;line-height: 1;font-weight: 700;font-size: 25px;background: none;position: absolute;inset: 15px 15px auto auto;width: 40px;height: 40px;">&times;</button>

      <h4
        style = "font-weight: bold"
        v-t   = "'Add Layer'"
      ></h4>

      <hr>

      <!-- MODAL BODY -->
      <div>

        <!-- LAYER TYPE -->
        <div class = "form-group">
          <label v-t = "'Layer type'"></label>
          <select id = "add-layer-type" class = "form-control" v-model="layer_type">
            <option disabled :value = "undefined" v-t = "'Choose type'"></option>
            <option value = "wms"  v-t = "'WMS (URL)'"></option>
            <option value = "tms"  v-t = "'TMS (URL)'"></option>
            <option value = "file" v-t = "'Local file'"></option>
          </select>
        </div>

        <hr>

        <!-- LOADING INDICATOR -->
        <div v-show = "loading" class = "bar-loader"></div>

        <div v-if = "'wms' === layer_type" class = "form-group">
          <!-- WMS URL -->
          <fieldset class = "form-group" :disabled = "wms_config" style = "width: 100%;">
            <!-- DOCS -->
            <a
              :href           = "`https://g3w-suite.readthedocs.io/en/v3.9.x/g3wsuite_client.html#wms`"
              target          = "_blank"
              style           = "float: right;"
              data-i18n-title = "Docs"
              data-placement  = "bottom"
            >
              <i aria-hidden = "true" class = "fa fa-external-link-alt"></i>
            </a>
            <label for = "add_wms_url">URL</label>
            <input
              id           = "add_wms_url"
              v-model.trim = "url"
              class        = "form-control"
              placeholder  = "http://example.org/?&service=WMS&request=GetCapabilities"
              type         = "url"
              list         = "wms_urls"
              required
            />
            <small v-if = "!wms_config" v-t = "'Search through saved connections or add a new server'"></small>
            <datalist id = "wms_urls">
              <option v-for = "wms in wms_urls" :key = "wms.id" :value = "wms.url">{{ wms.id }}</option>
            </datalist>
          </fieldset>

          <!-- WMS NAME -->
          <fieldset v-if = "url && !wms_config && !loading" class = "form-group" :disabled = "wms_config || wms_urls.some(l => url == l.url)">
            <label for = "add_wms_name" title = "required">
              <span v-t = "'Name'"></span>
              <i style = "font-family: Monospace;color: var(--skin-color);">*</i>
            </label>
            <input
              id           = "add_wms_name"
              v-model.trim = "id"
              class        = "form-control"
              type         = "text"
              required
            />
            <p v-if = "null !== id && wms_urls.some(l => id === l.id) && wms_urls.every(l => url !== l.url)" style = "color: red; margin: 10px 0;">
              ⚠️ <b v-t = "'A WMS connection with this name already exists'"></b>
            </p>
          </fieldset>

          <!-- SUBMIT BUTTON -->
          <button
            v-if                = "!wms_config"
            :disabled           = "!(id || '').trim() || wms_urls.some(l => id === l.id && url !== l.url) || !(url || '').trim().match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g)"
            @click.prevent.stop = "addWmsURL"
            class               = "btn btn-block btn-success"
          >
            <i aria-hidden = "true" class = "far fa-plus-square"></i>
            <span v-t = "'Connect'"></span>
          </button>

          <!-- LIST OF SAVED CONNECTIONS (from local storage) -->
          <div v-if = "!wms_config" class="form-group">
            <hr>
            <p v-if = "wms_urls.length" style = "text-align: center; font-weight: bold;" v-t = "'Saved connections:'"></p>
            <div v-for = "wms in wms_urls" :key = "wms.id" style = "border-bottom: 1px solid #ccc; padding-bottom: 3px;">
              <div style = "display: flex; justify-content: space-between; align-items: center; padding-top: 3px">
                <b @click = "fetchWMS(wms.url)"    :title = "$t('Connect')" style = "flex-grow: 1; cursor: pointer;">{{ wms.id }}</b>
                <i @click = "fetchWMS(wms.url)"    title  = "Connect" data-placement = "top"  class = "far fa-eye"   style = "color: var(--skin-color); padding: 3px; margin: 2px; font-size: 1.3em; cursor: pointer;"></i>
                <i @click = "deleteWmsUrl(wms.id)" title  = "Remove"  data-placement = "top"  class = "fas fa-trash" style = "color: red; padding: 3px; margin: 2px; font-size: 1.3em; cursor: pointer;"></i>
              </div>
              <small @click = "fetchWMS(wms.url)" :title = "$t('Connect')" style = "cursor: pointer;">{{ wms.url }}</small>
            </div>
          </div>

          <fieldset v-if = "wms_config" :disabled = "loading">

            <button
              type           = "button"
              class          = "close"
              style          = "float: right; padding: 5px 10px; margin-top: 15px; outline: 1px solid; color: red; opacity: 1;"
              @click         = "unloadWMS"
              title          = "Disconnect"
              data-placement = "left"
            >&times;</button>

            <h3 class = "skin-color g3w-wms-panel-title">{{ title }}</h3>

            <!-- LAYER INFO -->
            <fieldset v-if = "wms_config.abstract" class = "form-group" style = "border: 1px solid #c0c0c0; padding: 4.9px 8.75px 8.75px 10.5px;border-radius: 3px;font-size: small;">
              <legend style = "width: 15px; height: 15px; border: none; border-radius: 50%; background-color: rgb(34, 45, 50); font-weight: bold; color: rgb(255, 255, 255); font-size: 0.7em; display: flex; justify-content: center; margin: 0px -14px; user-select: none;">i</legend>
              {{ wms_config.abstract }}
            </fieldset>

            <!-- LAYERS NAME -->
            <div class="form-group">
              <label for="g3w-wms-layers">{{ $t('Layers') }}</label>
              <input
                id           = "g3w-wms-layers"
                class        = "form-control"
                :placeholder = "$t('Type to search layers')"
                v-model      = "wms_layers_filter"
                :aria-label  = "$t('Type to search layers')"
                style        = "margin-bottom:8px;"
              />
              <p><small>{{ wms_styles.length }} {{ $t('layers selected') }}</small></p>
              <table v-if = "wms_filtered_layers.length"  class="table" style="width:100%; display: block; max-height: 300px; overflow-y: scroll; user-select: none;">
                <thead style="position: sticky; top: 0; background-color: #f4f4f4;">
                  <tr>
                    <th style="width: 40px; text-align: center;">
                      <input
                        type         = "checkbox"
                        :checked     = "wms_all_selected"
                        @change.stop = "onToggleSelectAllWMS"
                        :aria-label  = "$t('Select all layers')"
                      />
                    </th>
                    <th v-t="'Title'"></th>
                    <th v-t="'Name'"></th>
                    <th v-t="'Abstract'"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(l, i) in wms_filtered_layers"
                    :key="l.__idx"
                    :style="{ background: wms_styles.includes(String(l.__idx)) ? 'rgba(25,77,51,0.05)' : 'transparent', cursor: 'pointer' }"
                    @click="wms_styles.includes(String(l.__idx)) ? wms_styles.splice(wms_styles.indexOf(String(l.__idx)),1) : wms_styles.push(String(l.__idx))"
                  >
                    <td style="width: 40px; text-align: center;">
                      <input type="checkbox" :value="String(l.__idx)" v-model="wms_styles" @click.stop />
                    </td>
                    <td><b>{{ l.title }}</b></td>
                    <td><small class="text-muted">{{ l.name }}</small></td>
                    <td><small>{{ l.abstract }}</small></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- EPSG PROJECTIONS -->
            <div class = "form-group">
              <label for = "g3w-wms-projections" v-t = "'Projection'"></label>
              <select id = "g3w-wms-projections" class = "form-control" v-model = "wms_projection">
                <option v-for = "p in projections">{{ p }}</option>
              </select>
            </div>

            <!-- LAYER POSITION -->
            <div class = "form-group">
              <label for = "position-layer" v-t = "'layer_position.message'"></label>
              <select id = "position-layer" class = "form-control" v-model = "position">
                <option :value = "'top'"    v-t = "'layer_position.top'"></option>
                <option :value = "'bottom'" v-t = "'layer_position.bottom'"></option>
              </select>
            </div>

            <!-- LAYER VISIBILITY -->
            <select id = "g3w-wms-visible" v-model = "wms_visible" hidden>
              <option :value = "false"></option>
              <option :value = "true"></option>
            </select>

            <!-- LAYER OPACITY -->
            <div class = "form-group">
              <label for = "g3w-wms-opacity" v-t = "'Opacity'"></label>
              <input
                id      = "g3w-wms-opacity"
                type    = "range"
                v-model = "wms_opacity"
                min     = "0"
                max     = "1"
                step    = "0.01"
                list    = "wms-opacity-markers"
              >
              <datalist id = "wms-opacity-markers" style="display: flex; justify-content: space-between;">
                <option value = "0">0</option>
                <option value = "0.25">0.25</option>
                <option value = "0.50">0.50</option>
                <option value = "0.75">0.75</option>
                <option value = "1">1</option>
              </datalist>
            </div>

            <!-- NAME OF LAYER TO SAVE -->
            <div class = "form-group">
              <label for = "g3w-wms-layer-name" v-t = "'Name'"></label>
              <input id  = "g3w-wms-layer-name" class = "form-control" type="text" v-model = "name">
            </div>

          </fieldset>

        </div>

        <div v-if = "'tms' === layer_type" class = "form-group">
          <!-- DOCS -->
          <a
            :href           = "`https://g3w-suite.readthedocs.io/en/v3.9.x/g3wsuite_client.html#tms`"
            target          = "_blank"
            style           = "float: right;"
            data-i18n-title = "Docs"
            data-placement  = "bottom"
          >
            <i aria-hidden = "true" class = "fa fa-external-link-alt"></i>
          </a>
          <!-- TMS URL -->
          <fieldset class = "form-group">
            <label for = "add_tms_url">URL</label>
            <input
              id           = "add_tms_url"
              v-model.trim = "tms_url"
              class        = "form-control"
              placeholder  = "https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              type         = "url"
              required
            />
            <small v-t = "'Inserisci l\'URL del servizio TMS (XYZ)'" />
          </fieldset>
          <!-- TMS NAME -->
          <fieldset class = "form-group">
            <label for = "add_tms_name" title = "required">
              <span v-t = "'Name'"></span>
              <i style = "font-family: Monospace;color: var(--skin-color);">*</i>
            </label>
            <input
              id           = "add_tms_name"
              v-model.trim = "tms_name"
              class        = "form-control"
              type         = "text"
              required
            />
          </fieldset>
          <!-- EPSG PROJECTIONS -->
          <div class = "form-group">
            <label for = "g3w-tms-projections" v-t = "'Projection'"></label>
            <select id = "g3w-tms-projections" class = "form-control" v-model = "tms_projection">
              <option :value = "'EPSG:3857'">EPSG:3857</option>
              <option :value = "'EPSG:4326'">EPSG:4326</option>
            </select>
          </div>
          <!-- LAYER POSITION -->
          <div class = "form-group">
            <label for = "position-layer-tms" v-t = "'layer_position.message'"></label>
            <select id = "position-layer-tms" class = "form-control" v-model = "position">
              <option :value = "'top'"    v-t = "'layer_position.top'"></option>
              <option :value = "'bottom'" v-t = "'layer_position.bottom'"></option>
            </select>
          </div>
          <!-- LAYER VISIBILITY -->
          <select id = "g3w-tms-visible" v-model = "tms_visible" hidden>
            <option :value = "false"></option>
            <option :value = "true"></option>
          </select>
          <!-- LAYER OPACITY -->
          <div class = "form-group">
            <label for = "g3w-tms-opacity" v-t = "'Opacity'"></label>
            <input
              id      = "g3w-tms-opacity"
              type    = "range"
              v-model = "tms_opacity"
              min     = "0"
              max     = "1"
              step    = "0.01"
              list    = "tms-opacity-markers"
            >
            <datalist id = "tms-opacity-markers" style = "display: flex; justify-content: space-between;">
              <option value = "0">0</option>
              <option value = "0.25">0.25</option>
              <option value = "0.50">0.50</option>
              <option value = "0.75">0.75</option>
              <option value = "1">1</option>
            </datalist>
          </div>
        </div>

        <div v-if = "'file' === layer_type" class = "form-group">

          <button
            v-if           = "layer_data"
            type           = "button"
            class          = "close"
            style          = "float: right; padding: 5px 10px; margin: 5px 0 0 8px;outline: 1px solid; color: red; opacity: 1;"
            @click         = "unloadFile"
            title          = "Remove"
            data-placement = "left"
          >&times;</button>

          <!-- FILE UPLOAD -->
          <form id = "addcustomlayer" :style = "{ padding: layer_data ? '0' : '20px 0' }">
            <input
              ref     = "input_file"
              type    = "file"
              @change = "parseFile"
              accept  = ".zip,.geojson,.GEOJSON,.kml,.kmz,.KMZ,.KML,.json,.gpx,.gml,.csv"
            />
            <h4 class = "skin-color">
              <b v-if = "!layer_data" v-t = "'Add your file here'"></b>
              <b v-else-if = "layer_name">{{ layer_name }}</b>
            </h4>
            <i v-if = "!layer_data" class = "fas fa-cloud-upload-alt fa-5x" aria-hidden = "true"></i>
            <span v-if = "!layer_data" style="font-family: Monospace;">.gml, .geojson, .kml, .kmz, .gpx, .csv, .zip (shapefile)</span>
          </form>

          <!-- CSV FILE (parsing options) -->
          <div v-if = "'csv' === file_type" class = "form-group" style = "padding: 15px; border: 1px solid grey; border-radius: 3px">
            <div v-show = "csv_loading" class = "bar-loader"></div>

            <label v-t = "'Delimiter'" for = "g3w-select-field-layer"></label>
            <select id = "g3w-select-separator" class = "form-control" v-model = "csv_separator" @change="parseFile">
              <option>,</option>
              <option>;</option>
            </select>

            <template v-if = "fields.length > 1 && !csv_wkt">
              <label v-t = "'X field'" for = "g3w-select-x-field"></label>
              <select id = "g3w-select-x-field" class = "form-control" v-model = "csv_x" :disabled = "!(fields || []).length" @change = "parseFile">
                <option v-for = "h in fields">{{ h }}</option>
              </select>

              <label v-t = "'Y field'" for = "g3w-select-y-field"></label>
              <select id = "g3w-select-y-field" class = "form-control" v-model = "csv_y" :disabled = "!(fields || []).length" @change = "parseFile">
                <option v-for = "h in fields">{{ h }}</option>
              </select>
            </template>

            <template v-if = "csv_wkt">
              <label for = "g3w-select-wkt-field">WKT</label>
              <select id = "g3w-select-y-field" class = "form-control" v-model = "csv_wkt">
                <option v-for = "h in fields">{{ h }}</option>
              </select>
            </template>

            <div v-if = "0 === fields.length" v-t = "'No valid fields'"></div>

            <small v-if = "olLayer" style="color: red;display: inline-block;margin-top: 1em;"><span v-t = "'Features found:'"></span> {{ feature_count }}</small>

          </div>

          <!-- DOCS -->
          <a
            :href          = "`https://epsg.io/${(layer_crs || '').toLowerCase().replace('epsg:', '')}`"
            target         = "_blank"
            style          = "float: right;"
            title          = "Docs"
            data-placement = "bottom"
          >
            <i aria-hidden = "true" class = "fa fa-external-link-alt"></i>
          </a>

          <!-- LAYER PROJECTION -->
          <fieldset class = "form-group" :disabled = "layer_data || ['kml','kmz'].includes(file_type)">
            <label for = "projection-layer" v-t = "'Projection'"></label>
            <select class = "form-control" id = "projection-layer" v-model = "layer_crs">
              <option v-for = "crs in new Set([map_crs, 'EPSG:3003','EPSG:3004', 'EPSG:3045', 'EPSG:3857', 'EPSG:4326', 'EPSG:6708', 'EPSG:23032', 'EPSG:23033', 'EPSG:25833', 'EPSG:32632', 'EPSG:32633'])">{{ crs }}</option>
            </select>
          </fieldset>

          <div v-if = "parse_errors.length" class = "form-group">
            <label for = "csv_parse_errors">⚠️ Parse errors:</label>
            <select id = "csv_parse_errors" class="form-control" style = "background-color: gold;font-family: Monospace;">
              <option v-for = "({ value, row }) in parse_errors">[{{ row }}] {{ value }}</option>
            </select>
          </div>

          <!-- LAYER POSITION -->
          <div v-if = "layer_data" class = "form-group">
            <label for = "position-layer" v-t = "'layer_position.message'"></label>
            <select class = "form-control" id = "position-layer" v-model = "position">
              <option :value = "'top'"    v-t = "'layer_position.top'"></option>
              <option :value = "'bottom'" v-t = "'layer_position.bottom'"></option>
            </select>
          </div>

          <!-- PERSISTENT LAYER  -->
          <div v-if = "layer_data" class = "form-group">
            <label for = "persistent-layer" v-t = "'Persistent data'"></label>
            <select class = "form-control" id = "persistent-layer" v-model = "persistent">
              <option :value = "false" v-t = "'no'"></option>
              <option :value = "true"  v-t = "'yes'"></option>
            </select>
            <small v-t = "'save layer into browser storage'"></small>
          </div>

          <!-- LAYER LABEL (visible field) -->
          <div v-if = "(fields || []).length" class = "form-group">
            <label v-t = "'label'" for = "g3w-select-field-layer"></label>
            <select id = "g3w-select-field-layer" class = "form-control" v-model = "field">
              <option :value = "null">---</option>
              <option v-for = "f in fields" :key = "f" :value = "f">{{ f }}</option>
            </select>
            <small v-t = "'field shown on map'"></small>
          </div>

          <!-- LAYER COLOR  -->
          <div v-if = "layer_data">
            <p v-t = "'Layer Color'" style = "font-weight: 700;"></p>
            <chrome-picker
              v-model = "layer_color"
              @input  = "onChangeColor"
              style   = "width:100%;"
            />
          </div>

        </div>

      </div>

      <!-- MODAL FOOTER -->
      <menu style="text-align: right; border-top: 1px solid #f4f4f4;">

        <!-- ERROR NOTICE -->
        <div
          v-if  = "error_message"
          style = "font-weight: bold; font-size: 1.2em; background-color: orange; padding: 10px; text-align: center; margin-bottom: 5px;"
          v-t   = "error_message">
        </div>

        <!-- CLOSE BUTTON -->
        <button
          v-t            = "'close'"
          value          = "cancel"
          class          = "btn btn-default"
          style          = "font-weight: bold; min-width: 70px;"
          formnovalidate
        ></button>

        <!-- SUBMIT BUTTON -->
        <button
          v-t         = "'add'"
          type        = "button"
          class       = "btn btn-success"
          @click.stop = "addLayer"
          :disabled   = "('wms' === layer_type ? !wms_layers.length : ('tms' === layer_type ? !(tms_url && tms_name) : !layer_data))"
          style       = "font-weight: bold; min-width: 70px; margin-bottom: 0; margin-left: 5px;"
        ></button>

      </menu>

    </form>
  </dialog>
</template>

<script>
import { Chrome as ChromeComponent } from 'vue-color';
import JSZip                         from 'jszip/dist/jszip.min';
import shp                           from 'shpjs';

import {
  GEOMETRY_FIELDS,
  DOTS_PER_INCH,
}                          from 'g3w-constants';
import ApplicationState    from 'g3w-state';
import GUI                 from 'g3w-app';
import { getUniqueDomId }  from 'utils/getUniqueDomId';
import { XHR }             from 'utils/XHR';

  
/**
 * ORIGINAL SOURCE: https://gist.github.com/luishdez/644215
 * 
 * Parse a delimited string into an array of arrays.
 */
function _CSVToArray(text, separator = ',') {
  // Create a regular expression to parse the CSV values.
  const pattern = new RegExp(
    (
      '(' + separator + '|\r?\n|\r|^)' + // Delimiters.
      '(?:"([^"]*(?:""[^"]*)*)"|' +      // Quoted fields.
      '([^"' + separator + "\r\n]*))"    // Standard fields.
    ),
    "gi"
  );

  const data = [[]];
  let matches = null;

  while (matches = pattern.exec(text)) {
    // exclude new line value
    if (matches[0] === '\r\n') {
      break;
    }
    // add an empty row to our data array
    if (matches[1].length && (matches[1] !== separator)
    ) {
      data.push([]);
    }
    // captured value (quoted or unquoted).
    data.at(-1).push(matches[2] ? matches[2].replace(new RegExp('""', 'g'), '"') : matches[3]);
  }

  // parsed data
  return data;
}

export default {

  /** @since 3.11.0 */
  name: 'modal-addlayer',

  data() {

    return {
      is_localhost:   'localhost' === window.location.hostname,
      layer_type:      undefined,
      file_type:       null,
      layer_name:      null,
      layer_crs:       ApplicationState.project.getProjection().getCode(),
      layer_color: {
        hex:  '#194d33',
        rgba: { r: 25, g: 77, b: 51, a: 1, },
        a:    1,
      },
      wms_config:       null,
      wms_urls:         [],   // array of object {id, url}
      wms_projection:   null, // choose epsg project
      wms_styles:       [],   // selected layers styles
      wms_layers:       [],   // selected layers
      wms_layers_filter: '',  // search filter (wms layers)
      wms_visible:      true,
      wms_opacity:      1,
      url:              null,
      id:               null,
      olLayer:          null,
      map_crs:          ApplicationState.project.getProjection().getCode(),
      layer_data:       null,
      position:         'top', // layer position on map
      persistent:       false,
      loading:          false, // loading reactive status
      fields:           [],
      field:            null,
      csv_x:            null,
      csv_y:            null,
      csv_wkt:          null, //@since 3.11.0
      csv_separator:    ',',
      csv_loading:      false,
      name:             undefined,  // name of saved layer
      title:            null,       // title of layer
      layers:           [],         // Array of layers
      projections:      [],         // projections
      error_message:    '',
      parse_errors:     [],
      tms_url:         '',
      tms_name:        '',
      tms_projection:  'EPSG:3857',
      tms_visible:     true,
      tms_opacity:     1,
    }
  },

  components: {
    'chrome-picker': ChromeComponent,
  },

  computed: {

    feature_count() {
      return this.olLayer?.getSource().getFeatures().length || 0;
    },

    wms_filtered_layers() {
      const filter = (this.wms_layers_filter || '').toLowerCase().trim();
      // preserve original index via __idx so wms_styles (which store original indexes) keep working
      let mapped = (this.layers || []).map((l, idx) => ({ ...l, __idx: String(idx) }));

      // apply filter if present, otherwise show all
      if (filter) {
        mapped = mapped.filter(l => ((l.title || '') + (l.name || '') + (l.abstract || '')).toLowerCase().includes(filter));
      }

      return mapped;
    },

    wms_all_selected() {
      const vis = (this.wms_filtered_layers || []).map(l => String(l.__idx));
      if (!vis.length) return false;
      return vis.every(id => (this.wms_styles || []).includes(id));
    },

  },

  watch: {

    /**
     * Handle selected layers change  
     */
     wms_styles(wms_styles = []) {
      const config      = this.wms_config || {};
      const layers      = (config.layers || []).filter((l,i) => wms_styles.includes(i.toString()));
      const last        = (config.layers || []).findLastIndex(l => l == layers.at(-1));
      const projections = (config.layers || []).map(({ crss }) => crss.map(crs => `EPSG:${crs.epsg}`).sort())[last];

      if (0 === layers.length) {        // Reset epsg and projections to initial values
        this.wms_projection = null;
        this.projections    = [];
      } else if (1 === layers.length) { // take first layer selected supported crss
        this.wms_projection = projections[0];
        this.projections    = projections;
      } else {                          // get projections by name
        this.projections = this.projections.filter(p => projections.includes(p));
      }

      if (layers.length) {
        let i = 0;
        const styles = ` (${layers.map(l => l.title).join(' + ')})`;
        let suffix = styles;
        while(GUI.getLayerByName(config.title + suffix)) {
          suffix = ` ${styles} (${ ++i })`;
        }
        this.name = config.title + suffix;
      }

      this.wms_layers = layers;
    },

    /**
     * @returns { Promise<void> }
     */
    async wms_projection() {
      await this.$nextTick();
      const config      = this.wms_config || {};
      const projections = (config.layers || []).map(({ crss }) => crss.map(crs => `EPSG:${crs.epsg}`).sort());
      // Get layers that have current selected epsg projection
      this.layers = (null === this.wms_projection)
        ? config.layers
        : config.layers.filter((l,i) => projections[i].includes(this.wms_projection))
    },

    async layer_type(type, oldtype) {
      if (type && oldtype) {
        this.layer_type = undefined;
        await this.$nextTick();
        this.layer_type = type;
      }
      if ('file' === oldtype) {
        this.unloadFile();
      }
      if ('wms' === oldtype) {
        this.unloadWMS();
      }
    },

    url() {
      if (this.url && !this.wms_config && this.wms_urls.some(l => this.url == l.url)) {
        this.id = this.wms_urls.find(l => this.url == l.url).id;
      } else if (!this.url) {
        this.id = '';
      }
    },

  },

  methods: {

    onChangeColor(val) {
      this.layer_color = val;
    },

    onToggleSelectAllWMS(e) {
      const checked    = e.target.checked;
      const visibleIds = (this.wms_filtered_layers || []).map(l => String(l.__idx));
      if (checked) {
        // add visible ids preserving order and avoiding duplicates
        const current = [...(this.wms_styles || [])];
        visibleIds.forEach(id => { if (!current.includes(id)) current.push(id); });
        this.wms_styles = current;
      } else {
        // remove visible ids from current selection
        this.wms_styles = (this.wms_styles || []).filter(id => !visibleIds.includes(id));
      }
    },

    async parseFile() {
      const input = this.$refs.input_file;

      // skip invalid formats
      if (!input.accept.split(',').includes(`.${input.files[0].name.split('.').at(-1).toLowerCase()}`)) {
        this.error_message = 'Not supported format';
        return;
      }

      // skip invalid names
      if (GUI.getLayerByName(input.files[0].name)) {
        this.error_message = 'Layer with same name already added';
        return;
      }

      try {

        this.error_message = '';
        this.parse_errors  = [];
        this.layer_name    = input.files[0].name;
        this.file_type     = input.files[0].name.split('.').at(-1).toLowerCase();
        this.layer_data    = null;

        let features = [];
        let data;

        (this.fields || []).splice(0); // reset fields

        // KMZ file
        if ('kmz' === this.file_type) {
          const zip = await JSZip.loadAsync(input.files[0]);
          data      = await zip.file(/\.kml$/i).at(-1).async('text'); // get last kml file within folder
        }

        // SHAPE FILE
        if ('zip' === this.file_type) {
          const out = {}; // un-zip folder data
          const zip = await JSZip.loadAsync(input.files[0]);
          for (const f in zip.files) {
            if (/.+\.(shp|dbf|json|prj|cpg)$/i.test(f)) {
              const ext = (f.split('.').at(-1) || '').toLowerCase();
              out[ext] = await zip.files[f].async(['shp', 'dbf'].includes(ext) ?  'arraybuffer': 'text');
            }
          }
          data = JSON.stringify(await shp(out)); // convert to wsg84 (geojson)
        }

        // CSV file
        if ('csv' === this.file_type) {
          this.csv_loading = true;

          data         = _CSVToArray(await input.files[0].text(), this.csv_separator);
          const X      = ['x', 'lng', 'longitude', 'longitudine'];
          const Y      = ['y', 'lat', 'latitude', 'latitudine'];
          this.fields  = data.shift();
          const wkt    = this.fields.findIndex(f => 'wkt' === f.toLowerCase());
          const x      = this.fields.findIndex(f => X.includes(f.toLowerCase()));
          const y      = this.fields.findIndex(f => Y.includes(f.toLowerCase()));
          this.csv_wkt = this.csv_wkt || this.fields[wkt];                               // auto suggest "wkt" field
          this.csv_x   = this.csv_wkt || this.csv_x || this.fields[x] || this.fields[0]; // auto suggest "csv_x" field
          this.csv_y   = this.csv_wkt || this.csv_y || this.fields[y] || this.fields[1]; // auto suggest "csv_y" field

          data.forEach((row, i) => {
            const X = Number(row[x]);
            const Y = Number(row[y]);
            // check if coordinates are right
            if (!this.csv_wkt && (Number.isNaN(X) || Number.isNaN(Y))) {
              return this.parse_errors.push({ row: i + 1, value: data[i] });
            }
            try {
              const feat = new ol.Feature({
                geometry: (new ol.format.WKT()).readGeometry(this.csv_wkt ? row[wkt] : `POINT (${X} ${Y})`, {
                  dataProjection:    this.layer_crs,
                  featureProjection: GUI.getEpsg()
                }),
                ...(row.reduce((props, value, i) => { props[this.fields[i]] = value; return props; }, {}))
              });
              feat.setId(i);
              features.push(feat);
            } catch(e) {
              console.warn(e);
            }
          });

          this.csv_loading = false;
        }

        // other files
        if (!data) {
          data = await input.files[0].text() || {};
        }

        this.layer_crs  = ['kml','kmz'].includes(this.file_type) ? 'EPSG:4326' : this.layer_crs;

        // register EPSG
        await ApplicationState.projections.set(this.layer_crs);

        this.layer_data = data;

        // parse features
        if ('csv' !== this.file_type) {
          features = ({
            'gpx'    : new ol.format.GPX(),
            'gml'    : new ol.format.WMSGetFeatureInfo(),
            'geojson': new ol.format.GeoJSON(),
            'zip'    : new ol.format.GeoJSON(),
            'kml'    : new ol.format.KML({ extractStyles: false }),
            'kmz'    : new ol.format.KML({ extractStyles: false }),
            // 'csv'    : new ol.format.WKT(),
          })[this.file_type].readFeatures(data, {
            dataProjection:    this.layer_crs,
            featureProjection: GUI.getEpsg() || this.layer_crs,
          });
        }

        // @since 3.11.0 shp function create always features in 4326 coordinates
        if ('zip' === this.file_type && this.layer_crs !== 'EPSG:4326') {
          features.forEach(f => f.getGeometry().transform('EPSG:4326', this.layer_crs));
        }

        // ignore kml property [`<styleUrl>`](https://developers.google.com/kml/documentation/kmlreference)
        if (['kml', 'kmz'].includes(this.file_type)) {
          features.forEach(f => f.unset('styleUrl'));
        }

        if (features.length > 0) {
          this.olLayer = new ol.layer.Vector({
            source: new ol.source.Vector({ features }),
            name:   this.layer_name,
            id:     getUniqueDomId(),
          });
          this.fields = 'csv' === this.file_type ? this.fields : Object.keys(features[0].getProperties()).filter(prop => GEOMETRY_FIELDS.indexOf(prop) < 0);
        }

      } catch(e) {
        console.warn(e);
        this.error_message = `${e}`;
      }
    },

    async addLayer() {
      this.loading = true;
      // check if External Local layers already added (by name)
      const data = GUI.getLocalExternalLayersData();
      if ('wms' === this.layer_type) {
        const name = (this.name || `wms_${getUniqueDomId()}`).trim();

        try {
      
          const found = this.wms_config && (data.wms[this.url] || []).some(wms => wms.layers.length === this.wms_layers.length && this.wms_layers.every(l => wms.layers.includes(l.name)));

          if (found) {
            await this.fetchWMS(this.url);
          }

          const config = {
            url:      this.url,
            name,
            layers:   this.wms_layers.map(l => l.name),
            epsg:     this.wms_projection,
            position: this.position,
            visible:  this.wms_visible,
            opacity:  +this.wms_opacity,
          };

          data.wms = data.wms ?? {};

          data.wms[this.url] = data.wms[this.url] || [];
          data.wms[this.url].push(config);

          GUI.updateLocalExternalLayersData(data);

          try {
            await this._addExternalWMSLayer(config);
          } catch(e) {
            console.warn(e);
            GUI.removeExternalLayer(name);
            setTimeout(() => { GUI.showUserMessage({ type: 'warning', message: 'WMS Layer not added. Please check all wms parameter or url' }) });
          }
        } catch(e) {
          console.warn(e);
        }
        if (this.wms_config) {
          this.close();
        }
      }

      if ('tms' === this.layer_type) {
        try {
          const config = {
            position: this.position,
            opacity:  +this.tms_opacity,
            visible:  this.tms_visible,
            crs:      this.tms_projection,
            name:     this.tms_name,
            url:      this.tms_url,
          };

          data.tms = data.tms ?? {};

          data.tms[this.tms_url] = data.tms[this.tms_url] || [];
          data.tms[this.tms_url].push(config);

          GUI.updateLocalExternalLayersData(data);

          try {
            await this._addExternalTMSLayer(config);
          } catch(e) {
            console.warn(e);
            GUI.removeExternalLayer(this.tms_name);
            setTimeout(() => { GUI.showUserMessage({ type: 'warning', message: 'TMS Layer not added. Please check all wms parameter or url' }) });
          }
        } catch(e) {
          console.warn(e);
        }
        this.close();
      }

      if ('file' === this.layer_type) {
        try {
          await GUI.addExternalLayer(this.olLayer, {
            crs:        this.layer_crs,
            position:   this.position,
            color:      this.layer_color,
            field:      this.field,
            persistent: !!this.persistent,
            type:       this.file_type,
          });
          this.close();
        } catch(e) {
          console.warn(e);
          this.error_message = `${e}`;
        }
      }
      this.loading = false;
    },

    unloadFile() {
      this.error_message           = '';
      this.parse_errors            = [];
      this.loading                 = false;
      this.layer_name              = null;
      this.file_type               = null;
      this.layer_crs               = GUI.getCrs();
      this.layer_color             = { hex: '#194d33', rgba: { r: 25, g: 77, b: 51, a: 1 }, a: 1 };
      this.layer_data              = null;
      this.olLayer                 = null;
      this.fields                  = [];
      this.field                   = null;
      this.csv_x                   = null;
      this.csv_y                   = null;
      this.csv_wkt                 = null;
      //reset input file value to null to accept new file
      if (this.$refs.input_file) {
        this.$refs.input_file.value = null;
      }
    },

    /**
     * @since 4.1.0 
     * Reset tms fields
     */
    unloadTMS() {
      this.tms_url        = '';
      this.tms_name       = '';
      this.tms_projection = 'EPSG:3857';
      this.tms_visible    = true;
      this.tms_opacity    = 1;
    },

    unloadWMS() {
      let url              = this.url;
      this.url             = '';
      this.error_message   = '';
      this.wms_config      = null;
      this.wms_layers      = [];
      this.wms_opacity     = 1;
      this.wms_visible     = true;
      this.wms_styles      = [];
      this.name            = null;
      this.loading         = false;
      // HOTFIX: for wms name not showed when unloading server connection
      setTimeout(() => this.url = url);
    },

    /**
     * @returns { Promise<void> }
     */
    async addWmsURL() {
      this.loading = true;
      const wms    = { url: this.url, id: this.id, show: true };
      const found  = this.wms_urls.find(l => this.url === l.url);
      try {
        await this.fetchWMS(this.url);
        if (!found) {
          const data = GUI.getLocalExternalLayersData();
          this.wms_urls.push(wms);
          data.urls = this.wms_urls;
          GUI.updateLocalExternalLayersData(data);
        }
      } catch(e) {
        console.warn(e);
      }
      this.loading = false;
    },

    /**
     * Delete url from local storage
     * 
     * @param id
     */
    deleteWmsUrl(id) {
      this.wms_urls = this.wms_urls.filter(l => id !== l.id);
      const data    = GUI.getLocalExternalLayersData();
      data.urls     = this.wms_urls;
      GUI.updateLocalExternalLayersData(data);
    },

     /**
     * Add external TMS layer to map
     * 
     * @param { Object } tms
     * @param { string } tms.url
     * @param { string } tms.name
     * @param tms.epsg
     * @param tms.position
     * @param tms.opacity
     * @param tms.visible
     *
     * @returns {Promise<unknown>}
     */
    async _addExternalTMSLayer({
      url,
      name,
      epsg     = GUI.getEpsg(),
      position = 'top',
      opacity,
      visible  = true
    } = {}) {
      return new Promise((res, rej) => {
        name = name || getUniqueDomId();

        const olLayer = new ol.layer.Tile({
          source:  new ol.source.XYZ({
              url,
              projection:  ol.proj.get(epsg)?.getCode?.() ?? null,
              crossOrigin: 'anonymous',
            }),
          opacity,
          visible,
          id:      name,
          name:    name,
        })

        olLayer.getSource().once('tileloadend', res);
        olLayer.getSource().once('tileloaderror', rej);         

        GUI.addExternalLayer(olLayer, { position, opacity, visible, type: 'tms' });

        // HOTFIX: for hidden wms layers
        if (!this.tms_visible || !this.tms_opacity) {
          setTimeout(res, 1000);
        }
      });
 
    },

    /**
     * Add external WMS layer to map
     * 
     * @param { Object } wms
     * @param { string } wms.url
     * @param { string } wms.name
     * @param wms.epsg
     * @param wms.position
     * @param wms.opacity
     * @param wms.visible
     * @param wms.layers
     *
     * @returns {Promise<unknown>}
     */
    _addExternalWMSLayer({
      url,
      layers,
      name,
      epsg     = GUI.getEpsg(),
      position = 'top',
      opacity,
      visible  = true
    } = {}) {
      return new Promise((res, rej) => {
        name = name || getUniqueDomId();

        const olLayer = new ol.layer.Image({
          name,
          id:            name,
          opacity:       1.0,
          source:        new ol.source.ImageWMS({
            ratio:      1,
            url,
            projection: ol.proj.get(epsg)?.getCode?.() ?? null,
            // crossOrigin: 'anonymous',
            params:     Object.fromEntries(Object.entries({
              DPI:         DOTS_PER_INCH,
              TRANSPARENT: true,
              LAYERS:      layers ?? '',
              VERSION:     '1.3.0',
              SLD_VERSION: '1.1.0',
            })),
          })
        });

        olLayer.getSource().once('imageloadend', res);
        olLayer.getSource().once('imageloaderror', rej);

        GUI.addExternalLayer(olLayer, { position, opacity, visible, type: 'wms' });

        // HOTFIX: for hidden wms layers
        if (!this.wms_visible || !this.wms_opacity) {
          setTimeout(res, 1000);
        }
      });
    },

    /**
     * ORIGINAL SOURCE: src/app/gui/wms/vue/panel/wmslayerspanel.js@3.8.15
     * 
     * show add wms layers to wms panel
     * 
     * @param config
     * 
     * @returns { WmsLayersPanel }
     */
    async fetchWMS(url) {
      this.loading = true;
      try {
        const config = await XHR.post({
          url:         `${window.initConfig.interfaceowsurl}`,
          contentType: 'application/json',
          data:        JSON.stringify({ url: url || this.url, service: "wms" })
        });

        // skip on invalid response
        if (!config.result) {
          throw 'invalid response';
        }

        config.wmsurl = url || this.url;

        /** URL of wms */
        if (config.methods && config.methods.GetMap) {
          this.url = (config.methods.GetMap.urls || []).find(u => 'Get' === u.type).url;
        } else {
          this.url = config.wmsurl;
        }

        /** Title of wms */
        this.title = config.title;

        let i = 0;
        let suffix = '';
        while(GUI.getLayerByName(config.title + suffix)) {
          suffix = ` (${ ++i })`;
        }
        this.name  = config.title + suffix;

        // register projections
        config.layers.forEach(({ crss }) => crss.forEach(crs => ApplicationState.projections.set(crs.epsg)));

        /** Layers of wms */
        this.layers = config.layers;

        this.wms_config    = config;
        this.error_message = null;
      } catch(e) {
        console.warn(e);
        this.error_message = e;
      }
      this.loading = false;
    },

    templateResultLayers(state) {
      const layer = this.layers[state.id];
      if (!layer) { return state.text }
      return $(/*html*/`
        <sub>${ layer.name }</sub><br>
        <b>${ layer.title }</b><br>
        <i>${ layer.abstract || '' }</i>
      `);
    },

    templateSelectionLayers(state) {
      const layer = this.layers[state.id];
      if (!layer) { return state.text }
      return $(/*html*/`
        <sub>${ layer.name }</sub><br>
        <b>${ layer.title }</b>
      `);
    },

    /**
     * @since 4.1.0
     */
    async onBeforetoggle(e) {
      if ('open' === e.newState && window.innerWidth < 767) {
        GUI.hideSidebar();
      }
      if ('closed' === e.newState) {
        this.close(false);
      }
    },

    /**
     * @since 4.1.0
     */
    close(hide = true) {
      if (hide) {
        $('#modal-addlayer').modal('hide');
      }
      this.layer_type = undefined;
      this.unloadFile();
      this.unloadWMS();
      this.unloadTMS();
    },

  },

  async mounted() {
    document.body.appendChild(this.$el);

    await GUI.isMapReady();

    // Load WMS urls from local storage

    let data = GUI.getLocalExternalLayersData();

    if (undefined === data) {
      data = {
        urls: [], // unique url for wms
        wms:  {}, // object contains url as a key and array of layers bind to url
        tms:  {}, //@since 4.1.0 take in account tms layers
      };
      GUI.updateLocalExternalLayersData(data);
    }

    setTimeout(() => {
      GUI.on('change-layer-position-map', ({ id: name, position, type } = {}) => GUI.changeLayerData({ type, name, attr: { key: 'position', value: position }}));
      GUI.on('change-layer-opacity',      ({ id: name, opacity, type } = {})  => GUI.changeLayerData({ type, name, attr: { key: 'opacity',  value: opacity }}));
      GUI.on('change-layer-visibility',   ({ id: name, visible, type } = {})  => GUI.changeLayerData({ type, name, attr: { key: 'visible',  value: visible }}));

      // load eventually data
      //WMS
      Object.keys(data.wms).forEach(url => { data.wms[url].forEach(d => this._addExternalWMSLayer({ url, ...d })); });
      //TMS
      Object.keys(data.tms).forEach(url => { data.tms[url].forEach(d => this._addExternalTMSLayer({ url, ...d })); });
    });

    this.wms_urls = data.urls;
  },

};
</script>

<style scoped>
  #addcustomlayer {
    margin: 10px 0 10px 0px;
    position: relative;
    border: 2px dashed #97A1A8;
    display: flex;
    flex-direction:
    column;
    text-align: center;
    gap: 8px;
    opacity: .8;
  }
  #addcustomlayer input {
    position: absolute;
    outline: none;
    opacity: 0;
    cursor: pointer;
    inset: 0;
  }
  #add_wms_url::placeholder {
    font-size: 85%;
    opacity: .5;
  }
  .g3w-wms-panel-title {
    font-size: 1.2em;
    font-weight: bold;
    margin-bottom: 10px;
  }
</style>