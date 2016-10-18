var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var ApplicationService = require('core/applicationservice');
var ApiService = require('core/apiservice');
var GUI = require('gui/gui.js');
var ComponentsRegistry = require('gui/componentsregistry');

/*

var ApiService = require('g3w/core/apiservice');
var ProjectsRegistry = require('g3w/core/projectsregistry');
var ProjectService = require('g3w/core/projectservice').ProjectService;
var MapService = require('gui/map/mapservice');
*/
//var MapQueryService = require('g3w/core/mapqueryservice');

//var TplView = require('./view/tplview');
//var TplQueryResultsPanel = require('./tplqueryresults');

// http://webgis.at-bus.it/cgi-bin/FotoPaline?id=7772&sub=4&thumbnail=1

var ResponseManager = require('./tplqueryresults');

function getDay(date,reverse){
  var dd = date.getDate();
  var mm = date.getMonth()+1; //January is 0!
  var yyyy = date.getFullYear();

  if (reverse) {
    return yyyy+"-"+mm+"-"+dd;
  }
  return dd+"-"+mm+"-"+yyyy;
}

var TplService = function(){
  var self = this;
  this.lotti = [];
  this.day = null;
  this.lottoId = null;
  this.mapService = null;
  this.config = {};

  this._responseManager = null;

  this.setters = {
    setDay: function(day){
      this.day = day;
    }
  };
  base(this);

  this.preinit = function(config) {
    var d = $.Deferred();
    this.config = config;
    this.urls = this.config.server.urls;

    var startDay = config.tpl.startDay ? config.tpl.startDay : getDay(new Date());
    this.setDay(startDay);

    this._getLotti().
    then(function(){
        d.resolve();
    });
    return d.promise();
  };

  this.init = function() {
    var self = this;
    var d = $.Deferred();

    this.mapService = GUI.getComponent('map').getService();

    this.mapService.onbefore('setupViewer',function(){
      var layersParams = {
        DAY: '2015-10-10',
        RADIUS: 10, // per aumentare il buffer delle getFeatureInfo di Mapserver,
        LOTTO: self.lottoId
      };
      self.mapService.setLayersExtraParams(layersParams);
    });

    //GUI.setPrimaryView('content');
    //GUI.showContent('Contenuto iniziale');
    GUI.showContentAside('Contenuto iniziale');

    var queryResultsService = GUI.getComponent('queryresults').getService();
    queryResultsService.onbeforeasync('setLayersData',function(layersData,queryResultsService,next){
      self._responseManager = new ResponseManager();
      self._responseManager.preprocessLayersData(layersData);

      var query = queryResultsService.state.query;
      ApiService.get('VARIANTIQUERYMAP',{
        params: {
          day: self.day,
          lotto: self.lottoId,
          coords: query.coordinates.join(','),
          res: query.resolution
        }
      })
      .then(function(response){
        if (response.length) {
          var layerObj = self._responseManager.parse(response,'varianti');
          layersData.unshift(layerObj);
        }
      })
      .always(function(){
        next(layersData);
      })
    });

    queryResultsService.onafter('setLayersData',function(layersData){
      self._responseManager.postprocessLayersData(layersData);
    });

    queryResultsService.onafter('postRender',function(queryResultsEl){
      self._responseManager.createResultsHeaders(queryResultsEl);
    });

    queryResultsService.onbefore('addActionsForLayers',function(actions){
      if (actions) {
        if (actions['paline']) {
          actions['paline'].push({
            id: 'fermatadetail',
            class: 'glyphicon glyphicon-time',
            hint: 'Visualizza i transiti di questa fermata',
            route: "tpl/fermate?id={id}&day="+self.day
          })
        }
        if (actions['varianti']) {
          actions['varianti'].push({
            id: 'variantedetail',
            class: 'glyphicon glyphicon-time',
            hint: 'Visualizza le corse di questa variante',
            route: "tpl/variante?id={id}&day="+self.day
          })
        }
      }
    });

    var routerService = ApplicationService.getRouterService();
    routerService.addRoute('tpl/fermate/{?query}',function(query){
      try {
        var TransitiFermataPage = require('./pages/transitiferamata');
        var tfp = new TransitiFermataPage();
        GUI.pushContentAside(tfp,'Transiti fermata '+query.id,100);
        tfp.loadContent(query.id,query.day);
      }
      catch (e) {
        //
      }
    });

    routerService.addRoute('tpl/variante/{?query}',function(query){
      try {
        var CorseVariantePage = require('./pages/corsevariante');
        var cvp = new CorseVariantePage();
        GUI.pushContentAside(cvp,'Corse variante '+query.id,100);
        cvp.loadContent(query.id,query.day);
      }
      catch (e) {
        //
      }
    });

    routerService.addRoute('map{?query}',function(query){
      GUI.showMapAside(30);
      var mapService = ComponentsRegistry.getComponent('map').getService();
      var coords = query.point.split(',');
      mapService.highlightGeometry(new ol.geom.Point(coords));
    });

    this._setupControls();
  };

  this._getLotti = function(){
    var d = $.Deferred();
    var self = this;
    var apiLotti = this.urls.api +'/'+ this.urls.apiEndpoints.LOTTI;
    $.get(apiLotti,function(lotti){
      self.lotti = lotti;
      self.lottoId = self.config.tpl.startLotto || lotti[0].id;
      d.resolve();
    });
    return d.promise()
  };

  this._setupControls = function(){
    self._setupMapDateControl();
    self._setupSelezioneLottoMapControl();
  };

  this._setupMapDateControl = function() {
    var datePickerControl = $('<div class="tpl-datecontrol"><input type="text" class="form-control tpl-datepicker"></div>');
    $('#catalog').prepend(datePickerControl);
    $.datepicker.setDefaults($.datepicker.regional["it"]);
    var datePicker = $('.tpl-datepicker');
    datePicker.datepicker({
      'dateFormat' : 'dd-mm-yy',
      'autoclose': true,
      'onSelect': function(date,inst){
        if (date) {
          self.day = date;
          var layersParams = {
            DAY: date
          };
          Vue.nextTick(function() {
            self.mapService.setLayersExtraParams(layersParams,true);
            console.log(0)
          });
        }
      }
    });
    datePicker.datepicker("setDate", self.day);
  };

  this._setupSelezioneLottoMapControl = function() {
    var lotti = this.lotti;

    var lottoControl = $('<div class="tpl-lottocontrol"><select class="form-control"></select></div>');
    $('.tpl-datecontrol').after(lottoControl);
    var lottiSelect = $('.tpl-lottocontrol > select');
    lottiSelect.change(function(){
      var lottoId = self.lottoId = $( this ).val();
      var layersParams = {
        LOTTO: lottoId
      };
      self.mapService.setLayersExtraParams(layersParams,true);
    });


    _.forEach(lotti,function(lotto){
      var selected = '';
      if (self.config.tpl.startLotto && (lotto.id == self.config.tpl.startLotto)) {
        selected = 'selected';
      }
      var lottoOption = $('<option value="'+lotto.id+'" '+selected+'>'+lotto.denominazione+'</option>');
      lottiSelect.append(lottoOption);
    });
  };
};
inherit(TplService,G3WObject);

module.exports = new TplService();
