var config = {
    id: 'open_data_firenze',
    type: 'qdjango',
    gid: 'qdjango:open_data_firenze',
    name: "Open Data Firenze",
    extent: [671462.10014955804217607,4843387.93520695623010397,689745.0329605950973928,4856531.18380188010632992],
    layers: [
        {
            id: 'Unioni_Comuni_Toscana20160316113324322',
            title: "Unioni Comuni Toscana",
            name: "uct",
            crs: 32632,
            //bbox: [], //il bbox di un layer non è presente nel progetto di QGIS, mentre GetProjectSettings (ovvero GetCapabilities) lo fornisce (http://parcoapuane.gis3w.it/ows.fcgi?map=/home/walter/app/qdjango_parcoapuane/www/media/projects/cartografia-generale_perimetrazione-di-dettaglio-aree-estrattive.qgs&&SERVICE=WMS&VERSION=1.3&REQUEST=GetProjectSettings)
            style: "",
            attributes: [
                {
                    name: "",
                    type: ""
                },
            ],
            scalebasedvisibility: false,
            minscale: null,
            maxscale: null,
            infourl: "",
            inforformat: "",
            capabilities: 1, // OR BITS: 1=QUERYABLE, 2=EDITABLE -> QUERYABLE e EDITABLE = 1|2 = 3
            editops: null, // OR BITS: 1=INSERT, 2=UPDATE, 4=DELETE -> INSERT + UPDATE + DELETE = 1|2|4 = 7
            metalayer: 1 // oppure null per layers non QGIS
        },
        {
            id: 'alberi20160316112747010',
            title: "Alberi",
            name: "alberi",
            crs: 3857,
            style: "",
            attributes: [
                {
                    name: "",
                    type: ""
                },
            ],
            scalebasedvisibility: true,
            minscale: 10000,
            maxscale: 1,
            infourl: "",
            inforformat: "",
            capabilities: 2, // OR BITS: 1=QUERYABLE, 2=EDITABLE -> QUERYABLE e EDITABLE = 1|2 = 3
            editops: 7, // OR BITS: 1=INSERT, 2=UPDATE, 4=DELETE -> INSERT + UPDATE + DELETE = 1|2|4 = 7
            metalayer: 1
        },
        {
            id: 'farmacie20160316113417025',
            title: "Farmacie",
            name: "farmacie",
            crs: 3857,
            style: "",
            attributes: [
                {
                    name: "",
                    type: ""
                },
            ],
            scalebasedvisibility: false,
            minscale: null,
            maxscale: null,
            infourl: "",
            inforformat: "",
            capabilities: 2, // OR BITS: 1=QUERYABLE, 2=EDITABLE -> QUERYABLE e EDITABLE = 1|2 = 3
            editops: 2, // OR BITS: 1=INSERT, 2=UPDATE, 4=DELETE -> INSERT + UPDATE + DELETE = 1|2|4 = 7
            metalayer: 1
        },
        {
            id: 'musei20160316112726261',
            title: "Musei",
            name: "musei",
            crs: 3003,
            style: "",
            attributes: [
                {
                    name: "",
                    type: ""
                },
            ],
            scalebasedvisibility: false,
            minscale: null,
            maxscale: null,
            infourl: "",
            inforformat: "",
            capabilities: 1, // OR BITS: 1=QUERYABLE, 2=EDITABLE -> QUERYABLE e EDITABLE = 1|2 = 3
            editops: null, // OR BITS: 1=INSERT, 2=UPDATE, 4=DELETE -> INSERT + UPDATE + DELETE = 1|2|4 = 7
            metalayer: 1
        },
        {
            id: 'strade20160316113013257',
            title: "Strade",
            name: "Strade",
            crs: 3857,
            style: "",
            attributes: [
                {
                    name: "",
                    type: ""
                },
            ],
            scalebasedvisibility: false,
            minscale: null,
            maxscale: null,
            infourl: "",
            inforformat: "",
            capabilities: 1, // OR BITS: 1=QUERYABLE, 2=EDITABLE -> QUERYABLE e EDITABLE = 1|2 = 3
            editops: null, // OR BITS: 1=INSERT, 2=UPDATE, 4=DELETE -> INSERT + UPDATE + DELETE = 1|2|4 = 7
            metalayer: 1
        },
        {
            id: 'strutture20160316113225408',
            title: "Grandi strutture",
            name: "grandi_strutture",
            crs: 3003,
            style: "",
            attributes: [
                {
                    name: "",
                    type: ""
                },
            ],
            scalebasedvisibility: false,
            minscale: null,
            maxscale: null,
            infourl: "",
            inforformat: "",
            capabilities: 1, // OR BITS: 1=QUERYABLE, 2=EDITABLE -> QUERYABLE e EDITABLE = 1|2 = 3
            editops: null, // OR BITS: 1=INSERT, 2=UPDATE, 4=DELETE -> INSERT + UPDATE + DELETE = 1|2|4 = 7
            metalayer: 1
        },
        {
            id: 'tracciato_tram20160316113305421',
            title: "Tracciato tram",
            name: "tracciato_tram",
            crs: 3003,
            style: "",
            attributes: [
                {
                    name: "",
                    type: ""
                },
            ],
            scalebasedvisibility: false,
            minscale: null,
            maxscale: null,
            infourl: "",
            inforformat: "",
            capabilities: 1, // OR BITS: 1=QUERYABLE, 2=EDITABLE -> QUERYABLE e EDITABLE = 1|2 = 3
            editops: null, // OR BITS: 1=INSERT, 2=UPDATE, 4=DELETE -> INSERT + UPDATE + DELETE = 1|2|4 = 7
            metalayer: 1
        },
    ],
    layerstree: [
      { 
        name: 'punti',
        expanded: true,
        nodes: [
          { 
            id: 'strutture20160316113225408',
            visible: false
          },
          { 
            id: 'alberi20160316112747010',
            visible: false
          },
          { 
            id: 'farmacie20160316113417025',
            visible: true
          },
          { 
            id: 'musei20160316112726261',
            visible: true
          }
        ]
      },
      { 
        name: 'linee', 
        expanded: false,
        nodes: [
          { 
            id: 'tracciato_tram20160316113305421',
            visible: true
          },
          { 
            id: 'strade20160316113013257',
            visible: true
          }
        ]
      },
      { 
        id: 'Unioni_Comuni_Toscana20160316113324322',
        visible: true
      }
    ],
    search: {}
  };
  
module.exports = config;
