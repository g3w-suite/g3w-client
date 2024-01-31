export default {
  translation: {
    error_page: {
      error: "Erreur de connexion",
      at_moment: "Pour le moment, il n'est pas possible d'afficher la carte",
      f5: "Appuyez sur Ctrl+F5"
    },
    cookie_law: {
      message: "Ce site utilise des cookies pour assurer une bonne convivialité pour l'utilisateur final.",
      buttonText: "J’ai compris !"
    },
    default:"par défaut ",
    sign_in: "Se connecter ",
    layer_selection_filter: {
      tools: {
        filter: "Activer/Désactiver le filtre",
        nofilter: "Supprimer le filtre ",
        invert: "Sélection inversée ",
        clear: "Effacer la sélection ",
        show_features_on_map: "Afficher les caractéristiques visibles sur la carte",
        savefilter: "Sauver le Filtre",
        filterName: "Nom du Filtre",
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
      atlas: {
        template_dialog: {
          title: "Sélectionnez Template"
        }
      },
      spatialbookmarks: {
        title: "Signets spatiaux",
        helptext: "Déplacez-vous sur l'étendue de la carte, insérez le nom et cliquez sur Ajouter",
        input: {
          name: "Nom"
        },
        sections: {
          project:{
            title: "Signets du projet"
          },
          user: {
            title: "Signets de l'utilisateur"
          }
        }
      },
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
          row_to_form: "Format du formulaire d'affichage",
          zoomtogeometry: "Zoom sur la géométrie",
        },
        zoom_to_features_extent: "Zoom sur les fonctionnalités",
        copy_map_extent_url: 'Copier le lien de visualisation de la carte',
        download_shapefile: "Télécharger le fichier Shapefile",
        download_gpx: "Télécharger GPX",
        download_gpkg: "Télécharger GPKG",
        download_csv: "Télécharger CSV",
        download_xls: "Télécharger XLS",
        download_pdf: "Télécharger PDF",
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
            download_pdf: {
              hint: "Télécharger le PDF"
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
                  <li>Sélectionnez un layer de polygone dans la légende.</li>
                  <li>Vérifiez que le layer est visible dans la carte.</li>
                  <li>Cliquez sur une géométrie du layer sélectionné.</li>
                </ul>`
          }
        },
        querybydrawpolygon: {
          tooltip: "Requête par polygone de dessin"
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
        },
        zoomhistory: {
          zoom_last: "Zoom Précédent",
          zoom_next: "Zoom Suivant"
        }
      },
      relations: {
        relation_data: 'Données relationnelles',
        no_relations_found: 'Aucune relation trouvée',
        back_to_relations: 'Retour aux relations',
        list_of_relations_feature: 'Liste des relations entre les caractéristiques',
        error_missing_father_field: "Le champ concerné n'existe pas"
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
          datetime: "date",
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
            unknow: 'Télécharger',
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
    no_other_groups: "Il n'y a pas d'autres groupes dans ce macrogroupe",
    yes: "Oui",
    no: "No",
    back:"Retour",
    backto: "Retour à ",
    changemap: "Changer de carte",
    change_session: "Changer de séance",
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
    /**
     * @since 3.8.0
     */
    dont_show_again: "Ne plus afficher ce message",
    enlange_reduce: "Agrandir / Réduire",
    reset_default: "Taille par défaut",
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
        url_already_added: "WMS URL/Nom har redan lagts till.",
        layer_add_error: "WMS Layer not added. Please check all wms parameter or url"
      }
    },
    info: {
      title: "Résultats",
      list_of_relations: "List of Relations",
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
      geocoding: {
        choose_layer: "Choisissez un calque où ajouter cette fonctionnalité",
        placeholder: "Adresse ...",
        nolayers: "Aucune couche de points modifiable trouvée sur ce projet",
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
        error: "Erreur de création de la capture d'écran",
        securityError: `  
        <p><b>Erreur de sécurité</b> : une couche externe empêche l'impression de la carte. Pour vérifier, procédez comme suit :</p>
        <ol>
          <li>supprimer toutes les couches externes ajoutées manuellement (par exemple, les couches WMS)</li>
          <li>forcer le rechargement de la page : <code>CTRL + F5</code></li>
          <li>imprimer à nouveau la carte</li>
        </ol>
        <p>Pour plus d'informations, veuillez contacter l'administrateur du serveur à propos de : <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image" style="color: #000 !important;font -poids : gras ;">&#x2139;&#xFE0F; sécurité et toiles souillées</a></p>
        `
      }
    },
    catalog_items: {
      helptext: "Cliquez avec le bouton droit de la souris sur les différents layers pour accéder à des fonctionnalités supplémentaires",
      contextmenu: {
        zoomtolayer: "Zoom sur le layer",
        open_attribute_table: "Table d'attributs ouverte",
        show_metadata: "Métadonnées",
        styles: "Styles",
        vector_color_menu:"Définir/changer la couleur",
        layer_opacity: "Opacité",
        filters: "Filters",
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
};