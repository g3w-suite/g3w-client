const translations = {
  it: {
    translation: {
      cookie_law: {
        message: "Questo sito utilizza i cookie per garantire una buona usabilità all'utilizzatore finale.",
        buttonText: "Ho capito!"
      },
      default:"predefinito",
      sign_in: "Accedi",
      layer_selection_filter: {
        tools: {
          filter: "Aggiungi/Rimuovi Filtro",
          nofilter: "Rimuovi filtro",
          invert: "Inverti Selezione",
          clear: "Annulla selezione",
          show_features_on_map: "Mostra features visibili su mappa"
        }
      },
      warning: {
        not_supported_format: "Formato non supportato"
      },
      layer_position: {
        top: 'SOPRA',
        bottom: 'IN FONDO',
        message: "Posizione rispetto ai layers della TOC"
      },
      sdk: {
        search: {
          all: 'TUTTE',
          no_results: "Nessun valore trovato",
          searching: "Sto cercando ..",
          error_loading: "Errore nel caricamento valori",
          layer_not_searchable: "Il layer non è ricercabile",
          layer_not_querable: "Il layer non è interrogabile",
          autocomplete: {
            inputshort: {
              pre: "Digita almeno",
              post: "caratteri"
            }
          }
        },
        print: {
          no_layers: 'Nessun Layer visibile',
          scale: "Scala",
          format: "Formato",
          rotation: "Rotazione",
          download_image: "Scarica Immagine",
          fids_instruction: "Valori accettati: da 1 al valore massimo indicato da [max]. Possibile indicare anche range di valori es. 4-6",
          fids_example: "Es. 1,4-6 verranno stampati gli id 1,4,5,6",
          help: "I layers mostrati nella stampa potrebbero essere quelli definiti sul progetto e non quelli visualizzati sulla mappa"
        },
        querybuilder: {
          search: {
            run: "Lancia ricerca",
            info: "Informazioni",
            delete: "Cancella",
            edit: "Modifica"
          },
          messages: {
            changed: 'Salvato correttamente',
            number_of_features: "Numero di features"
          },
          panel: {
            button: {
              all: 'TUTTI',
              save: 'SALVA',
              test: 'TEST',
              clear: 'PULISCI',
              run: 'ESEGUI',
              manual: 'MANUALE'
            },
            layers: 'LAYERS',
            fields: 'CAMPI',
            values: 'VALORI',
            operators: 'OPERATORI',
            expression: 'ESPRESSIONE'
          },
          error_run: 'Si è verificato un errore. Verificare se la query è corretta',
          error_test: "Errore nell'esecuzione della query",
          delete: 'Vuoi confermare la cancellazione?',
          additem: 'Inserisci nome della ricerca'
        },
        errors: {
          layers: {
            load: "Alcuni layers presenti nel progetto non sono attualmente disponibili e quindi non compaiono nell'attuale visualizzazione"
          },
          unsupported_format: 'Formato non supportato',
          add_external_layer: 'Errore nel caricamento del layer'
        },
        metadata: {
          title: "Metadati",
          groups: {
            general: {
              title: 'GENERALE',
              fields: {
                title: 'TITOLO',
                name: 'NOME',
                description: "DESCRIZIONE",
                abstract: "ABSTRACT",
                keywords: 'LISTA DELLE PAROLE CHIAVE',
                fees: "CANONI",
                accessconstraints: "VINCOLI DI ACCESSO",
                contactinformation: "CONTATTI",
                subfields: {
                  contactinformation: {
                    contactelectronicmailaddress: "E-mail",
                    personprimary: 'Riferimenti',
                    contactvoicetelephone: 'Telefono',
                    contactorganization: 'Organizzazione',
                    ContactOrganization: 'Organizzazione',
                    contactposition: 'Posizione',
                    ContactPosition : 'Posizione',
                    contactperson: 'Persona',
                    ContactPerson: 'Persona',
                  }
                },
                wms_url: "WMS"
              }
            },
            spatial:{
              title: 'INFO SPAZIALI',
              fields : {
                crs: 'EPSG',
                extent: 'BBOX'
              }
            },
            layers: {
              title: 'STRATI',
              groups : {
                general: 'GENERALE',
                spatial: 'INFO SPAZIALI'
              },
              fields: {
                layers: 'STRATI',
                subfields: {
                  crs: 'EPSG',
                  bbox: 'BBOX',
                  title: "TITOLO",
                  name: 'NOME',
                  geometrytype: 'GEOMETRIA',
                  source: 'SORGENTE',
                  attributes: 'ATTRIBUTI',
                  abstract: 'ABSTRACT',
                  attribution: 'ATTRIBUTION',
                  keywords: "PAROLE CHIAVE",
                  metadataurl:'METADATA URL',
                  dataurl: "DATA URL"
                }
              }
            }
          }
        },
        tooltips: {
          relations: {
            form_to_row: "Visualizza formato Riga",
            row_to_form: "Visualizza formato Form"
          },
          zoom_to_features_extent: "Zoom sulle features",
          copy_map_extent_url: 'Copia map view link',
          download_shapefile: "Scarica Shapefile",
          download_gpx: "Scarica GPX",
          download_gpkg: "Scarica GPKG",
          download_csv: "Scarica CSV",
          download_xls: "Scarica XLS",
          show_chart: "Mostra Grafico",
          atlas: "Stampa Atlas"
        },
        mapcontrols: {
          query: {
            tooltip: 'Interroga Layer',
            actions: {
              add_selection: {
                hint: "Aggiungi/Rimuovi Selezione"
              },
              zoom_to_features_extent:{
                hint: "Zoom sulle features"
              },
              add_features_to_results: {
                hint: "Aggiungi features ai risultati"
              },
              remove_feature_from_results: {
                hint: "Rimuovi feature dai risultati"
              },
              zoom_to_feature: {
                hint: "Zoom sulla feature"
              },
              relations: {
                hint: "Visualizza Relazioni"
              },
              relations_charts: {
                hint: "Visualizza grafici relazioni"
              },
              download_features_shapefile:{
                hint: 'Scarica features in Shapefile'
              },
              download_shapefile: {
                hint: 'Scarica feature in Shapefile'
              },
              download_features_gpx: {
                hint: "Scarica features in GPX"
              },
              download_features_gpkg: {
                hint: "Scarica features in GPKG"
              },
              download_gpx: {
                hint: "Scarica feature in GPX"
              },
              download_gpkg: {
                hint: "Scarica feature in GPKG"
              },
              download_features_csv: {
                hint: "Scarica features in CSV"
              },
              download_csv: {
                hint: "Scarica feature in CSV"
              },
              download_features_xls: {
                hint: "Scarica features in XLS"
              },
              download_xls: {
                hint: "Scarica la feature in XLS"
              },
              atlas: {
                hint: "Stampa Atlas"
              },
              copy_zoom_to_fid_url: {
                hint: "Copia URL mappa con estensione a questa geometria",
                hint_change: "Copiato"
              }
            }
          },
          querybypolygon: {
            download: {
              title: "Download attributi",
              choiches:{
               feature: {
                 label: "Solo features",
               },
               feature_polygon: {
                 label: "Features+Poligono Interrogazione",
               }
              }
            },
            tooltip: 'Interroga per poligono',
            no_geometry: 'Non contiene la geometria nella risposta',
            help: {
              title: 'Guida - Interrogazione con Poligono',
              message:`
                  <ul>
                    <li">Seleziona uno strato poligonale in legenda.</li>
                    <li>Assicurati che lo strato sia visibile in mappa.</li>
                    <li>Clicca su una geometria dello strato selezionato.</li>
                  </ul>`
            }
          },
          querybybbox: {
            tooltip: 'Interroga per BBOX',
            nolayers_visible: "Nessun layer interrogabile è visibile. Assicurarsi che almeno un layer wfs sia visibile per eseguire l'interrogazione",
            help: {
              title:'Guida - Interrogazione BBox',
              message:`
                    <ul>
                      <li>Disegna un rettangolo per interrogare gli strati evidenziati in giallo</li>
                   </ul>
              `
            },
          },
          addlayer: {
            messages: {
              csv: {
                warning: "Il risultato in mappa è parziale a causa della presenza dei seguenti records non corretti:"
              }
            },
            tooltip: 'Aggiungi Layer'
          },
          geolocation: {
            tooltip: 'Geolocalizzazione'
          },
          measures: {
            length: {
              tooltip: "Lunghezza",
              help: "Clicca sulla mappa per continuare a disegnare la linea.<br>CANC se si vuole cancellare l'ultimo vertice inserito",
            },
            area: {
              tooltip: "Area",
              help: "Clicca per continuare a disegnare il poligono.<br>CANC se si vuole cancellare l'ultimo vertice inserito"
            }
          },
          scale: {
            no_valid_scale: "Scala non valida"
          },
          scaleline: {
            units: {
              metric: 'Metri',
              nautical: 'Miglio Nautico'
            }
          }
        },
        relations: {
          relation_data: 'Dati Relazione',
          no_relations_found: 'Nessuna relazione trovata',
          back_to_relations: 'Ritorna alle relazioni',
          list_of_relations_feature: 'Lista delle relazioni della feature',
          error_missing_father_field: "Il campo relazionato non esiste"
        },
        workflow: {
          steps: {
            title: 'Passi',
          },
          next: 'Avanti'
        },
        form: {
          loading: 'Caricamento ...',
          inputs: {
            messages: {
              errors: {
                picklayer: "Nessuna feature selezionata. Verificare se il layer è in editing o non visibile alla scala attuale"
              }
            },
            tooltips: {
              picklayer: "Prendi valore dalla mappa",
              lonlat: "Clicca sulla mappa per prendere le coordinate"
            },
            input_validation_mutually_exclusive: "Campo mutualmente esclusivo con ",
            input_validation_error: "Campo obbligatorio o tipo valore non corretto",
            input_validation_min_field: "Valore deve essere magiore uguale a quello del camp ",
            input_validation_max_field: "Valore deve essere minore uguale a quello del campo ",
            input_validation_exclude_values: "Campo deve contenere un valore diverso",
            integer: "intero",
            bigint: "intero",
            text: "testuale",
            varchar: "testuale",
            textarea: "testuale",
            string: "stringa",
            date: "data",
            float: "float",
            table: "table"
          },
          footer: {
            required_fields: "Campi richiesti"
          },
          messages: {
            qgis_input_widget_relation: "Gestisci le relazioni tramite form dedicato"
          }
        },
        catalog: {
          current_map_theme_prefix: "TEMA",
          choose_map_theme: "SCEGLI TEMA",
          menu: {
            layerposition: 'Posizione Layer',
            setwmsopacity: "Cambia opacità",
            wms: {
              title:"",
              copy: "Clicca qui per copiare url",
              copied: "Copiato"
            },
            download: {
              shp: 'Scarica Shapefile',
              gpx: 'Scarica GPX',
              gpkg: 'Scarica GPKG',
              csv: 'Scarica CSV',
              xls: 'Scarica XLS',
              geotiff: "Scarica GEOTIFF",
              geotiff_map_extent: "Scarica GEOTIFF(estensione vista corrente)"
            }
          }
        },
        wps: {
          list_process: "Lista dei processi",
          tooltip: 'Clicca sulla mappa'
        }
      },
      credits: {
        g3wSuiteFramework: "Applicativo realizzato con il framework OS",
        g3wSuiteDescription: "Pubblica e gestisci i tuoi progetti QGIS sul Web",
        productOf: "Framework sviluppato da",
      },
      toggle_color_scheme: "Cambia colore",
      logout: "Esci",
      no_other_projects: "Non ci sono altri progetti in questo gruppo cartografico",
      yes: "Si",
      no: "No",
      back:"Indietro",
      backto: "Torna a ",
      changemap: "Cambia Mappa",
      component: "Componente Generico",
      search: "Ricerche",
      no_results: "Nessun risultato trovato",
      print: "Stampa",
      create_print: "Crea Stampa",
      dosearch: "Cerca",
      catalog: "Mappa",
      data: "Dati",
      externalwms: "WMS",
      baselayers: "Basi",
      tools: "Strumenti",
      tree: "Strati",
      legend: "Legenda",
      nobaselayer: "Nessuna mappa di base",
      street_search: "Cerca indirizzo",
      show: "Mostra",
      hide: "Nascondi",
      copy_form_data: "Copia i dati del modulo",
      paste_form_data: "Incolla",
      copy_form_data_from_feature: "Copia i dati dalla mappa",
      error_map_loading: "Errore di caricamento della nuova mappa",
      check_internet_connection_or_server_admin: "Controllare la connessione internet o contattare l'amministratore",
      could_not_load_vector_layers: "Errore di connessione al server: non è stato possibile caricare i vettoriali richiesti",
      server_saver_error: "Errore nel salvataggio sul server",
      server_error: "Si è verificato un errore nella richiesta al server",
      save: "Salva",
      cancel: "Cancella",
      close: "Chiudi",
      enlange_reduce:"Allarga/Riduci",
      reset_default:"Dimensione Partenza",
      add: "Aggiungi",
      exitnosave: "Esci senza salvare",
      annul: "Annulla",
      layer_is_added: "Layer con stesso nome già aggiunto",
      sidebar: {
        wms: {
          panel: {
            title:'Aggiungi WMS Layer',
            label: {
              position: "Posizione su Mappa",
              name: "Nome",
              projections: 'Sistema di riferimento',
              layers: 'Layers'
            }
          },
          add_wms_layer: "Aggiungi WMS layer",
          delete_wms_url: "Elimina WMS url",
          layer_id_already_added: "WMS Layer già aggiunto",
          url_already_added: "WMS URL già aggiunto",
          layer_add_error: "WMS Layer non aggiunto. Verificare i parametri o l'url"
        }
      },
      info: {
        title: "Risultati",
        open_link: "Apri documento allegato",
        server_error: "Si è verificato un errore nella richiesta al server",
        no_results: "Nessun risultato per questa interrogazione/ricerca ",
        link_button: "Apri"
      },
      mapcontrols: {
        geolocations: {
          title: "",
          error: "Non è possibile calcolare la tua posizione."
        },
        nominatim: {
          placeholder: "Indirizzo ...",
          noresults: "Nessun risultato",
          notresponseserver: "Il server non risponde"
        },
        add_layer_control: {
          header: "Aggiungi Layer",
          select_projection: "Seleziona il sistema di proiezione del layer",
          select_field_to_show: "Seleziona il campo da visualizzare sulla mappa",
          select_csv_separator: "Seleziona il separatore",
          select_csv_x_field: "Seleziona il campo X",
          select_csv_y_field: "Seleziona il campo Y",
          select_color: "Seleziona il colore del Layer",
          drag_layer: "Trascina il layer in questa area"
        },
        query: {
          input_relation: "Clicca per consultare le relazioni"
        },
        length: {
          tooltip: "Lunghezza"
        },
        area: {
          tooltip: "Area"
        },
        screenshot: {
          error: "Errore nella creazione dello screenshot"
        }
      },
      catalog_items: {
        helptext: "Tasto destro sui singoli layer per accedere alle funzionalità aggiuntive",
        contextmenu: {
          zoomtolayer: "Zoom to Layer",
          open_attribute_table: "Apri la tabella degli attibuti",
          show_metadata: "Metadati",
          styles: "Stili",
          vector_color_menu:"Setta/Cambia Colore"
        }
      },
      dataTable: {
        previous: "Precedente",
        next: "Successivo",
        lengthMenu: "Visualizza _MENU_",
        info: "Visualizzazione _START_ a _END_ su _TOTAL_ righe",
        nodatafilterd: "Nessun risultato trovato",
        infoFiltered: "(Filtrati da _MAX_ total righe)"
      }
    },
  },
  en: {
    translation: {
      cookie_law: {
        message: "This website uses cookies to ensure you get the best experience on our website.",
        buttonText: "Got It!"
      },
      default:"default",
      sign_in: "Sign in",
      layer_selection_filter: {
        tools: {
          filter: "Add/Remove Filter",
          nofilter: "Remove Filter",
          invert: "Invert Selection",
          clear: "Clear Selection",
          show_features_on_map: "Show features visible on map"
        }
      },
      warning: {
        not_supported_format: "Not supported format"
      },
      layer_position: {
        top: 'TOP',
        bottom: 'BOTTOM',
        message: "Position relative to layers on TOC"
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
          }
        },
        print: {
          no_layers: 'No Layer to print',
          scale: "Scale",
          format: "Format",
          rotation: "Rotation",
          download_image: "Download Image",
          fids_instruction: "Values accepted: from 1 to value of [max]. Is possible to insert a range ex. 4-6",
          fids_example: "Ex. 1,4-6 will be printed id 1,4,5,6",
          help: "The layers shown in the print could be those defined on the project and not those displayed on the map"
        },
        querybuilder: {
          search: {
            run: "Run",
            info: "Information",
            delete: "Delete",
            edit: "Edit"
          },
          messages: {
            changed: 'Saved',
            number_of_features: "Number of features"
          },
          panel: {
            button: {
              all: 'ALL',
              save: 'SAVE',
              test: 'TEST',
              clear: 'CLEAR',
              run: 'RUN',
              manual: 'MANUAL'
            },
            layers: 'LAYERS',
            fields: 'FIELDS',
            values: 'VALUES',
            operators: 'OPERATORS',
            expression: 'EXPRESSION'
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
          title: 'Metadata',
          groups: {
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
                    personprimary: 'Refereces',
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
            }
          }
        },
        tooltips: {
          relations: {
            form_to_row: "Row View",
            row_to_form: "Form View"
          },
          copy_map_extent_url: 'Copy map view link',
          download_shapefile: "Download Shapefile",
          download_gpx: "Download GPX",
          download_gpkg: "Download GPKG",
          download_csv: "Download CSV",
          download_xls: "Download XLS",
          show_chart: "Show Chart",
          atlas: "Print Atlas"
        },
        mapcontrols: {
          query: {
            tooltip: 'Query layer',
            actions: {
              add_selection: {
                hint: "Add/Remove Selection"
              },
              zoom_to_features_extent:{
                hint: "Zoom to features extent"
              },
              add_features_to_results: {
                hint: "Add/Remove features to results"
              },
              remove_feature_from_results: {
                hint: "Remove feature from results"
              },
              zoom_to_feature: {
                hint: "Zoom to feature"
              },
              relations: {
                hint: "Show Relations"
              },
              relations_charts: {
                hint: "Show relations chart"
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
              atlas: {
                hint: "Print Atlas"
              },
              copy_zoom_to_fid_url: {
                hint: "Copy map URL with this geometry feature extension",
                hint_change: "Copied"
              }
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
              title:'Guide - Query By Polygon',
              message: `
                  <ul>
                    <li>Select a polygon layer on TOC.</li>
                    <li>Be sure that layer is visible.</li>
                    <li>Click on a feature of selected layer.</li>
                  </ul>`
            }
          },
          querybybbox: {
            tooltip: 'Query BBox layer',
            nolayers_visible: 'No querable layers are visible. Please set at least one visible wfs layer to run query',
            help: {
              title: 'Guide - Query BBox layer',
              message:`
                   <ul>
                    <li>Draw a square on map to query underlined layers on TOC</li>
                   </ul>`
            }
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
            tooltip: 'Geolocation'
          },
          measures: {
            length: {
              tooltip: "Length",
              help: "Click on map to draw the line. Press <br>CANC if you want delete last vertex",
            },
            area: {
              tooltip: "Area",
              help: "Click to draw poligon.Press <br>CANC if you want delete last vertex"
            }
          },
          scale: {
            no_valid_scale: "Invalid Scale"
          },
          scaleline: {
            units: {
              metric: 'Meters',
              nautical: 'Nautical Mile'
            }
          }
        },
        relations: {
          relation_data: 'Relation data',
          no_relations_found: 'No relations found',
          back_to_relations: 'Back to relations',
          list_of_relations_feature: 'List of relations of feature',
          error_missing_father_field: "Field is missing"
        },
        workflow: {
          steps: {
            title: 'Steps',
          },
          next: 'Next'
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
          current_map_theme_prefix: "THEME",
          choose_map_theme: "CHOOSE THEME",
          menu: {
            layerposition: 'Layer Position',
            setwmsopacity: "Set Opacity",
            wms: {
              title:"",
              copy: "Click here to copy url",
              copied: "Copied"
            },
            download: {
              shp: 'Download Shapefile',
              gpx: 'Download GPX',
              gpkg: 'Download GPKG',
              csv: 'Download CSV',
              xls: 'Download XLS',
              geotiff: "Download GEOTIFF",
              geotiff_map_extent: "Download GEOTIFF(current view extent)"
            }
          }
        },
        wps: {
          list_process: "List of process",
          tooltip: 'Click on map'
        }
      },
      credits: {
        g3wSuiteFramework: "Application based on OS framework",
        g3wSuiteDescription: "Publish and manage your QGIS projects on the web",
        productOf: "Framework developed by",
      },
      toggle_color_scheme: "Toggle color scheme",
      logout: "Logout",
      no_other_projects: "No more project for this group",
      yes: "Yes",
      no: "No",
      back: "Back",
      backto: "Back to ",
      changemap: "Change Map",
      component: "Generic Component",
      search: "Search",
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
      check_internet_connection_or_server_admin: "Check internet connection or contact admin",
      could_not_load_vector_layers: "Connection error: Layers can be loaded",
      server_saver_error: "Error in server saving",
      server_error: "Server connection error",
      save: "Save",
      cancel: "Cancel",
      close: "Close",
      enlange_reduce:"Enlarge/Reduce",
      reset_default:"Default size",
      add: "Add",
      exitnosave: "Exit without save",
      annul: "Cancel",
      layer_is_added: "Layer with same name already added",
      sidebar: {
        wms: {
          panel: {
            title:'Add WMS Layer',
            label: {
              position: "Map Position",
              name: "Name",
              projections: 'Projection',
              layers: 'Layers'
            }
          },
          add_wms_layer: "Add WMS layer",
          delete_wms_url: "Delete WMS url",
          layer_id_already_added: "WMS Layer already added",
          url_already_added: "WMS URL already added",
          layer_add_error: "WMS Layer not added. Please check all wms parameter or url"
        }
      },
      info: {
        title: "Results",
        open_link: "Open attached document",
        server_error: "An error occurred from server",
        no_results: "No results found for this query/search",
        link_button: "Open"
      },
      mapcontrols: {
        geolocations: {
          error: "Can't get your position"
        },
        nominatim: {
          placeholder: "Address ...",
          noresults: "No results",
          notresponseserver: "No response from server"
        },
        add_layer_control: {
          header: "Add Layer",
          select_projection: "Select layer projection",
          select_field_to_show: "Select Field to show on map",
          select_csv_separator: "Select delimiter",
          select_csv_x_field: "Select X field",
          select_csv_y_field: "Select Y field",
          select_color: "Select Layer Color",
          drag_layer: "Drag and drop layer here"
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
          error: "Screenshot error creation"
        }
      },
      catalog_items: {
        helptext: "Right-click on individual layer to access additional features",
        contextmenu: {
          zoomtolayer: "Zoom to Layer",
          open_attribute_table: "Open Attribute Table",
          show_metadata: "Metadata",
          styles: 'Styles',
          vector_color_menu:"Set/Change Color"
        }
      },
      dataTable: {
        previous: "Previous",
        next: "Next",
        lengthMenu: "Show _MENU_",
        info: "Showing _START_ to _END_ of _TOTAL_ entries",
        no_data: "No data",
        nodatafilterd: "No matching records found",
        infoFiltered: "(filtered from _MAX_ total records)"
      }
    },
  },
  fi: {
    translation: {
      cookie_law: {
        message: "This website uses cookies to ensure you get the best experience on our website.",
        buttonText: "Got It!"
      },
      default:"oletuksena",
      sign_in:"Kirjaudu sisään",
      layer_selection_filter: {
        tools: {
          filter: "Lisätä/Poista Suodattaa",
          nofilter: "Poista Suodattaa",
          invert: "Käänteinen Valinta",
          clear: "Peruuttaa Valinta",
          show_features_on_map: "Näytä kartalla näkyvät ominaisuudet"
        }
      },
      warning: {
        not_supported_format: "Not supported format"
      },
      layer_position: {
        top: 'TOP',
        bottom: 'BOTTOM',
        message: "Position relative to layers on TOC"
      },
      sdk: {
        search: {
          all: 'KAIKKI',
          no_results: "Ei tuloksia",
          searching: "Haetaan ...",
          error_loading: "Virhe ladattaessa tietoja.",
          layer_not_searchable: "Taso ei ole haettavissa.",
          layer_not_querable: "Tasolle ei voi suorittaa kyselyitä.",
          autocomplete: {
            inputshort: {
              pre: "Syötä",
              post: "tai useampi merkki"
            }
          }
        },
        print: {
          no_layers: 'Ei tulostettavia tasoja',
          scale: "Mittakaava",
          format: "Formaatti",
          rotation: "Kierto",
          download_image: "Lataa kuva",
          fids_instruction: "Hyväksytyt arvot: yhdestä arvoon [max]. Salittua syöttää myös väli, esim. 4-6.",
          fids_example: "Esimerkiksi 1,4-6 tulostuu id 1,4,5,6.",
          help: "Tulosteessa esiintyvät tasot voivat olla projektissa määriteltyjä ei kartalla esiintyviä."
        },
        querybuilder: {
          search: {
            run: "Suorita",
            info: "Informaatio",
            delete: "Poista",
            edit: "Muokkaa"
          },
          messages: {
            changed: 'Tallennettu',
            number_of_features: "Ominaisuuksien lukumäärä"
          },
          panel: {
            button: {
              all: 'KAIKKI',
              save: 'TALLENNA',
              test: 'TESTI',
              clear: 'TYHJENNÄ',
              run: 'SUORITA',
              manual: 'MANUAALINEN'
            },
            layers: 'TASOT',
            fields: 'KENTÄT',
            values: 'ARVOT',
            operators: 'OPERAATTORIT',
            expression: 'LAUSEKE'
          },
          error_run: 'Tapahtui virhe. Tarkista kysely.',
          error_test: "Kyselyä suorittaessa tapahtui virhe.",
          delete: 'Haluatko poistaa sen?',
          additem: 'Anna nimi uudelle haulle.'
        },
        errors: {
          layers: {
            load: "Jotkin tasot eivät ole saatavilla."
          },
          unsupported_format: 'Ei tuettu formaatti',
          add_external_layer: 'Tason latausvirhe'
        },
        metadata: {
          title: 'Metatiedot',
          groups: {
            general: {
              title: 'YLEINEN',
              fields: {
                title: 'OTSIKKO',
                name: 'NIMI',
                description: "KUVAUS",
                abstract: "TIIVISTELMÄ",
                keywords: 'AVAINSANAT',
                fees: "MAKSUT",
                accessconstraints: "PÄÄSYRAJOITUKSET",
                contactinformation: "YHTEYSTIEDOT",
                subfields: {
                  contactinformation: {
                    contactelectronicmailaddress: "Sähköposti",
                    personprimary: 'Viitteet',
                    contactvoicetelephone: 'Puhelin',
                    contactorganization: 'Organisaatio',
                    ContactOrganization: 'Organisaatio',
                    contactposition: 'Asema',
                    ContactPosition: 'Asema',
                    contactperson: 'Yhteyshenkilö',
                    ContactPerson: 'Yhteyshenkilö'
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
              title: 'TASOT',
              fields: {
                layers: 'TASOT',
                subfields: {
                  crs: 'EPSG',
                  bbox: 'BBOX',
                  title: "OTSIKKO",
                  name: 'NIMI',
                  geometrytype: 'GEOMETRIA',
                  source: 'LÄHDE',
                  attributes: 'ATTRIBUUTIT',
                  abstract: 'TIIVISTELMÄ',
                  attribution: 'ATTRIBUUTIO',
                  keywords: "AVAINSANAT",
                  metadataurl:'METATIEDON URL',
                  dataurl: "DATA URL"
                }
              },
              groups : {
                general: 'YLEINEN',
                spatial: 'SPATIAL'
              }
            }
          }
        },
        tooltips: {
          relations: {
            form_to_row: "Rivinäkymä",
            row_to_form: "Taulukkonäkymä"
          },
          copy_map_extent_url: 'Kopioi kartan katselulinkki',
          download_shapefile: "Lataa SHP-tiedosto",
          download_gpx: "Lataa GPX-tiedosto",
          download_gpkg: "Lataa GPKG-tiedosto",
          download_csv: "Lataa CSV-tiedosto",
          download_xls: "Lataa XLS-tiedosto",
          show_chart: "Näytä kaavio",
          atlas: "Tulosta Atlas"
        },
        mapcontrols: {
          query: {
            tooltip: 'Kyselytaso',
            actions: {
              add_selection: {
                hint: 'Lisää/Poista valinta'
              },
              zoom_to_features_extent:{
                hint: "Tarkenna ominaisuuden laajuuteen"
              },
              add_features_to_results: {
                hint: "Add/Remove features to results"
              },
              remove_feature_from_results: {
                hint: "Remove feature from results"
              },
              zoom_to_feature: {
                hint: "Tarkenna ominaisuuteen"
              },
              relations: {
                hint: "Näytä relaatiot"
              },
              relations_charts: {
                hint: "Näytä relaatiokaavio"
              },			  
              download_features_shapefile:{
                hint: 'Lataa ominaisuuden SHP-tiedosto'
              },
              download_shapefile: {
                hint: 'Lataa ominaisuuden SHP-tiedosto'
              },
              download_features_gpx: {
                hint: "Lataa ominaisuuden GPX-tiedosto"
              },
              download_features_gpkg: {
                hint: "Lataa ominaisuuden GPKG-tiedosto"
              },
              download_gpx: {
                hint: "Lataa ominaisuuden GPX-tiedosto"
              },
              download_gpkg: {
                hint: "Lataa ominaisuuden GPKG-tiedosto"
              },
              download_features_csv: {
                hint: "Lataa ominaisuuden CSV-tiedosto"
              },
              download_csv: {
                hint: "Lataa ominaisuuden CSV-tiedosto"
              },
              download_features_xls: {
                hint: "Lataa ominaisuuden XLS-tiedosto"
              },
              download_xls: {
                hint: "Lataa ominaisuuden XLS-tiedosto"
              },
              atlas: {
                hint: "Tulosta Atlas"
              },
              copy_zoom_to_fid_url: {
                hint: "Copy map URL with this geometry feature extension",
                hint_change: "Copied"
              }
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
            tooltip: 'Kysely monikulmiolla',
            no_geometry: 'No geometry on response',
            help: {
              title: 'Ohje - Kysely monikulmiolla',
              message: `
                  <ul>
                    <li>Valitse monikulmiotaso luettelosta.</li>
                    <li>Tarkista, että taso on näkyvillä.</li>
                    <li>Valitse ominaisuus valitulla tasolla.</li>
                  </ul>`
            }
          },
          querybybbox: {
            tooltip: 'Tasoon kohdituva BBox-kysely',
            nolayers_visible: 'Ei kyseltäviä tasoja näkyvillä. Aseta vähintään yksi WFS-taso näkyväksi suorittaaksesi haun.',
            help: {
              title: 'Ohje - Tasoon kohdistuva BBox-kysely',
              message:`
                   <ul>
                    <li>Piirrä suorakulmio kartalle suorittaaksesi kyselyn luettelossa alleviivatuille tasoille.</li>
                   </ul>`
            }
          },
          addlayer: {
            messages: {
              csv: {
                warning: "The result in the map is partial due to the presence of the below incorrect records list:"
              }
            },
            tooltip: 'Lisää taso'
          },
          geolocation: {
            tooltip: 'Maantieteellinen sijainti'
          },
          measures: {
            length: {
              tooltip: "Pituus",
              help: "Piirrä murtoviiva kartalle. Paina <br>CANC, mikäli haluat poistaa edellisen pisteen.",
            },
            area: {
              tooltip: "Alue",
              help: "Piirrä monikulmio kartalle. Paina <br>CANC, mikäli haluat poistaa edellisen pisteen."
            }
          },
          scale: {
            no_valid_scale: "Väärä mittakaava"
          },
          scaleline: {
            units: {
              metric: 'Meters',
              nautical: 'Nautical Mile'
            }
          }
        },
        relations: {
          relation_data: 'Relaation tiedot',
          no_relations_found: 'Relaatiota ei löytynyt.',
          back_to_relations: 'Takaisin relaatioihin',
          list_of_relations_feature: 'Lista ominaisuuden relaatioista',
          error_missing_father_field: "Kenttä puuttu"
        },
        workflow: {
          steps: {
            title: 'Vaiheet'
          },
          next: "Seuraava",
        },
        form: {
          loading: 'Ladataan...',
          inputs: {
            messages: {
              errors: {
                picklayer: "Ominaisuuksia ei valiitu. Tarkista, että taso on muokattavissa tai näkyvissä nykyisellä mittakaavalla."
              }
            },
            tooltips:{
              picklayer: "Valitse arvo karttatasolta",
              lonlat: "Click on map to get coordinates"
            },
            input_validation_mutually_exclusive: "Kenttä toisensa poissulkeva.",
            input_validation_error: "Pakollinen kenttä tai väärä tietotyyppi.",
            input_validation_min_field: "Arvon tulee olla suurempi tai yhtäsuuri kuin kentän arvo.",
            input_validation_max_field: "Arvon tulee olla pienempi tai yhtäsuuri kuin kentän arvo.",
            input_validation_exclude_values: "Arvon tulee olla uniikki.",
            integer: "kokonaisluku",
            bigint: "kokonaisluku",
            text: "teksti",
            varchar: "teksti",
            textarea: "teksti",
            string: "merkkijono",
            date: "päiväys",
            float: "liukuluku",
            table: "taulukko"
          },
          footer: {
            "required_fields": "Vaaditut kentät"
          },
          messages: {
            qgis_input_widget_relation: "Käytä relaatioiden määrittämiseen tähän tarkoitettua toimintoa"
          }
        },
        catalog: {
          current_map_theme_prefix: "THEME",
          choose_map_theme: "CHOOSE THEME",
          menu: {
            layerposition: 'Layer Position',
            setwmsopacity: "Set Opacity",
            wms: {
              title:"",
              copy: "Paina tästä kopioidaksesi url:n.",
              copied: "Kopioitu."
            },
            download: {
              shp: 'Lataa SHP-tiedosto',
              gpx: 'Lataa GPX-tiedosto',
              gpkg: 'Lataa GPKG-tiedosto',
              csv: 'Lataa CSV-tiedosto',
              xls: 'Lataa XLS-tiedosto',
              geotiff: 'Lataa GEOTIFF-tiedosto',
              geotiff_map_extent: "Lataa GEOTIFF-tiedosto(current view extent)"
            }
          }
        },
        wps: {
          list_process: "Lista prosesseista",
          tooltip: 'Valitse kartalta'
        }
      },
      credits: {
        g3wSuiteFramework: "Sovellus perustuu OS framework",
        g3wSuiteDescription: "Julkaise ja hallinnoi QGIS-projekteja verkossa.",
        productOf: "Frameworkin on kehittänyt",
      },
      toggle_color_scheme: "Toggle color scheme",
      logout: "Kirjaudu ulos",
      no_other_projects: "Ei projekteja tälle ryhmälle",
      yes: "Kyllä",
      no: "Ei",
      back: "Palaa",
      backto: "Takaisin ",
      changemap: "Vaihda karttaa",
      component: "Yleinen komponentti",
      search: "Hae",
      no_results: "Ei hakutuloksia",
      print: "Tulosta",
      create_print: "Luo tuloste",
      dosearch: "Hae",
      catalog: "Kartta",
      data: "Data",
      externalwms: "WMS",
      baselayers: "Taustakartta",
      tools: "Työkalut",
      tree: "Tasot",
      legend: "Merkintöjen selite",
      nobaselayer: "Ei taustakarttaa",
      street_search: "Hae osoite",
      show: "Näytä",
      hide: "Piilota",
      copy_form_data: "Kopioi tiedot",
      paste_form_data: "Liitä",
      copy_form_data_from_feature: "Kopioi tiedot kartalta",
      error_map_loading: "Virhe ladattessa karttaa",
      check_internet_connection_or_server_admin: "Tarkista internetyhteys tai ota yhteyttä ylläpitäjään.",
      could_not_load_vector_layers: "Yhteysvirhe, tasoja ei voida ladata.",
      server_saver_error: "Virhe tallentaessa palvelimelle.",
      server_error: "Yhteysvirhe palvelimeen",
      save: "Tallenna",
      cancel: "Peruuta",
      close: "Sulje",
      enlange_reduce:"Enlarge/Reduce",
      reset_default:"Default size",
      add: "Lisää",
      exitnosave: "Poistu tallentamatta",
      annul: "Peruuta",
      layer_is_added: "Samanniminen taso on jo lisätty.",
      sidebar: {
        wms: {
          panel: {
            title:'Add WMS Layer',
            label: {
              position: "Map Position",
              name: "Name",
              projections: 'Projection',
              layers: 'Layers'
            }
          },
          add_wms_layer: "Aggiungi WMS layer",
          delete_wms_url: "Delete WMS url",
          layer_id_already_added: "WMS Taso on jo lisätty.",
          url_already_added: "WMS URL  on jo lisätty.",
          layer_add_error: "WMS Layer not added. Please check all wms parameter or url"
        }
      },
      info: {
        title: "Tulokset",
        open_link: "Avaa liitetiedosto",
        server_error: "Palvelimella tapahtui virhe.",
        no_results: "Ei tuloksia haulle/kyselylle.",
        link_button: "Avaa"
      },
      mapcontrols: {
        geolocations: {
          error: "Sijaintiasi ei saada"
        },
        nominatim: {
          placeholder: "Osoite ...",
          noresults: "Ei tuloksia",
          notresponseserver: "Ei vastausta palvelimelta"
        },
        add_layer_control: {
          header: "Lisää taso",
          select_projection: "Valitse tason projektio",
          select_field_to_show : "Select Field to show on map",
          select_csv_separator: "Select delimiter",
          select_csv_x_field: "Select X field",
          select_csv_y_field: "Select Y field",
          select_color: "Valitse tason väri",
          drag_layer: "Vedä ja pudota taso tähän"
        },
        query: {
          input_relation: "Paina näyttääksesi relaatiot"
        },
        length: {
          tooltip: "Pituus"
        },
        area: {
          tooltip: "Pinta-ala"
        },
        screenshot: {
          error: "Screenshot error creation"
        }
      },
      catalog_items: {
        helptext: "Napsauta hiiren kakkospainikkeella yksittäistä tasoa päästäksesi lisäominaisuuksiin.",
        contextmenu: {
          zoomtolayer: "Tarkenna tasoon",
          open_attribute_table: "Avaa attribuuttitaulu",
          show_metadata: "Metatiedot",
          styles: "Tyylejä",
          vector_color_menu: "Aseta/muuta väriä"
        }
      },
      dataTable: {
        previous: "Edellinen",
        next: "Seuraava",
        lengthMenu: "Show _MENU_ items",
        info: "Showing _START_ to _END_ of _TOTAL_ entries",
        no_data: "Ei tietoja",
        nodatafilterd: "Vastaavia tietueita ei löytynyt",
        infoFiltered: "(filtered from _MAX_ total records)"
      }
    },
  },
  se: {
    translation: {
      cookie_law: {
        message: "This website uses cookies to ensure you get the best experience on our website.",
        buttonText: "Got It!"
      },
      default: "standard",
      sign_in:"Logga in",
      layer_selection_filter: {
        tools: {
          filter: "Lägg till/Avlägsna Filtrera",
          nofilter: "Avlägsna Filtrera",
          invert: "Invertera Urval",
          clear: "Annullera Urval",
          show_features_on_map: "Visa funktioner som är synliga på kartan"
        }
      },
      warning: {
        not_supported_format: "Not supported format"
      },
      layer_position: {
        top: 'TOP',
        bottom: 'BOTTOM',
        message: "Position relative to layers on TOC"
      },
      sdk: {
        search: {
          all: 'ALLA',
          no_results: "Inga resultat",
          searching: "Sökning ...",
          error_loading: "Fel vid laddning av uppgifter.",
          layer_not_searchable: "Nivån kan inte sökas.",
          layer_not_querable: "Förfrågningar kan inte göras på nivån.",
          autocomplete: {
            inputshort: {
              pre: "Mata in",
              post: "eller flera tecken"
            }
          }
        },
        print: {
          no_layers: 'Inga nivåer att skriva ut',
          scale: "Skala",
          format: "Format",
          rotation: "Rotation",
          download_image: "Ladda ner bild",
          fids_instruction: "Godkända värden: Från ett till värdet [max]. Mellanslag tillåts, t.ex. 4-6.",
          fids_example: "Exempelvis 1,4-6 skriver ut id 1,4,5,6.",
          help: "Nivåerna på utskriften kan vara specificerade i ett projekt inte sådana som visas på karta."
        },
        querybuilder: {
          search: {
            run: "Utför",
            info: "Information",
            delete: "Ta bort",
            edit: "Redigera"
          },
          messages: {
            changed: 'Sparat',
            number_of_features: "Antal funktione"
          },
          panel: {
            button: {
              all: 'ALLA',
              save: 'SPARA',
              test: 'TEST',
              clear: 'TÖM',
              run: 'UTFÖR',
              manual: 'MANUELL'
            },
            layers: 'NIVÅER',
            fields: 'FÄLT',
            values: 'VÄRDEN',
            operators: 'OPERATÖRER',
            expression: 'KLAUSUL'
          },
          error_run: 'Ett fel inträffade. Kontrollera förfrågan.',
          error_test: "Ett fel inträffade när förfrågan utfördes.",
          delete: 'Vill du ta bort den?',
          additem: 'Ge den nya sökningen ett namn.'
        },
        errors: {
          layers: {
            load: "Vissa nivåer är inte tillgängliga."
          },
          unsupported_format: 'Formatet stöds inte',
          add_external_layer: 'Fel vid laddning av nivån'
        },
        metadata: {
          title: 'Metadata',
          groups: {
            general: {
              title: 'ALLMÄN',
              fields: {
                title: 'RUBRIK',
                name: 'NAMN',
                description: "BESKRIVNING",
                abstract: "SAMMANDRAG",
                keywords: 'NYCKELORD',
                fees: "AVGIFTER",
                accessconstraints: "ÅTKOMSTBEGRÄNSNINGAR",
                contactinformation: "KONTAKTUPPGIFTER",
                subfields: {
                  contactinformation: {
                    contactelectronicmailaddress: "E-post",
                    personprimary: 'Referenser',
                    contactvoicetelephone: 'Telefon',
                    contactorganization: 'Organisation',
                    ContactOrganization: 'Organisation',
                    contactposition: 'Ställning',
                    ContactPosition: 'Ställning',
                    contactperson: 'Kontaktperson',
                    ContactPerson: 'Kontaktperson'
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
              title: 'NIVÅER',
              fields: {
                layers: 'NIVÅER',
                subfields: {
                  crs: 'EPSG',
                  bbox: 'BBOX',
                  title: "RUBRIK",
                  name: 'NAMN',
                  geometrytype: 'GEOMETRI',
                  source: 'KÄLLA',
                  attributes: 'ATTRIBUT',
                  abstract: 'SAMMANDRAG',
                  attribution: 'TILLSKRIVNING',
                  keywords: "NYCKELORD",
                  metadataurl:'METADATA URL',
                  dataurl: "DATA URL"
                }
              },
              groups : {
                general: 'ALLMÄN',
                spatial: 'SPATIAL'
              }
            }
          }
        },
        tooltips: {
          relations: {
            form_to_row: "Radvy",
            row_to_form: "Tabellvy"
          },
          copy_map_extent_url: 'Kopiera länk till karta',
          download_shapefile: "Ladda SHP-fil",
          download_gpx: "Ladda GPX-fil",
          download_gpkg: "Ladda GPKG-fil",
          download_csv: "Ladda CSV-fil",
          download_xls: "Ladda XLS-fil",
          show_chart: "Visa diagram", //Tero 9.12.2020
          atlas: "Skriv ut Atlas"
        },
        mapcontrols: {
          query: {
            tooltip: 'Förfrågningsnivå',
            actions: {
              add_selection: {
                hint: "Lägg till/Avlägsna Urval"
              },
              zoom_to_features_extent:{
                hint: "Zooma till egenskapens omfattning"
              },
              add_features_to_results: {
                hint: "Add/Remove features to results"
              },
              remove_feature_from_results: {
                hint: "Remove feature from results"
              },
              zoom_to_feature: {
                hint: "Zooma till egenskapen"
              },
              relations: {
                hint: "Visa relationerna"
              },
              relations_charts: {
                hint: "Visa relationsdiagrammet" //Tero 9.12.2020
              },			  
              download_features_shapefile:{
                hint: 'Ladda egenskapens SHP-fil'
              },
              download_shapefile: {
                hint: 'Ladda egenskapens SHP-fil'
              },
              download_features_gpx: {
                hint: "Ladda egenskapens GPX-fil"
              },
              download_features_gpkg: {
                hint: "Ladda egenskapens GPKG-fil"
              },
              download_gpx: {
                hint: "Ladda egenskapens GPX-fil"
              },
              download_gpkg: {
                hint: "Ladda egenskapens GPKG-fil"
              },
              download_features_csv: {
                hint: "Ladda egenskapens CSV-fil"
              },
              download_csv: {
                hint: "Ladda egenskapens CSV-fil"
              },
              download_features_xls: {
                hint: "Ladda egenskapens XLS-fil"
              },
              download_xls: {
                hint: "Ladda egenskapens XLS-fil"
              },
              atlas: {
                hint: "Skriv ut Atlas"
              },
              copy_zoom_to_fid_url: {
                hint: "Copy map URL with this geometry feature extension",
                hint_change: "Copied"
              }
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
            tooltip: 'Förfrågan med polygon',
            no_geometry: 'No geometry on response',
            help: {
              title: 'Ohje - Förfrågan med polygon',
              message:`
                  <ul >
                    <li>Välj polygonnivå i listan.</li>
                    <li>Kontrollera att nivån är synlig.</li>
                    <li>Välj egenskap på önskad nivå.</li>
                  </ul>`
            }
          },
          querybybbox: {
            tooltip: 'BBox-förfrågan som riktar sig till en nivå',
            nolayers_visible: 'Inga nivåer som förfrågningar kan riktas till. Gör minst en WFS-nivå synlig för att kunna utföra sökningen.',
            help: {
              title: 'Ohje - BBox-förfrågan som riktar sig till nivån',
              message:`
                   <ul>
                    <li>Rita upp en rektangel på kartan för att utföra förfrågan på de i listan understreckade nivåerna.</li>
                   </ul>`
            }
          },
          addlayer: {
            messages: {
              csv: {
                warning: "The result in the map is partial due to the presence of the below incorrect records list:"
              }
            },
            tooltip: 'Lägg till nivå'
          },
          geolocation: {
            tooltip: 'Geografiskt läge'
          },
          measures: {
            length: {
              tooltip: "Längd",
              help: "Rita upp en bruten linje på kartan. Tryck <br>CANC, om du vill ta bort föregående punkt.",
            },
            area: {
              tooltip: "Område",
              help: "Rita upp en polygon på kartan. Tryck <br>CANC, om du vill ta bort föregående punkt."
            }
          },
          scale: {
            no_valid_scale: "Fel skala"
          },
          scaleline: {
            units: {
              metric: 'Meters',
              nautical: 'Nautical Mile'
            }
          }
        },
        relations: {
          relation_data: 'Relationsuppgifter',
          no_relations_found: 'Inga relationer hittades.',
          back_to_relations: 'Tillbaka till relationerna',
          list_of_relations_feature: 'Lista på egenskapens relationer',
          error_missing_father_field: "Fält saknas"
        },
        workflow: {
          steps: {
            title: 'Skeden'
          },
          next: "Nästa",

        },
        form: {
          loading: 'Laddning...',
          inputs: {
            messages: {
              errors: {
                picklayer: "Inga egenskaper har valts. Kontroller att nivån kan redigeras eller att den syns med nuvarande skala."
              }
            },
            tooltips:{
              picklayer: "Välj värde på kartnivå",
              lonlat: "Click on map to get coordinates"
            },
            input_validation_mutually_exclusive: "Fälten utesluter varandra.",
            input_validation_error: "Obligatoriskt fält eller fel datatyp.",
            input_validation_min_field: "Värdet ska vara större eller lika stort som värdet i fältet.",
            input_validation_max_field: "Värdet ska vara mindre eller lika stort som värdet i fältet.",
            input_validation_exclude_values: "Värdet ska vara unikt.",
            integer: "heltal",
            bigint: "heltal",
            text: "text",
            varchar: "text",
            textarea: "text",
            string: "teckensträng",
            date: "datum",
            float: "flyttal",
            table: "tabell"
          },
          footer: {
            "required_fields": "Obligatoriska fält"
          },
          messages: {
            qgis_input_widget_relation: "Använd den specifika funktinen för att bestämma relationer"
          }
        },
        catalog: {
          current_map_theme_prefix: "THEME",
          choose_map_theme: "CHOOSE THEME",
          menu: {
            layerposition: 'Layer Position',
            setwmsopacity: "Set Opacity",
            wms: {
              title:"",
              copy: "Tryck här för att kopiera url.",
              copied: "Kopierad."
            },
            download: {
              shp: 'Ladda SHP-fil',
              gpx: 'Ladda GPX-fil',
              gpkg: 'Ladda GPKG-fil',
              csv: 'Ladda CSV-fil',
              xls: 'Ladda XLS-fil',
              geotiff: 'Ladda GEOTIFF-fil',
              geotiff_map_extent: "Ladda GEOTIFF-fil(current view extent)"
            }
          }
        },
        wps: {
          list_process: "Lista på processer",
          tooltip: 'Välj på kartan'
        }
      },
      credits: {
        g3wSuiteFramework: "Tillämpningen baserar på OS framework",
        g3wSuiteDescription: "Publicera och hantera QGIS-projekt på nätet.",
        productOf: "Framework har utvecklats av",
      },
      toggle_color_scheme: "Toggle color scheme",
      logout: "Logga ut",
      no_other_projects: "Inga projekt för denna grupp",
      yes: "Ja",
      no: "Nej",
      back: "Gå tillbaka",
      backto: "Tillbaka ",
      changemap: "Byt karta",
      component: "Allmän komponent",
      search: "Sök",
      no_results: "Inga sökresultat",
      print: "Skriv ut",
      create_print: "Skapa utskrift",
      dosearch: "Sök",
      catalog: "Karta",
      data: "Data",
      externalwms: "WMS",
      baselayers: "Bakgrundskarta",
      tools: "Verktyg",
      tree: "Nivåer",
      legend: "Förklaring till beteckningarna",
      nobaselayer: "Ingen bakgrundskarta",
      street_search: "Sök adress",
      show: "Visa",
      hide: "Dölj",
      copy_form_data: "Kopiera uppgifterna",
      paste_form_data: "Infoga",
      copy_form_data_from_feature: "Kopiera uppgifter från kartan",
      error_map_loading: "Fel vid laddning av kartan",
      check_internet_connection_or_server_admin: "Kontrollera internetanslutningen eller kontakta administratören.",
      could_not_load_vector_layers: "Fel i anslutningen, nivåer kan inte laddas.",
      server_saver_error: "Fel vid lagring på servern.",
      server_error: "Fel på anslutningen till servern",
      save: "Spara",
      cancel: "Ånga",
      close: "Stäng",
      enlange_reduce:"Enlarge/Reduce",
      reset_default:"Default size",
      add: "Lägg till",
      exitnosave: "Lämna programmet utan att spara",
      annul: "Ångra",
      layer_is_added: "Lagret med samma namn har redan lagts till.",
      sidebar: {
        wms: {
          panel: {
            title:'Add WMS Layer',
            label: {
              position: "Map Position",
              name: "Name",
              projections: 'Projection',
              layers: 'Layers'
            }
          },
          add_wms_layer: "Aggiungi WMS layer",
          delete_wms_url: "Delete WMS url",
          layer_id_already_added: "WMS Nivån har redan lagts till.",
          url_already_added: "WMS URL har redan lagts till.",
          layer_add_error: "WMS Layer not added. Please check all wms parameter or url"
        }
      },
      info: {
        title: "Resultat",
        open_link: "Öppna filbilaga",
        server_error: "Ett fel uppstod på servern.",
        no_results: "Inga resultat för sökningen/förfrågan.",
        link_button: "Öppna"
      },
      mapcontrols: {
        geolocations: {
          error: "Du kan inte lokaliseras"
        },
        nominatim: {
          placeholder: "Adress ...",
          noresults: "Inga resultat",
          notresponseserver: "Inget svar från servern"
        },
        add_layer_control: {
          header: "Lägg till nivå",
          select_projection: "Välj projektion för nivån",
          select_field_to_show: "Select Field to show on map",
          select_csv_separator: "Select delimiter",
          select_csv_x_field: "Select X field",
          select_csv_y_field: "Select Y field",
          select_color: "Välj färg på nivån",
          drag_layer: "Dra och släpp nivån hit"
        },
        query: {
          input_relation: "Tryck för att visa relationerna"
        },
        length: {
          tooltip: "Längd"
        },
        area: {
          tooltip: "Areal"
        },
        screenshot: {
          error: "Screenshot error creation"
        }
      },
      catalog_items: {
        helptext: "Högerklicka på en enskild nivå för att komma till tilläggsegenskaperna.",
        contextmenu: {
          zoomtolayer: "Zooma till nivå",
          open_attribute_table: "Öppna attributtabellen",
          show_metadata: "Metadata",
          styles: "Stilar",
          vector_color_menu: "Ställ in/ändra färg"
        }
      },
      dataTable: {
        previous: "Föregående",
        next: "Nästa",
        lengthMenu: "Show _MENU_ items",
        info: "Showing _START_ to _END_ of _TOTAL_ entries",
        no_data: "Inga uppgifter",
        nodatafilterd: "Inga motsvarande poster hittades",
        infoFiltered: "(filtered from _MAX_ total records)"
      }
    },
  },
  fr: {
    translation: {
      cookie_law: {
        message: "Ce site utilise des cookies pour assurer une bonne convivialité pour l'utilisateur final.",
        buttonText: "J’ai compris !"
      },
      default:"par défaut ",
      sign_in: "Se connecter ",
      layer_selection_filter: {
        tools: {
          filter: "Ajout/Suppression de filtre ",
          nofilter: "Supprimer le filtre ",
          invert: "Sélection inversée ",
          clear: "Effacer la sélection ",
          show_features_on_map: "Afficher les caractéristiques visibles sur la carte"
        }
      },
      warning: {
        not_supported_format: "Not supported format"
      },
      layer_position: {
        top: 'TOP',
        bottom: 'BOTTOM',
        message: "Position relative to layers on TOC"
      },
      sdk: {
        search: {
          all: 'TOUTES',
          no_results: "Aucune valeur trouvée",
          searching: "Je cherche...",
          error_loading: "Erreur de chargement des valeurs",
          layer_not_searchable: "Le layer n’est pas recherchable",
          layer_not_querable: "Le layer n'est pas interrogeable",
          autocomplete: {
            inputshort: {
              pre: "Tapez au moins",
              post: "caractères"
            }
          }
        },
        print: {
          no_layers: 'Aucune layer visible',
          scale: "Échelle",
          format: "Format",
          rotation: "Rotation",
          download_image: "Télécharger l'image",
          fids_instruction: "Valeurs acceptées : de 1 à la valeur maximale indiquée par [max]. Il est également possible d'indiquer une fourchette de valeurs, par exemple 4-6",
          fids_example: "Par exemple 1,4-6 les ids 1,4,5,6 seront imprimés",
          help: "Les layers montrés dans l'impression peuvent être ceux définis dans le projet et non ceux montrés sur la carte"
        },
        querybuilder: {
          search: {
            run: "Lancer la recherche",
            info: "Information",
            delete: "Supprimer",
            edit: "Editer"
          },
          messages: {
            changed: 'Enregistré correctement',
            number_of_features: "Nombre de fonctionnalités"
          },
          panel: {
            button: {
              all: 'TOUTES',
              save: 'SAUVEGARDER',
              test: 'TESTER',
              clear: 'NETTOYER',
              run: 'EXECUTER',
              manual: 'MANUEL'
            },
            layers: 'LAYERS',
            fields: 'CHAMPS',
            values: 'VALEURS',
            operators: 'OPERATEURS',
            expression: 'EXPRESSION'
          },
          error_run: "Une erreur s'est produite. Vérifiez si la requête est correcte",
          error_test: "Erreur d'exécution de la requête",
          delete: 'Voulez-vous confirmer la suppression ?',
          additem: 'Entrer le nom de la requête'
        },
        errors: {
          layers: {
            load: "Certaines layers du projet ne sont pas disponibles actuellement et n'apparaissent donc pas dans la vue actuelle"
          },
          unsupported_format: 'Format non supporté',
          add_external_layer: 'Erreur lors du chargement du layer'
        },
        metadata: {
          title: "Métadonnées",
          groups: {
            general: {
              title: 'GÉNÉRAL',
              fields: {
                title: 'TITRE',
                name: 'NOM',
                description: "DESCRIPTION",
                abstract: "ABREGE",
                keywords: 'LISTE DE MOTS-CLÉS',
                fees: "DROITS D'INSCRIPTION",
                accessconstraints: "CONTRAINTES D'ACCÈS",
                contactinformation: "CONTACTS",
                subfields: {
                  contactinformation: {
                    contactelectronicmailaddress: "E-mail",
                    personprimary: 'Références',
                    contactvoicetelephone: 'Téléphone',
                    contactorganization: 'Organisation',
                    ContactOrganization: 'Organisation',
                    contactposition: 'Localisation',
                    ContactPosition : 'Localisation',
                    contactperson: 'Personne',
                    ContactPerson: 'Personne',
                  }
                },
                wms_url: "WMS"
              }
            },
            spatial:{
              title: 'INFO ESPACE',
              fields : {
                crs: 'EPSG',
                extent: 'BBOX'
              }
            },
            layers: {
              title: 'STRATES',
              groups : {
                general: 'GENERALE',
                spatial: 'INFO ESPACE'
              },
              fields: {
                layers: 'STRATES',
                subfields: {
                  crs: 'EPSG',
                  bbox: 'BBOX',
                  title: "TITRE",
                  name: 'NOM',
                  geometrytype: 'GÉOMÉTRIE',
                  source: 'SOURCE',
                  attributes: 'ATTRIBUTES',
                  abstract: 'ABRÉGÉ',
                  attribution: 'ATTRIBUTION',
                  keywords: "MOTS- CLÉS",
                  metadataurl:'URL DE MÉTADONNÉES',
                  dataurl: "URL DES DONNÉES"
                }
              }
            }
          }
        },
        tooltips: {
          relations: {
            form_to_row: "Afficher le format de la ligne",
            row_to_form: "Format du formulaire d'affichage"
          },
          zoom_to_features_extent: "Zoom sur les fonctionnalités",
          copy_map_extent_url: 'Copier le lien de visualisation de la carte',
          download_shapefile: "Télécharger le fichier Shapefile",
          download_gpx: "Télécharger GPX",
          download_gpkg: "Télécharger GPKG",
          download_csv: "Télécharger CSV",
          download_xls: "Télécharger XLS",
          show_chart: "Montrer graphique",
          atlas: "Imprimer l'Atlas"
        },
        mapcontrols: {
          query: {
            tooltip: 'Interrogation layer',
            actions: {
              add_selection: {
                hint: "Ajouter/supprimer une sélection"
              },
              zoom_to_features_extent:{
                hint: "Zoom sur les fonctionnalités"
              },
              add_features_to_results: {
                hint: "Ajouter des fonctionnalités aux résultats"
              },
              remove_feature_from_results: {
                hint: "Supprimer la fonctionnalité des résultats"
              },
              zoom_to_feature: {
                hint: "Zoom sur les fonctionnalités"
              },
              relations: {
                hint: "Voir les relations"
              },
              relations_charts: {
                hint: "Voir les graphiques de relations"
              },
              download_features_shapefile:{
                hint: 'Télécharger les fonctionnalités vers Shapefile'
              },
              download_shapefile: {
                hint: 'Télécharger le Shapefile'
              },
              download_features_gpx: {
                hint: "Télécharger les fonctionnalités vers GPX"
              },
              download_features_gpkg: {
                hint: "Télécharger les fonctionnalités vers GPKG"
              },
              download_gpx: {
                hint: "Télécharger le GPX"
              },
              download_gpkg: {
                hint: "Télécharger le GPKG"
              },
              download_features_csv: {
                hint: "Télécharger les fonctionnalités vers CSV"
              },
              download_csv: {
                hint: "Télécharger le CSV"
              },
              download_features_xls: {
                hint: "Télécharger les fonctionnalités vers XLS"
              },
              download_xls: {
                hint: "Télécharger le XLS"
              },
              atlas: {
                hint: "Imprimer l'Atlas"
              },
              copy_zoom_to_fid_url: {
                hint: "Copier l'URL de la carte avec l'extension vers cette géométrie",
                hint_change: "Copié"
              }
            }
          },
          querybypolygon: {
            download: {
              title: "Téléchargement des attributs",
              choiches:{
                feature: {
                  label: "Fonctionnalités seulement",
                },
                feature_polygon: {
                  label: "Fonctionnalités+Requête Polygon ",
                }
              }
            },
            tooltip: 'Requête par polygone',
            no_geometry: 'La réponse ne contient pas de géométrie',
            help: {
              title: 'Aide - Requête par polygone',
              message:`
                  <ul>
                    <li">Sélectionnez un layer de polygone dans la légende.</li>
                    <li>Vérifiez que le layer est visible dans la carte.</li>
                    <li>Cliquez sur une géométrie du layer sélectionné.</li>
                  </ul>`
            }
          },
          querybybbox: {
            tooltip: 'Requête pour BBOX',
            nolayers_visible: "Aucun layer requêtable n'est visible. Assurez-vous qu'au moins un layer wfs est visible pour exécuter la requête",
            help: {
              title:'Aide - Requête BBox',
              message:`
                    <ul>
                      <li>Dessinez un rectangle pour interroger les couches surlignées en jaune</li>
                   </ul>
              `
            },
          },
          addlayer: {
            messages: {
              csv: {
                warning: "Le résultat de la carte est partiel en raison de la présence des enregistrements incorrects suivants :"
              }
            },
            tooltip: 'Ajouter un layer'
          },
          geolocation: {
            tooltip: 'Géolocalisation'
          },
          measures: {
            length: {
              tooltip: "Longueur",
              help: "Cliquez sur la carte pour continuer à dessiner la ligne.<br>CANC si vous voulez supprimer le dernier vertex inséré",
            },
            area: {
              tooltip: "Zone",
              help: "Cliquez pour continuer à dessiner le polygone.<br>CANC si vous voulez supprimer le dernier vertex inséré"
            }
          },
          scale: {
            no_valid_scale: "Échelle invalide"
          },
          scaleline: {
            units: {
              metric: 'Meters',
              nautical: 'Nautical Mile'
            }
          }
        },
        relations: {
          relation_data: 'Données relationnelles',
          no_relations_found: 'Aucune relation trouvée',
          back_to_relations: 'Retour aux relations',
          list_of_relations_feature: 'Liste des relations entre les caractéristiques',
          error_missing_father_field: "Le champ concerné n'existe pas"
        },
        workflow: {
          steps: {
            title: 'Étapes',
          },
          next: 'Suivant'
        },
        form: {
          loading: 'Chargement...',
          inputs: {
            messages: {
              errors: {
                picklayer: "Aucune fonction sélectionnée. Vérifier si le layer est en édition ou non visible à l'échelle actuelle"
              }
            },
            tooltips: {
              picklayer: "Obtenir la valeur de la carte",
              lonlat: "Cliquez sur la carte pour obtenir les coordonnées"
            },
            input_validation_mutually_exclusive: "Champ mutuellement exclusif avec ",
            input_validation_error: "Champ obligatoire ou type de valeur incorrect",
            input_validation_min_field: "La valeur doit être supérieure ou égale au camp ",
            input_validation_max_field: "La valeur doit être inférieure ou égale au champ ",
            input_validation_exclude_values: "Le champ doit contenir une valeur différente",
            integer: "entier",
            bigint: "entier",
            text: "textuel",
            varchar: "textuel",
            textarea: "textuel",
            string: "chaîne",
            date: "date",
            float: "float",
            table: "table"
          },
          footer: {
            required_fields: "Champs obligatoires"
          },
          messages: {
            qgis_input_widget_relation: "Gérer les relations via un formulaire dédié"
          }
        },
        catalog: {
          current_map_theme_prefix: "THEME",
          choose_map_theme: "SÉLECTIONNEZ LE THÈME",
          menu: {
            layerposition: 'Layer Position',
            setwmsopacity: "Set Opacity",
            wms: {
              title:"",
              copy: "Cliquez ici pour copier l'url",
              copied: "Copié"
            },
            download: {
              shp: 'Télécharger Shapefile',
              gpx: 'Télécharger GPX',
              gpkg: 'Télécharger GPKG',
              csv: 'Télécharger CSV',
              xls: 'Télécharger XLS',
              geotiff: 'Télécharger GEOTIFF',
              geotiff_map_extent: "Télécharger GEOTIFF(current view extent)"
            }
          }
        },
        wps: {
          list_process: "Liste des processus",
          tooltip: 'Cliquez sur la carte'
        }
      },
      credits: {
        g3wSuiteFramework: "Application construite avec le framework OS",
        g3wSuiteDescription: "Publiez et gérez vos projets QGIS sur le Web",
        productOf: "Framework développé par",
      },
      logout: "Quitter",
      no_other_projects: "Il n'y a pas d'autres projets dans ce groupe de cartes",
      yes: "Oui",
      no: "No",
      back:"Retour",
      backto: "Retour à ",
      changemap: "Changer de carte",
      component: "Composant générique",
      search: "Recherches",
      no_results: "Aucun résultat trouvé",
      print: "Imprimer",
      create_print: "Créer une impression",
      dosearch: "Recherche",
      catalog: "Carte",
      data: "Données",
      externalwms: "WMS",
      baselayers: "Bases",
      tools: "Outils",
      tree: "Strates",
      legend: "Légende",
      nobaselayer: "Pas de carte de base",
      street_search: "Adresse de recherche",
      show: "Afficher",
      hide: "Cacher",
      copy_form_data: "Copier les données du formulaire",
      paste_form_data: "Coller",
      copy_form_data_from_feature: "Copier les données de la carte",
      error_map_loading: "Erreur de chargement de la nouvelle carte",
      check_internet_connection_or_server_admin: "Vérifiez la connexion internet ou contactez l'administrateur",
      could_not_load_vector_layers: "Erreur de connexion au serveur : il n'a pas été possible de charger les vecteurs demandés",
      server_saver_error: "Erreur de sauvegarde sur le serveur",
      server_error: "Une erreur s'est produite dans la requête au serveur",
      save: "Sauvegarder",
      cancel: "Supprimer",
      close: "Fermer",
      enlange_reduce:"Enlarge/Reduce",
      reset_default:"Default size",
      add: "Ajouter",
      exitnosave: "Quitter sans sauvegarder",
      annul: "Annuler",
      layer_is_added: "Layer avec le même nom déjà ajouté",
      wms_layer_id_already_added: "WMS Layer déjà ajouté",
      wms_url_already_added: "WMS URL déjà ajouté",
      sidebar: {
        wms: {
          panel: {
            title:'Add WMS Layer',
            label: {
              position: "Map Position",
              name: "Name",
              projections: 'Projection',
              layers: 'Layers'
            }
          },
          add_wms_layer: "Add WMS layer",
          delete_wms_url: "Delete WMS url",
          layer_id_already_added: "WMS Nivån har redan lagts till.",
          url_already_added: "WMS URL har redan lagts till.",
          layer_add_error: "WMS Layer not added. Please check all wms parameter or url"
        }
      },
      info: {
        title: "Résultats",
        open_link: "Ouvrir le document joint",
        server_error: "Une erreur s'est produite dans la requête au serveur",
        no_results: "Aucun résultat pour cette requête/recherche",
        link_button: "Ouvrir"
      },
      mapcontrols: {
        geolocations: {
          title: "",
          error: "Votre position ne peut être calculée."
        },
        nominatim: {
          placeholder: "Adresse ...",
          noresults: "Aucun résultat",
          notresponseserver: "Le serveur ne répond pas"
        },
        add_layer_control: {
          header: "Ajouter un layer",
          select_projection: "Sélectionnez le système de projection de couches",
          select_field_to_show: "Sélectionnez le champ à afficher sur la carte",
          select_csv_separator: "Sélectionner le séparateur",
          select_csv_x_field: "Sélectionnez le champ X",
          select_csv_y_field: "Sélectionnez le champ Y",
          select_color: "Sélectionnez la couleur du layer",
          drag_layer: "Faire glisser le layer vers cette zone"
        },
        query: {
          input_relation: "Cliquez pour voir les relations"
        },
        length: {
          tooltip: "Longueur"
        },
        area: {
          tooltip: "Zone"
        },
        screenshot: {
          error: "Erreur de création de la capture d'écran"
        }
      },
      catalog_items: {
        helptext: "Cliquez avec le bouton droit de la souris sur les différents layers pour accéder à des fonctionnalités supplémentaires",
        contextmenu: {
          zoomtolayer: "Zoom sur le layer",
          open_attribute_table: "Table d'attributs ouverte",
          show_metadata: "Métadonnées",
          styles: "Styles",
          vector_color_menu:"Définir/changer la couleur"
        }
      },
      dataTable: {
        previous: "Précédent",
        next: "Suivant",
        lengthMenu: "Afficher _MENU_",
        info: "Afficher _START_ à _END_ sur _TOTAL_ lignes",
        nodatafilterd: "Aucun résultat trouvé",
        infoFiltered: "(Filtré par _MAX_ rangs totaux)"
      }
    },
  },
  ro: {
    translation: {
      cookie_law: {
        message: "Acest website foloseste cookie-uri pentru a furniza vizitatorilor o experiență mult mai bună de navigare",
        buttonText: "Am înțeles!"
      },
      default:"Implicit",
      sign_in: "Logare",
      layer_selection_filter: {
        tools: {
          filter: "Adăugare/Eliminare Filtrare",
          nofilter: "Eliminare Filtrare",
          invert: "Inversare Selecție",
          clear: "Elimină Selecția",
          show_features_on_map: "Arată entitățile vizibile în cadrul hărții"
        }
      },
      warning: {
        not_supported_format: "Formatul nu este acceptat"
      },
      layer_position: {
        top: 'SUS',
        bottom: 'JOS',
        message: "Poziție relativă la straturile din TOC"
      },
      sdk: {
        search: {
          all: 'Toate',
          no_results: "Fără rezultat",
          searching: "Căutare ...",
          error_loading: "Încărcarea a eșuat",
          layer_not_searchable: "Nu se poate căuta pe strat",
          layer_not_querable: "Stratul nu se poate interoga",
          autocomplete: {
            inputshort: {
              pre: "Te rog introdu",
              post: "sau mai multe caractere"
            }
          }
        },
        print: {
          no_layers: 'Nu avem straturi de print',
          scale: "Scară",
          format: "Format",
          rotation: "Rotație",
          download_image: "Descarcă Imaginea",
          fids_instruction: "Valori acceptate: de la 1 la valoarea [max]. Este posibilă inserarea de interval, de ex. 4-6",
          fids_example: "Ex. 1,4-6 vor fi tipărite id 1,4,5,6",
          help: "Straturile prezentate în print pot fi acelea definite în proiect și nu acelea prezentate în cadrul hărții"
        },
        querybuilder: {
          search: {
            run: "Execută",
            info: "Info",
            delete: "Elimină",
            edit: "Modifică"
          },
          messages: {
            changed: 'Salvat',
            number_of_features: "Număr de entități"
          },
          panel: {
            button: {
              all: 'TOATE',
              save: 'SALVEAZĂ',
              test: 'TEST',
              clear: 'ȘTERGE',
              run: 'RUN',
              manual: 'MANUAL'
            },
            layers: 'STRATURI',
            fields: 'CÂMPURI',
            values: 'VALORI',
            operators: 'OPERATORI',
            expression: 'EXPRESII'
          },
          error_run: 'A survenit o eroare. De verificat interogarea',
          error_test: "A survenit o eroare în timp ce se executa interogarea",
          delete: 'Vrei să o ștergi?',
          additem: 'Introdu numele noii căutări'
        },
        errors: {
          layers: {
            load: "Câteva straturi nu sunt disponibile"
          },
          unsupported_format: 'Formatul nu este acceptat',
          add_external_layer: 'Eroare încărcare strat'
        },
        metadata: {
          title: 'Metadate',
          groups: {
            general: {
              title: 'GENERALITĂȚI',
              fields: {
                title: 'TITLU',
                name: 'NUME',
                description: "DESCRIERE",
                abstract: "ABSTRACT",
                keywords: 'CUVINTE CHEIE',
                fees: "TAXE",
                accessconstraints: "CONSTRÂNGERI DE ACCES",
                contactinformation: "CONTACTE",
                subfields: {
                  contactinformation: {
                    contactelectronicmailaddress: "Email",
                    personprimary: 'Referințe',
                    contactvoicetelephone: 'Telefon',
                    contactorganization: 'Organizație',
                    ContactOrganization: 'Organizație',
                    contactposition: 'Poziție',
                    ContactPosition: 'Poziție',
                    contactperson: 'Persoana',
                    ContactPerson: 'Persoana'
                  }
                },
                wms_url: "WMS"
              }
            },
            spatial:{
              title: 'SPAȚIAL',
              fields : {
                crs: 'EPSG',
                extent: 'BBOX'
              }
            },
            layers: {
              title: 'STRATURI',
              fields: {
                layers: 'STRATURI',
                subfields: {
                  crs: 'EPSG',
                  bbox: 'BBOX',
                  title: "TITLU",
                  name: 'NUME',
                  geometrytype: 'GEOMETRIE',
                  source: 'SURSA',
                  attributes: 'ATRIBUTE',
                  abstract: 'ABSTRACT',
                  attribution: 'ATRIBUIRE',
                  keywords: "CUVINTE CHEIE",
                  metadataurl:'URL METADATE',
                  dataurl: "URL DATE"
                }
              },
              groups : {
                general: 'GENERALITĂȚI',
                spatial: 'SPAȚIAL'
              }
            }
          }
        },
        tooltips: {
          relations: {
            form_to_row: "Vizualizare pe rânduri",
            row_to_form: "Vizualizare formular"
          },
          copy_map_extent_url: 'Copiază linkul de vizualizare hartă',
          download_shapefile: "Descarcă Shapefile",
          download_gpx: "Descarcă GPX",
          download_gpkg: "Descarcă GPKG",
          download_csv: "Descarcă CSV",
          download_xls: "Descarcă XLS",
          show_chart: "Arată Diagrama",
          atlas: "Tipărire Atlas"
        },
        mapcontrols: {
          query: {
            tooltip: 'Interogare strat',
            actions: {
              add_selection: {
                hint: "Adaugă/Elimină Selecția"
              },
              zoom_to_features_extent:{
                hint: "Zoom la încadrarea entităților"
              },
              add_features_to_results: {
                hint: "Adaugă/Elimină entități rezultat"
              },
              remove_feature_from_results: {
                hint: "Elimină entitate din rezultat"
              },
              zoom_to_feature: {
                hint: "Zoom la entitate"
              },
              relations: {
                hint: "Arată Relațiile"
              },
              relations_charts: {
                hint: "Arată diagrama de relații"
              },
              download_features_shapefile:{
                hint: 'Descarcă entități în Shapefile'
              },
              download_shapefile: {
                hint: 'Descarcă entitate în Shapefile'
              },
              download_features_gpx: {
                hint: "Descarcă entități în GPX"
              },
              download_features_gpkg: {
                hint: "Descarcă entități în GPKG"
              },
              download_gpx: {
                hint: "Descarcă entitate în GPX"
              },
              download_gpkg: {
                hint: "Descarcă entitate în GPKG"
              },
              download_features_csv: {
                hint: "Descarcă entități în CSV"
              },
              download_csv: {
                hint: "Descarcă entitate în CSV"
              },
              download_features_xls: {
                hint: "Descarcă entități în XLS"
              },
              download_xls: {
                hint: "Descarcă entitate în XLS"
              },
              atlas: {
                hint: "Tipărire Atlas"
              },
              copy_zoom_to_fid_url: {
                hint: "Copiază URL hartă cu întinderea geometriei entității",
                hint_change: "Copiat"
              }
            }
          },
          querybypolygon: {
            download: {
              title: "Descărcare atribute",
              choiches:{
                feature: {
                  label:"Doar entități",
                },
                feature_polygon: {
                  label:"Entități+Poligon Interogare",
                }
              }
            },
            tooltip: 'Interogare După Poligon',
            no_geometry: 'Nu avem geometrii în răspuns',
            help: {
              title:'Ghid - Interogare După Poligon',
              message: `
                  <ul>
                    <li>Selectează un strat poligon din TOC.</li>
                    <li>Asigură-te că stratul este vizibil.</li>
                    <li>Click pe o entitate a stratului selectat.</li>
                  </ul>`
            }
          },
          querybybbox: {
            tooltip: 'Interogare BBox strat',
            nolayers_visible: 'Nu este vizibil niciun strat de interogare. Trebuie setat cel puțin un strat WFS vizibil pentru a efectua interogarea',
            help: {
              title: 'Ghid - Interogare BBox strat',
              message:`
                   <ul>
                    <li>Desenează un pătrat pe hartă pentru a interoga straturile din TOC de sub </li>
                   </ul>`
            }
          },
          addlayer: {
            messages: {
              csv: {
                warning: "Rezultateul pe hartă este parțial datorită prezenței următoarei liste de rezultate incorecte:"
              }
            },
            tooltip: 'Adaugă Strat'
          },
          geolocation: {
            tooltip: 'Geolocalizare'
          },
          measures: {
            length: {
              tooltip: "Lungime",
              help: "Click pe hartă pentru a desena linia. Apasă <br>CANC dacă dorești să ștergi ultimul vertex",
            },
            area: {
              tooltip: "Aria",
              help: "Click pentru desen poligon. Apasă <br>CANC dacă dorești să ștergi ultimul vertex"
            }
          },
          scale: {
            no_valid_scale: "Scară Invalidă"
          },
          scaleline: {
            units: {
              metric: 'Metri',
              nautical: 'Mile Nautice'
            }
          }
        },
        relations: {
          relation_data: 'Date Relații',
          no_relations_found: 'Nu am găsit nicio relație',
          back_to_relations: 'Înapoi la relații',
          list_of_relations_feature: 'Lista de relații a entității',
          error_missing_father_field: "Câmpul de legătură lipsește"
        },
        workflow: {
          steps: {
            title: 'Pași',
          },
          next: 'Următorul'
        },
        form: {
          loading: 'Se încarcă ...',
          inputs: {
            messages: {
              errors: {
                picklayer: "Nu avem entitate selectată. Verifică dacă stratul este în editare sau vizibil la scara curentă if layer is on editing or visible at current scale"
              }
            },
            tooltips:{
              picklayer: "Ia valoare din strat",
              lonlat: "Click pe hartă pentru a prelua coordonate"
            },
            input_validation_mutually_exclusive: "Câmp ce se exclude mutual cu ",
            input_validation_error: "Câmp mandatoriu sau tip de date greșit",
            input_validation_min_field: "Valoarea trebuie să fie mai mare/egală cu valoare câmpului ",
            input_validation_max_field: "Valoarea trebuie să fie mai mică/egală cu valoare câmpului ",
            input_validation_exclude_values: "Valoarea trebuie să fie unică",
            integer: "integer - nr. întreg",
            bigint: "integer - nr. întreg",
            text: "text",
            varchar: "text",
            textarea: "text",
            string: "string - text",
            date: "data",
            float: "float - nr. cu zecimale",
            table: "tabelă"
          },
          footer: {
            "required_fields": "Câmpuri necesare"
          },
          messages: {
            qgis_input_widget_relation: "Folosește formular specific de relații pentru a lucra cu relația"
          }
        },
        catalog: {
          current_map_theme_prefix: "TEMA",
          choose_map_theme: "ALEGE TEMA",
          menu: {
            layerposition: 'Poziție Strat',
            setwmsopacity: "Alege Opacitatea",
            wms: {
              title:"Titlu",
              copy: "Click pentru copiere URL",
              copied: "Copiat"
            },
            download: {
              shp: 'Descarcă Shapefile',
              gpx: 'Descarcă GPX',
              gpkg: 'Descarcă GPKG',
              csv: 'Descarcă CSV',
              xls: 'Descarcă XLS',
              geotiff: "Descarcă GEOTIFF",
              geotiff_map_extent: "Descarcă GEOTIFF(ce se vede în cadrul hărții)"
            }
          }
        },
        wps: {
          list_process: "Lista de procese",
          tooltip: 'Click pe hartă'
        }
      },
      credits: {
        g3wSuiteFramework: "Aplicație bazată pe frameworkul",
        g3wSuiteDescription: "Publică și administrează proiectele de QGIS pe WEB",
        productOf: "Framework dezvoltat de",
      },
      toggle_color_scheme: "Comutare schemă de culori",
      logout: "Deconectare",
      no_other_projects: "No more project for this group",
      yes: "Da",
      no: "Nu",
      back: "Înapoi",
      backto: "Înapoi la ",
      changemap: "Schimbare Hartă",
      component: "Componentă Generică",
      search: "Căutare",
      no_results: "Niciun rezultat găsit",
      print: "Tipărire",
      create_print: "Adaugă Tipărire",
      dosearch: "Caută",
      catalog: "Hartă",
      data: "Data",
      externalwms: "WMS",
      baselayers: "Straturi Bază",
      tools: "Instrumente",
      tree: "Straturi",
      legend: "Legendă",
      nobaselayer: "Fără strat de bază",
      street_search: "Caută Adresă",
      show: "Arată",
      hide: "Ascunde",
      copy_form_data: "Copiază data",
      paste_form_data: "Lipește",
      copy_form_data_from_feature: "Copiază data din hartă",
      error_map_loading: "Sunt erori la încărcarea hărții",
      check_internet_connection_or_server_admin: "Verificați conexiune de internet sau contactați administratorul de sistem",
      could_not_load_vector_layers: "Eroare de conexiune: Straturile nu pot fi încărcate",
      server_saver_error: "Eroare la salvarea pe server",
      server_error: "Eroare de conexiune la server",
      save: "Salvează",
      cancel: "Anulează",
      close: "Închide",
      enlange_reduce:"Mărește/Micșorează",
      reset_default:"Mărimea implicită",
      add: "Adaugă",
      exitnosave: "Ieșire fără salvare",
      annul: "Anulează",
      layer_is_added: "Există un strat cu același nume deja adăugat",
      sidebar: {
        wms: {
          panel: {
            title:'Adaugă strat WMS',
            label: {
              position: "Poziție Hartă",
              name: "Nume",
              projections: 'Proiecție',
              layers: 'Straturi'
            }
          },
          add_wms_layer: "Adaugă strat WMS",
          delete_wms_url: "Șterge URL WMS",
          layer_id_already_added: "Strat WMS deja adăugat",
          url_already_added: "URL WMS deja adăugat",
          layer_add_error: "Stratul WMS nu s-a adăugat. Verificați URL-ul sau parametrii WMS"
        }
      },
      info: {
        title: "Rezultate",
        open_link: "Deschide document atașat",
        server_error: "Serverul a întâmpinat o eroare",
        no_results: "Niciun rezultat",
        link_button: "Deschide"
      },
      mapcontrols: {
        geolocations: {
          error: "Nu te-am putut localiza"
        },
        nominatim: {
          placeholder: "Adresa ...",
          noresults: "Niciun rezultat",
          notresponseserver: "Niciun răspuns de la server"
        },
        add_layer_control: {
          header: "Adăugare Strat",
          select_projection: "Selectează proiecția strat",
          select_field_to_show: "Selectează câmpul de arătat pe hartă",
          select_csv_separator: "Selectează delimitatorul",
          select_csv_x_field: "Selectează câmpul X - Est",
          select_csv_y_field: "Selectează câmpul Y - Nord",
          select_color: "Selectează culoare strat",
          drag_layer: "Trageți stratul aici (Drag&Drop)"
        },
        query: {
          input_relation: "Click pentru a arăta relațiile"
        },
        length: {
          tooltip: "Lungime"
        },
        area: {
          tooltip: "Arie"
        },
        screenshot: {
          error: "Eroare captură ecran"
        }
      },
      catalog_items: {
        helptext: "Click dreapta pe strat pentru a accesa opțiuni",
        contextmenu: {
          zoomtolayer: "Zoom pe Strat",
          open_attribute_table: "Deschide Tabela Atribute",
          show_metadata: "Metadate",
          styles: 'Stiluri',
          vector_color_menu:"Setează/Schimbă Culoare"
        }
      },
      dataTable: {
        previous: "Anteriorul",
        next: "Următorul",
        lengthMenu: "Arată _MENU_",
        info: "Arată _START_ până la _END_ din _TOTAL_ de intrări",
        no_data: "Fără date",
        nodatafilterd: "Niciun rezultat",
        infoFiltered: "(filtrat din _MAX_ de rezultate totale)"
      }
    },
  }

};

module.exports = translations;
