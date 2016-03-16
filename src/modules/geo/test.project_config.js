var config = {
    id: 'open_data_firenze',
    name: "Open Data Firenze",
    extent: [680146.26655817439313978,4849613.36099641863256693,680654.92818519228603691,4850025.21881435159593821],
    layers: [
        {
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
            title: "Strade",
            name: "strade",
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
            name: 'musei20160316112726261',
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
