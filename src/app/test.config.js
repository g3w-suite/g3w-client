var config = {
  baseUrl: "",
  group: {
    name: 'Test group',
    id: 'test_group',
    minscale:100000000,
    maxscale:1,
    crs: 32632,
    projects: [
      {
          type: 'qdjango',
          name: 'Open Data Firenze',
          id: 'open_data_firenze'
      },
    ],
    initproject: 'open_data_firenze',
    overvieproject: null,
    activeproject: {
      id: 'open_data_firenze',
      name: "Open Data Firenze",
      extent: [680146.26655817439313978,4849613.36099641863256693,680654.92818519228603691,4850025.21881435159593821],
      layers: [
          {
              title: "Unioni Comuni Toscana",
              name: "uct"
              crs: 32632,
              //bbox: [], //il bbox di un layer non è presente nel progetto di QGIS, mentre GetProjectSettings (ovvero GetCapabilities) lo fornisce (http://parcoapuane.gis3w.it/ows.fcgi?map=/home/walter/app/qdjango_parcoapuane/www/media/projects/cartografia-generale_perimetrazione-di-dettaglio-aree-estrattive.qgs&&SERVICE=WMS&VERSION=1.3&REQUEST=GetProjectSettings)
              style: "",
              attributes: [
                  {
                      name: "",
                      type: ""
                  },
              ],
              scalebasedvisibility: true|false
              minscale: 100000,
              maxscale: 1000,
              infourl: "",: "",
              inforformat: "",
              capabilities: ["visible","queryable","editable"],
              metalayer: id | null
          },
      ],
      layerstree: [
        { 
          name: 'punti',
          expanded: true
          nodes: [
            { 
              name: 'farmacie',
              visible: false
            },
            { 
              name: 'musei',
              visible: false
            },
            { 
              name: 'strutture',
              visible: true
            },
            { 
              name: 'alberi',
              visible: true
            }
          ]
        },
        { 
          name: 'viabilita', 
          expanded: false,
          nodes: [
            { 
              name: 'tram',
              visible: true
            },
            { 
              name: 'strade',
              visible: true
            }
          ]
        },
        { 
          name: 'utc',
          visible: true
        }
      ],
      search: {}
    }
  }
}
