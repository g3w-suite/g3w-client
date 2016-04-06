var GUI = require('g3w/gui/gui');
var Service = require('./iternetservice');

require('g3w/gui/vue.disabled');

var PanelComponent = Vue.extend({
  template: require('./editorpanel.html'),
  data: function(){
    return {
      state: Service.state,
      resourcesurl: GUI.getResourcesUrl(),
      editorstoolbars: {
        accessi: {
          name: "Accessi",
          tools:[
            {
              title: "Aggiungi accesso",
              action: 'addPoint',
              icon: 'iternetAddPoint.png'
            },
            {
              title: "Modifica accesso",
              action: 'movePoint',
              icon: 'iternetMovePoint.png'
            },
            {
              title: "Rimuovi accesso",
              action: 'deletePoint',
              icon: 'iternetDeletePoint.png'
            },
            {
              title: "Edita attributi",
              action: 'editAttributes',
              icon: 'editAttributes.png'
            }
          ]
        },
        giunzioni: {
          name: "Giunzioni stradali",
          tools:[
            {
              title: "Aggiungi giunzione",
              action: 'addPoint',
              icon: 'iternetAddPoint.png'
            },
            {
              title: "Modifica giunzione",
              action: 'movePoint',
              icon: 'iternetMovePoint.png'
            },
            {
              title: "Rimuovi giunzione",
              action: 'deletePoint',
              icon: 'iternetDeletePoint.png'
            },
            {
              title: "Edita attributi",
              action: 'editAttributes',
              icon: 'editAttributes.png'
            }
          ]
        },
        strade: {
          name: "Elementi stradali",
          tools:[
            {
              title: "Aggiungi strada",
              action: 'addPoint',
              icon: 'iternetAddLine.png'
            },
            {
              title: "Modifica vertice strada",
              action: 'movePoint',
              icon: 'iternetMoveVertex.png'
            },
            {
              title: "Rimuovi strada",
              action: 'deletePoint',
              icon: 'iternetDeleteLine.png'
            },
            {
              title: "Edita attributi",
              action: 'editAttributes',
              icon: 'editAttributes.png'
            }
          ]
        }
      }
    }
  },
  methods: {
    toggleEditing: function(){
      Service.togglEditing();
    }
  },
  computed: {
    editingbtnlabel: function(){
      return this.state.editingOn ? "Termina attivo" : "Avvia editing";
    },
    editingbtnEnabled: function(){
      return this.state.editingEnabled ? "" : "disabled";
    },
    message: function(){
      var message = "";
      if (!this.state.editingEnabled){
        message = '<span style="color: red">Aumentare il livello di zoom per abilitare l\'editing';
      }
      else {
        
      }
      return message;
    }
  }
});

function Panel(){
  // proprietà necessarie. In futuro le mettermo in una classe Panel da cui deriveranno tutti i pannelli che vogliono essere mostrati nella sidebar
  this.id = "iternet-editing-panel";
  this.name = "Gestione dati ITERNET";
  this.panelComponent = null;
}

var proto = Panel.prototype;

// viene richiamato dalla toolbar quando il plugin chiede di mostrare un proprio pannello nella GUI (GUI.showPanel)
proto.onShow = function(container){
  var panel = this.panelComponent = new PanelComponent();
  panel.$mount().$appendTo(container);
  return panel;
};

// richiamato quando la GUI chiede di chiudere il pannello. Se ritorna false il pannello non viene chiuso
proto.onClose = function(){
  this.panelComponent.$destroy(true);
  this.panelComponent = null;
  return true;
};

module.exports = Panel;
