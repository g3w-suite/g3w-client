export default {
  translation: {
    error_page: {
      error: "Erro de conexão",
      at_moment: "De momento não é possível apresentar o mapa",
      f5: "Pressione Ctrl+F5"
    },
    cookie_law: {
      message: "Este site usa cookies para garantir que obtenha a melhor experiência de uso.",
      buttonText: "OK!"
    },
    default:"predefinido",
    sign_in: "Aceder",
    layer_selection_filter: {
      tools: {
        filter: "Ativar/desativar filtro",
        nofilter: "Remover filtro",
        invert: "Inverter Seleção",
        clear: "Limpar Seleção",
        show_features_on_map: "Atualizar resultados ao mover o mapa",
        savefilter: "Salvar Filtro",
        filterName: "Nome do Filtro",
      }
    },
    warning: {
      not_supported_format: "Formato não suportado"
    },
    layer_position: {
      top: 'cima',
      bottom: 'baixo',
      message: "Posição"
    },
    sdk: {
      atlas: {
        template_dialog: {
          title: "Selecione o Modelo"
        }
      },
      spatialbookmarks: {
        title: "Marcadores",
        helptext: "Altere a extensão do mapa, insira um nome e clique Adicionar",
        input: {
          name: "Nome"
        },
        sections: {
          project:{
            title: "Marcadores do projeto"
          },
          user: {
            title: "Marcadores do Utilizador"
          }
        }
      },
      search: {
        all: 'Todos',
        no_results: "Sem resultados",
        searching: "A pesquisar ...",
        error_loading: "Erro ao Carregar os Dados",
        layer_not_searchable: "Camada não é pesquisável",
        layer_not_querable: "Camada não é consultável (query)",
        autocomplete: {
          inputshort: {
            pre: "Please enter",
            post: "or more characters"
          }
        },
        help_filter : "Search values are limited based on the active filter. Remove the filter to search all data.",
        autofilter: "Filter results"

},
      print: {
        no_layers: 'Sem camada para imprimir',
        template: "Modelo",
        labels: "Etiquetas",
        scale: "Escala",
        scale: "Escala",
        format: "Formato",
        rotation: "Rotação",
        download_image: "Descarregar Imagem",
        fids_instruction: "Valores permitidos: de 1 até [max]. Pode inserir um intervalo ex. 4-6",
        fids_example: "Ex. 1,4-6 irá imprimir id 1,4,5,6",
        help: "Camadas a exportar serão definidas pelo administrador",
        help_details: `<p>Se não visualizar alguma camada no ficheiro de impressão</p>
          <ol style="padding-left: 25px">
            <li>tente novamente selecionando outro modelo</li>
            <li>tente mudar o nível de zoom</li>
            <li>verifique a origem (ex. Servidor WMS externos)</li>
            <li>garanta que a camada está ativada na lista de camadas.</li>
          </ol>`,
      },
      querybuilder: {
        title: 'Pesquisa avançada',
        search: {
          run: "Executar",
          info: "Informação",
          delete: "Eliminar",
          edit: "Editar"
        },
        messages: {
          changed: 'Guardado',
          number_of_features: "Entidades encontradas:"
        },
        panel: {
          button: {
            all: 'PESQUISE UM VALOR',
            save: 'GUARDAR',
            test: 'TESTAR',
            clear: 'LIMPAR',
            run: 'EXECUTAR',
            manual: 'MANUAL'
          },
          layers: 'CAMADAS',
          fields: 'CAMPOS',
          values: 'VALORES',
          operators: 'OPERADORES',
          expression: 'EXPRESSÃO'
        },
        error_run: 'An error occurs. Please check the query',
        error_test: "An error occur during query execution",
        delete: 'Do you want delete it?',
        additem: 'Insert the name of the new search'
      },
      errors: {
        layers: {
          load: "Some layers are not available"
        },
        unsupported_format: 'Not supported format',
        add_external_layer: 'Load layer error'
      },
      metadata: {
        title: 'Metadados',
        groups: {
          general: {
            title: 'GERAL',
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
            title: 'ESPACIAL',
            fields : {
              crs: 'EPSG',
              extent: 'BBOX'
            }
          },
          layers: {
            title: 'CAMADAS',
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
            title: 'Créditos',
          }
        }
      },
      tooltips: {
        relations: {
          form_to_row: "Row View",
          row_to_form: "Form View",
          zoomtogeometry: "Zoom to Geometry",
        },
        copy_map_extent_url: 'Copiar URL partilhável',
        download_shapefile: "Descarregar Shapefile",
        download_gpx: "Descarregar GPX",
        download_gpkg: "Descarregar GPKG",
        download_csv: "Descarregar CSV",
        download_xls: "Descarregar XLS",
        download_pdf: "Descarregar PDF",
        show_chart: "Mostrar Gráfico",
        atlas: "Imprimir Atlas",
        editing: "Edição",
      },
      mapcontrols: {
        query: {
          tooltip: 'Consultar camada',
          actions: {
            add_selection: {
              hint: "Adicionar/Remover Seleção"
            },
            zoom_to_features_extent:{
              hint: "Zoom to features extent"
            },
            add_features_to_results: {
              hint: "Adicionar/Remover camadas aos resultados"
            },
            remove_feature_from_results: {
              hint: "Remover camada dos resultados"
            },
            zoom_to_feature: {
              hint: "Ampliar para a camada"
            },
            relations: {
              hint: "Mostrar Relações"
            },
            relations_charts: {
              hint: "Mostrar gráfico das relações"
            },
            download_features_shapefile:{
              hint: 'Download features Shapefile'
            },
            download_shapefile: {
              hint: 'Download feature Shapefile'
            },
            download_features_gpx: {
              hint: "Download feature GPX"
            },
            download_features_gpkg: {
              hint: "Download features GPKG"
            },
            download_gpx: {
              hint: "Download feature GPX"
            },
            download_gpkg: {
              hint: "Download feature GPKG"
            },
            download_features_csv: {
              hint: "Download features CSV"
            },
            download_csv: {
              hint: "Download feature CSV"
            },
            download_features_xls: {
              hint: "Download features XLS"
            },
            download_xls: {
              hint: "Download feature XLS"
            },
            download_pdf: {
              hint: "Download feature PDF"
            },
            atlas: {
              hint: "Print Atlas"
            },
            copy_zoom_to_fid_url: {
              hint: "Compartilhar link",
              hint_change: "Copiado"
            }
          }
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
          }
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
            message: "<ul><li>Click on map to add a new vertex</li><li>Double click to finish and query layers (underlined in yellow in legend)</li></ul>"
          }
        },
        querybbox: {
          tooltip: 'Query BBox layer',
          nolayers_visible: 'No querable layers are visible. Please set at least one visible wfs layer to run query',
          help: {
            message: "<ul><li>Drag the mouse to draw a rectangle and query layers (underlined in yellow in legend)</li></ul>"
          }
        },
        querybycircle: {
          tooltip: "Query by Draw Circle ",
          label: 'Radius',
          help: {
            message: "<ul><li>Click on map to draw circle</li></ul>"
          },
        },
        addlayer: {
          messages: {
            csv: {
              warning: "The result in the map is partial due to the presence of the below incorrect records list:"
            }
          },
          tooltip: 'Add Layer'
        },
        geolocation: {
          tooltip: 'Geolocalização'
        },
        measures: {
          title: 'Medir',
          length: {
            tooltip: "Comprimento",
            help: "Clique no mapa  on map to draw the line. Press <br>CANC if you want delete last vertex",
          },
          area: {
            tooltip: "Area",
            help: "Click to draw poligon.Press <br>CANC if you want delete last vertex"
          }
        },
        screenshot: {
          title: 'Screen capture',
          screenshot: "PNG",
          geoscreenshot: "GeoTIFF",
          download: 'Generate'
        },
        scale: {
          no_valid_scale: "Escala inválida"
        },
        scaleline: {
          units: {
            metric: 'Metros',
            nautical: 'Milhas náuticas'
          }
        },
        zoomhistory: {
          zoom_last: "Zoom anterior",
          zoom_next: "Zoom seguinte"
        }
      },
      relations: {
        relation_data: 'Relation data',
        no_relations_found: 'No relations found',
        back_to_relations: 'Back to relations',
        list_of_relations_feature: 'List of relations of feature',
        error_missing_father_field: "Field is missing",
        field: "Relation key field",
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
      catalog: {
        current_map_theme_prefix: "TEMA",
        choose_map_theme: "ESCOLHA O TEMA",
        choose_map_theme_input_label: 'Nome do novo tema do mapa',
        project_map_theme : 'Tema do Projeto',
        user_map_theme: 'Temas do utilizador',
        question_delete_map_theme: "Pretende eliminar o tema?",
        delete_map_theme: "Tema apagado com sucesso",
        saved_map_theme: "Tema guardado com sucesso",
        updated_map_theme: "Tema alterado com sucesso",
        invalid_map_theme_name: "Nome inválido",
        menu: {
          layerposition: 'Posição da camada',
          setwmsopacity: "Definir transparência",
          wms: {
            title:"",
            copy: "Clique para copiar o endereço",
            copied: "Copiado"
          },
          download: {
            unknow: 'Descarregar',
            geotiff_map_extent: "GeoTiff (vista atual)"
          }
        }
      },
      wps: {
        list_process: "List of process",
        tooltip: 'Clique no mapa'
      }
    },
    credits: {
      g3wSuiteFramework: "Application based on OS framework",
      g3wSuiteDescription: "Publish and manage your QGIS projects on the web",
      productOf: "Framework developed by",
    },
    toggle_color_scheme: "Toggle color scheme",
    logout: "Logout",
    no_other_projects: "Não existem mais projetos para este grupo",
    no_other_groups: "Não existem outros Grupos para este Macrogrupo",
    yes: "Sim",
    no: "Não",
    back: "Voltar",
    backto: "Voltar para ",
    changemap: "Alterar mapa",
    change_session: "Alterar Sessão",
    component: "Generic Component",
    search: "Pesquisar",
    no_results: "No results found",
    print: "Imprimir",
    create_print: "Create Print",
    dosearch: "Pesquisar",
    catalog: "Mapa",
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
    copy_form_data: "Copiar dados",
    paste_form_data: "Colar",
    copy_form_data_from_feature: "Copia dados do mapa",
    error_map_loading: "Error occurs loading map",
    check_internet_connection_or_server_admin: "Check internet connection or contact admin",
    could_not_load_vector_layers: "Connection error: Layers can be loaded",
    server_saver_error: "Error in server saving",
    server_error: "Server connection error",
    save: "Guardar",
    cancel: "Cancelar",
    update: "Atualizar",
    close: "Fechar",
    /** @since 3.8.0 */
    dont_show_again: "Don't show again",
    enlange_reduce: "Enlarge / Reduce",
    add: "Add",
    exitnosave: "Sair sem guardar",
    annul: "Cancel",
    layer_is_added: "Camada com o mesmo nome já adicionada",
    sidebar: {
      wms: {
        panel: {
          title:'Adicionar Camada WMS',
          label: {
            position: "Posição do Mapa",
            name: "Nome",
            projections: 'Projeção',
            layers: 'Camadas'
          }
        },
        add_wms_layer: "Add WMS layer",
        delete_wms_url: "Remove",
        layer_id_already_added: "A WMS connection with this name already exists",
        url_already_added: "WMS URL/Name already added",
        layer_add_error: "WMS Layer not added. Please check all wms parameter or url"
      }
    },
    info: {
      title: "Results",
      list_of_relations: "List of Relations",
      open_link: "Open attached document",
      server_error: "An error occurred from server",
      no_results: "No results found for this query/search",
      link_button: "Open"
    },
    mapcontrols: {
      geolocation: {
        error: "Can't get your position"
      },
      geocoding: {
        choose_layer: "Choose a layer where to add this feature",
        placeholder: "Address ...",
        nolayers: "No editable point layers found on this project",
        noresults: "No results",
        notresponseserver: "No response from server"
      },
      add_layer_control: {
        header: "Add Layer",
        select_projection: "Projection",
        select_field_to_show: "field shown on map",
        select_csv_separator: "Delimiter",
        select_csv_x_field: "X field",
        select_csv_y_field: "Y field",
        select_color: "Layer Color",
        drag_layer: "Add your file here",
        persistent_data: "Persistent data",
        persistent_help: "save layer into browser storage",
      },
      query: {
        input_relation: "Click to show relations"
      },
      length: {
        tooltip: "Length"
      },
      area: {
        tooltip: "Area"
      },
      screenshot: {
        error: "Screenshot error creation",
        securityError: `  
        <p><b>Security Error</b>: an external layer is preventing map from being printed. To check, proceed as follows:</p>
        <ol>
          <li>remove any manually added external layers (eg. WMS layers)</li>
          <li>force page reload: <code>CTRL + F5</code></li>
          <li>print again the map</li>
        </ol>
        <p>For more info please contact server administrator about: <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image" style="color: #000 !important;font-weight: bold;">&#x2139;&#xFE0F; security and tainted canvases</a></p>
        `
      }
    },
    catalog_items: {
      helptext: "Open menu",
      contextmenu: {
        zoomtolayer: "Zoom to Layer",
        open_attribute_table: "Open Attribute Table",
        show_metadata: "Metadata",
        styles: 'Style',
        vector_color_menu:"Color",
        layer_opacity: "Opacity",
        filters: "Filters",
        download: 'Save as',
        ogc_services: 'OGC Services',
        edit: "Edit Layer",
      }
    },
    dataTable: {
      previous: "Previous",
      next: "Next",
      lengthMenu: "Show _MENU_ values per page",
      info: "_TOTAL_ entries",
      no_data: "No data",
      nodatafilterd: "No matching records found",
      infoFiltered: "(filtered from _MAX_ total records)"
    },
    /**@since 3.10.0 */
    no_geometry: 'This item has no geometry',
    /**@since 3.11.0 */
    query_filter: 'Filter by:',
    /**@since 3.11.0 */
    sidebar_menu: 'Sidebar menu',
    /**@since 3.11.0 */
    layer_type: 'Layer type',
    /** @since 3.11.0 */
    choose_type: 'Choose type',
    /**@since 3.11.0 */
    remote_wms_url: 'WMS (URL)',
    /**@since 3.11.0 */
    local_file: 'Local file',
    /**@since 3.11.0 */
    embed_map: 'Incorporar Mapa',
    /** @since 3.11.0 */
    homepage: 'Home',
    /** @since 3.11.0 */
    wms_server: 'WMS Server',
    /** @since 3.11.0 */
    connect_to_wms: 'Connect',
    /** @since 3.11.0 */
    disconnect_from_wms: 'Disconnect',
    /** @since 3.11.0 */
    add_new_wms_url_help: 'Search through saved connections or add a new server',
    /** @since 3.11.0 */
    saved_connections: 'Saved connections:',
    /** @since 3.11.0 */
    label: "Label",
    /** @since 3.11.0 */
    no_csv_field: 'No valid fields',
    /** @since 3.11.0 */
    show_more: 'Show more',
  },
};
