/*
var config = {
  baseUrl: "",
  group: {
    name: 'Verde Firenze',
    id: 'verde_firenze',
    minscale:100000000,
    maxscale:1,
    crs: 32632,
    projects: [
      {
          type: 'qdjango',
          name: 'Farmcia e alberi',
          id: 'farmacie_alberi'
      },
    ],
    initproject: 'farmacie_alberi',
    overvieproject: null,
    activeproject: {
      id: 'farmacie_alberi',
      name: "Farmacie e alberi",
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
          nodes: [
            { 
              name: 'farmacie'
            },
            { 
              name: 'musei'
            }
          ]
        },
        { 
          name: 'viabilita', 
          nodes: [
            { 
              name: 'tram'
            },
            { 
              name: 'strade'
            }
          ]
        },
        { 
          name: 'utc'
        }
      ],
      search: {}
    }
  }
}
*/

var service = {};

module.exports = service;
