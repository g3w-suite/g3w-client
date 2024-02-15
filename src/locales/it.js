export default {
  translation: {
    error_page: {
      error: "Errore di connessione",
      at_moment: "Al momento non è possibile caricare la mappa",
      f5: "Premi Ctrl+F5"
    },
    cookie_law: {
      message: "Questo sito utilizza i cookie per garantire una buona usabilità all'utilizzatore finale.",
      buttonText: "Ho capito!"
    },
    default:"predefinito",
    sign_in: "Accedi",
    layer_selection_filter: {
      tools: {
        filter: "Attiva/Disattiva Filtro",
        nofilter: "Rimuovi filtro",
        invert: "Inverti Selezione",
        clear: "Annulla selezione",
        show_features_on_map: "Mostra features visibili su mappa",
        savefilter: "Salva Filtro",
        filterName: 'Nome Filtro',
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
      atlas: {
        template_dialog: {
          title: "Seleziona Template"
        }
      },
      spatialbookmarks: {
        title: "Segnalibri Spaziali",
        helptext: "Posizionati all'estensione del tuo nuovo segnalibro, definisci il nome e clicca Aggiungi",
        input: {
          name: "Nome"
        },
        sections: {
          project:{
            title: "Segnalibri Progetto"
          },
          user: {
            title: "Segnalibri Utente"
          }
        }
      },
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
        template: "Template",
        labels: "Etichette",
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
          row_to_form: "Visualizza formato Form",
          zoomtogeometry: "Zoom sulla geometria",
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
                  <li>Seleziona uno strato poligonale in legenda.</li>
                  <li>Assicurati che lo strato sia visibile in mappa.</li>
                  <li>Clicca su una geometria dello strato selezionato.</li>
                </ul>`
          }
        },
        querybydrawpolygon: {
          tooltip: "Disegna un poligono per interrogare"
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
        },
        zoomhistory: {
          zoom_last: "Zoom Precedente",
          zoom_next: "Zoom Successivo"
        }
      },
      relations: {
        relation_data: 'Dati Relazione',
        no_relations_found: 'Nessuna relazione trovata',
        back_to_relations: 'Ritorna alle relazioni',
        list_of_relations_feature: 'Lista delle relazioni della feature',
        error_missing_father_field: "Il campo relazionato non esiste"
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
          datetime: "data",
          float: "float",
          table: "table"
        },
        footer: {
          required_fields: "Campi obbligatori"
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
            unknow: "Scarica",
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
    /**
     * @since 3.8.0
     */
    no_other_groups: "Non ci sono altri gruppi in questo Macrogruppo",
    yes: "Si",
    no: "No",
    back:"Indietro",
    backto: "Torna a ",
    changemap: "Cambia Mappa",
    change_session: "Cambia Sessione",
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
    /**
     * @since 3.8.0
     */
    dont_show_again: "Non mostrare più",
    enlange_reduce: "Allarga / Riduci",
    reset_default: "Dimensione predefinita",
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
        layer_id_already_added: "Questo Layer WMS è già stato aggiunto",
        url_already_added: "URL/Nome WMS già aggiunto",
        layer_add_error: "WMS Layer non aggiunto. Verificare i parametri o l'url"
      }
    },
    info: {
      title: "Risultati",
      list_of_relations: "Lista delle relazioni",
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
      geocoding: {
        choose_layer: "Scegli un livello in cui aggiungere questa funzionalità",
        placeholder: "Indirizzo ...",
        nolayers: "Nessun layer di punti modificabile trovato in questo progetto",
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
        error: "Errore nella creazione dello screenshot",
        securityError: `  
        <p><b>Errore di sicurezza</b>: uno strato esterno impedisce la stampa della mappa. Per verificare, procedere come segue:</p>
        <ol>
          <li>rimuovi eventuali layer esterni aggiunti manualmente (es. layer WMS)</li>
          <li>forza il ricaricamento della pagina: <code>CTRL + F5</code></li>
          <li>stampa nuovamente la mappa</li>
        </ol>
        <p>Per maggiori informazioni contattare l'amministratore del server in merito a: <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image" style="color: #000 !important;font-weight: bold;">&#x2139;&#xFE0F; security and tainted canvases</a></p>
        `
      }
    },
    catalog_items: {
      helptext: "Tasto destro sui singoli layer per accedere alle funzionalità aggiuntive",
      contextmenu: {
        zoomtolayer: "Zoom to Layer",
        open_attribute_table: "Apri tabella attributi",
        show_metadata: "Metadati",
        styles: "Stili",
        vector_color_menu:"Setta/Cambia Colore",
        layer_opacity: "Trasparenza",
        filters: "Filtri",
      }
    },
    dataTable: {
      previous: "Precedente",
      next: "Successivo",
      lengthMenu: "Visualizza _MENU_",
      info: "Visualizzazione _START_ a _END_ su _TOTAL_ righe",
      nodatafilterd: "Nessun risultato trovato",
      infoFiltered: "(Filtrati da _MAX_ total righe)"
    },
  },
};