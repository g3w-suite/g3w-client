var config = {
    id: 'open_data_firenze_2',
    type: 'qdjango_2',
    gid: 'qdjango:open_data_firenze_2',
    name: "Open Data Firenze 2",
    extent: [680146.26655817439313978,4849613.36099641863256693,680654.92818519228603691,4850025.21881435159593821],
    layers: [
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
        name: 'POI',
        expanded: true,
        nodes: [
          { 
            id: 'strutture20160316113225408',
            visible: false
          },
          { 
            id: 'musei20160316112726261',
            visible: true
          }
        ]
      },
      { 
        name: 'Viabilità', 
        expanded: true,
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
      }
    ],
    search: {}
  };
  
module.exports = config;
