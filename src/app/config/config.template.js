// questo è la configurazione base del template che conterrà tutti gli
// elementi previsti dal template. Nella definizione sono tutti oggetti vuoti
//Sarà l'applicazione a scegliere di riempire gli elementi
var templateConfiguration = {
  navbar: {
	  components: [
	    geocode: {}
	  ]
	},
	sidebar: {
	  components: [
      {
        search: {}
      },
      {
        catalog: {}
      }
    ]
  },
  floatbar: {
    components: [
      {
        result: {}
      }
    ]
  },
  viewport:{
    components: [
      {
        map: {}
      }
    ]
  }
};

module.exports = templateConfiguration;