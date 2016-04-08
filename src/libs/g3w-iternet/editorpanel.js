var GUI = require('g3w/gui/gui');
var Service = require('./iternetservice');

require('g3w/gui/vue.disabled');

var PanelComponent = Vue.extend({
  template: require('./editorpanel.html'),
  data: function(){
    return {
      state: Service.state,
      resourcesurl: GUI.getResourcesUrl(),
      editorstoolbars: [
        {
          name: "Accessi",
          layercode: "accessi",
          tools:[
            {
              title: "Aggiungi accesso",
              tooltype: 'addfeature',
              icon: 'iternetAddPoint.png'
            },
            {
              title: "Modifica accesso",
              tooltype: '',
              icon: 'iternetMovePoint.png'
            },
            {
              title: "Rimuovi accesso",
              tooltype: '',
              icon: 'iternetDeletePoint.png'
            },
            {
              title: "Edita attributi",
              tooltype: '',
              icon: 'editAttributes.png'
            }
          ]
        },
        {
          name: "Giunzioni stradali",
          layercode: "giunzioni",
          tools:[
            {
              title: "Aggiungi giunzione",
              tooltype: '',
              icon: 'iternetAddPoint.png'
            },
            {
              title: "Modifica giunzione",
              tooltype: '',
              icon: 'iternetMovePoint.png'
            },
            {
              title: "Rimuovi giunzione",
              tooltype: '',
              icon: 'iternetDeletePoint.png'
            },
            {
              title: "Edita attributi",
              tooltype: '',
              icon: 'editAttributes.png'
            }
          ]
        },
        {
          name: "Elementi stradali",
          layercode: "strade",
          tools:[
            {
              title: "Aggiungi strada",
              tooltype: '',
              icon: 'iternetAddLine.png'
            },
            {
              title: "Modifica vertice strada",
              tooltype: '',
              icon: 'iternetMoveVertex.png'
            },
            {
              title: "Rimuovi strada",
              tooltype: '',
              icon: 'iternetDeleteLine.png'
            },
            {
              title: "Edita attributi",
              tooltype: '',
              icon: 'editAttributes.png'
            }
          ]
        }
      ]
    }
  },
  methods: {
    toggleEditing: function(){
      Service.togglEditing();
    },
    toggleEditTool: function(layerCode,toolType){
      if (toolType == ''){
        return;
      }
      if (_.isNil(this.state.editingToolRunning.toolType)){
        Service.startEditTool(layerCode,toolType);
      }
      else {
        Service.stopEditTool(layerCode);
      }
    },
    editingtoolbtnToggled: function(layerCode,toolType){
      return (this.state.editingToolRunning.layerCode == layerCode && this.state.editingToolRunning.toolType == toolType);
    }
  },
  computed: {
    editingbtnlabel: function(){
      return this.state.editingOn ? "Termina editing" : "Avvia editing";
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
