export default {
  default:"default",
  sign_in: "Sign in",
  yes: 'Yes',
  no: "No",
  back: "Back",
  backto: "Back to ",
  changemap: "Change map",
  change_session: "Change Session",
  component: "Generic Component",
  search: "Search",
  alerts: "Alerts",
  no_results: "No results found",
  print: "Print",
  create_print: "Create Print",
  dosearch: "Search",
  catalog: "Map",
  data: "Data",
  externalwms: "WMS",
  baselayers: "Base",
  tools: "Tools",
  tree: "Layers",
  legend: "Legend",
  nobaselayer: "No basemap",
  street_search: "Find Address",
  show: "Show",
  hide: "Hide",
  copy_form_data: "Copy data",
  paste_form_data: "Paste",
  copy_form_data_from_feature: "Copy data from map",
  error_map_loading: "Error occurs loading map",
  server_saver_error: "Error in server saving",
  server_error: "Server connection error",
  save: "Save",
  cancel: "Cancel",
  update: "Update",
  close: "Close",
  add: "Add",
  exitnosave: "Exit without save",
  annul: "Cancel",
  /** @since 3.11.0 */
  label: 'Label',
  /** @since 3.11.0 */
  homepage: 'Home',
  /** @since 3.11.0 */
  wms_server: 'WMS Server',
  screenshot_error: `  
  <p><b>Security Error</b>: an external layer is preventing map from being printed. To check, proceed as follows:</p>
  <ol>
    <li>remove any manually added external layers (eg. WMS layers)</li>
    <li>force page reload: <code>CTRL + F5</code></li>
    <li>print again the map</li>
  </ol>
  <p>For more info please contact server administrator about: <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image" style="color: #000 !important;font-weight: bold;">&#x2139;&#xFE0F; security and tainted canvases</a></p>`,
  layer_position: {
    top: 'top',
    bottom: 'bottom',
    message: "Position"
  },
  info: {
    title: "Results",
    list_of_relations: "List of Relations",
    open_link: "Open attached document",
    server_error: "An error occurred from server",
    no_results: "No results found for this query/search",
    link_button: "Open"
  },
  annotation_types: {
    'Point':      'Point',
    'LineString': 'Line',
    'Polygon':    'Polygon',
    'Rectangle':  'Rectangle',
    'Circle':     'Circle',
    'Text':       'Text'
  },
  scaleline_units: {
    metric: 'Meters',
    nautical: 'Nautical Mile'
  },
  screenshot_types: {
    screenshot: "PNG",
    geoscreenshot: "GeoTIFF",
  },
  measure_types: {
    length: "Length",
    area: "Area",
  },
  measure_descriptions: {
    length: "Click on map to draw the line. Press <br>CANC if you want delete last vertex",
    area: "Click to draw poligon.Press <br>CANC if you want delete last vertex"
  },
  print_help: `<p>If you don't see some layer in your print file:</p>
  <ol style="padding-left: 25px">
    <li>try again by selecting a different template</li>
    <li>try changing the zoom level</li>
    <li>check the origin (eg. third-party WMS server)</li>
    <li>make sure the item is actually checked within layers list</li>
  </ol>`,
  metadata_groups: {
    general: {
      title: 'GENERAL',
      fields: {
        title: 'TITLE',
        name: 'NAME',
        description: "DESCRIPTION",
        abstract: "ABSTRACT",
        keywords: 'KEYWORDS',
        fees: "FEES",
        accessconstraints: "ACCESS CONSTRAINT",
        contactinformation: "CONTACTS",
        subfields: {
          contactinformation: {
            contactelectronicmailaddress: "Email",
            personprimary: 'References',
            contactvoicetelephone: 'Phone',
            contactorganization: 'Organization',
            ContactOrganization: 'Organization',
            contactposition: 'Position',
            ContactPosition: 'Position',
            contactperson: 'Person',
            ContactPerson: 'Person'
          }
        },
        wms_url: "WMS"
      }
    },
    spatial:{
      title: 'SPATIAL',
      fields : {
        crs: 'EPSG',
        extent: 'BBOX'
      }
    },
    layers: {
      title: 'LAYERS',
      fields: {
        layers: 'LAYERS',
        subfields: {
          crs: 'EPSG',
          bbox: 'BBOX',
          title: "TITLE",
          name: 'NAME',
          geometrytype: 'GEOMETRY',
          source: 'SOURCE',
          attributes: 'ATTRIBUTES',
          abstract: 'ABSTRACT',
          attribution: 'ATTRIBUTION',
          keywords: "PAROLE CHIAVE",
          metadataurl:'METADATA URL',
          dataurl: "DATA URL"
        }
      },
      groups : {
        general: 'GENERAL',
        spatial: 'SPATIAL'
      }
    },
    credits: {
      title: 'Credits',
    }
  },
  download_types: {
    shapefile: "Download Shapefile",
    gpx: "Download GPX",
    gpkg: "Download GPKG",
    csv: "Download CSV",
    xls: "Download XLS",
    pdf: "Download PDF",
  },
  mapcontrols: {
    query: {
      input_relation: "Click to show relations"
    },
    queryby: {
      title: 'Query area',
      layer: 'Selected layer:',
      none: 'NONE',
      new: 'TEMPORARY LAYER',
      all: 'ALL',
      methods: {
        intersects: 'intersects',
        within: 'within'
      },
      querybypolygon: {
        tooltip: 'select a polygon'
      },
      querybydrawpolygon: {
        tooltip: 'draw a polygon'
      },
      querybbox: {
        tooltip: 'draw a rectangle'
      },
      querybycircle: {
        tooltip: 'draw a circle'
      },
      querybyfreehand: {
        tooltip: 'freehand'
      },
    },
    querybypolygon: {
      download: {
        title: "Attributes download",
        choiches:{
          feature: {
            label:"Features only",
          },
          feature_polygon: {
            label:"Features+Query Polygon",
          }
        }
      },
      tooltip: 'Query By Polygon',
      no_geometry: 'No geometry on response',
      help: {
        message: "<ul><li>Select a (visible) layer.</li><li>Click on a geometry within map.</li></ul>"
      }
    },
    querybydrawpolygon: {
      tooltip: "Query by Draw Polygon ",
      help: {
        message: "<ul><li>Click on map to add a new vertex</li><li>Double click to finish and query layers</li></ul>"
      }
    },
    querybbox: {
      tooltip: 'Query BBox layer',
      nolayers_visible: 'No querable layers are visible. Please set at least one visible wfs layer to run query',
      help: {
        message: "<ul><li>Drag the mouse to draw a rectangle and query layers</li></ul>"
      }
    },
    querybycircle: {
      tooltip: "Query by Draw Circle ",
      label: 'Radius',
      help: {
        message: "<ul><li>Click on map to draw circle</li></ul>"
      },
    },
    querybyfreehand: {
      tooltip: "Query by Draw Polygon (freehand)",
      help: {
        message: "<ul><li>Drag the mouse to draw a polygon and query the levels</li></ul>"
      },
    },
  },
  sdk: {
    search: {
      all: 'ALL',
      no_results: "No results",
      searching: "Searching ...",
      error_loading: "Error Loading Data",
      layer_not_searchable: "Layer is not searchable",
      layer_not_querable: "Layer is not querable",
      autocomplete: {
        inputshort: {
          pre: "Please enter",
          post: "or more characters"
        }
      },
      help_filter : "Search values are limited based on the active filter. Remove the filter to search all data.",
      autofilter: "Filter results",
      autofilter_tooltip: "Whether automatically filter geometries displayed within the map<br>in order to show only those related to current search results.",
    },
    form: {
      loading: 'Loading ...',
      inputs: {
        messages: {
          errors: {
            picklayer: "No feature selected. Check if layer is on editing or visible at current scale"
          }
        },
        tooltips:{
          picklayer: "Get value from ma layer",
          lonlat: "Click on map to get coordinates"
        },
        input_validation_mutually_exclusive: "Field mutually exclusive with ",
        input_validation_error: "Mandatory Field or wrong data type",
        input_validation_error_type: "Wrong data type",
        input_validation_min_field: "Value has to be more/equal to field value  ",
        input_validation_max_field: "Value has to be less/equal to field value ",
        input_validation_exclude_values: "Value has to be unique",
        integer: "integer",
        bigint: "integer",
        text: "text",
        varchar: "text",
        textarea: "text",
        string: "string",
        date: "date",
        datetime: "date",
        float: "float",
        table: "table"
      },
      footer: {
        "required_fields": "Required fields"
      },
      messages: {
        qgis_input_widget_relation: "Use relation specific form to work with relation"
      }
    },
    wps: {
      list_process: "List of process",
      tooltip: 'Click on map'
    }
  },
  /** BACKCOMP v3.x */
  'mapcontrols.add_layer_control.drag_layer': "Add your file here",
  /** BACKCOMP v3.x */
  'mapcontrols.add_layer_control.header': "Add Layer",
};
