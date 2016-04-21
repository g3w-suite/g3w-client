var GUI = require('g3w/gui/gui');
var Service = require('./iternetservice');

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
              title: "Sposta accesso",
              tooltype: 'movefeature',
              icon: 'iternetMovePoint.png'
            },
            {
              title: "Rimuovi accesso",
              tooltype: 'deletefeature',
              icon: 'iternetDeletePoint.png'
            },
            {
              title: "Edita attributi",
              tooltype: 'editattributes',
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
              title: "Sposta giunzione",
              tooltype: 'movefeature',
              icon: 'iternetMovePoint.png'
            },
            {
              title: "Rimuovi giunzione",
              tooltype: '',
              icon: 'iternetDeletePoint.png'
            },
            {
              title: "Edita attributi",
              tooltype: 'editattributes',
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
              tooltype: 'addfeature',
              icon: 'iternetAddLine.png'
            },
            {
              title: "Sposta vertice strada",
              tooltype: '',
              icon: 'iternetMoveVertex.png'
            },
            {
              title: "Rimuovi vertice strada",
              tooltype: '',
              icon: 'iternetDeleteVertex.png'
            },
            {
              title: "Sposta strada",
              tooltype: 'movefeature',
              icon: 'iternetMoveLine.png'
            },
            {
              title: "Rimuovi strada",
              tooltype: 'deletefeature',
              icon: 'iternetDeleteLine.png'
            },
            {
              title: "Edita attributi",
              tooltype: 'editattributes',
              icon: 'editAttributes.png'
            }
          ]
        }
      ],
      savebtnlabel: "Salva"
    }
  },
  methods: {
    toggleEditing: function(){
      Service.togglEditing();
    },
    saveEdits: function(){
      Service.saveEdits();
    },
    toggleEditTool: function(layerCode,toolType){
      if (toolType == ''){
        return;
      }
      if (this.state.editingOn) {
        Service.toggleEditTool(layerCode,toolType);
      }
    },
    editingtoolbtnToggled: function(layerCode,toolType){
      return (this.state.editingToolRunning.layerCode == layerCode && this.state.editingToolRunning.toolType == toolType);
    },
    editingtoolbtnEnabled: function(tool){
      return tool.tooltype != '';
    }
  },
  computed: {
    editingbtnlabel: function(){
      return this.state.editingOn ? "Termina editing" : "Avvia editing";
    },
    editingbtnEnabled: function(){
      return (this.state.editingEnabled || this.state.editingOn) ? "" : "disabled";
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
