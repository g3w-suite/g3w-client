var t = require('i18n/i18n.service').t;
var MapService = require('g3w/core/mapservice');
var RouterService = require('g3w/core/router');
var GUI = require('g3w/gui/gui.js');
var ViewportService = require('g3w/gui/view/viewport');
require('g3w/gui/geocoding/geocoding');
require('g3w/gui/vue.directives');
var layout = require('./layout/layout');
var SidebarService = require('./js/sidebar').SidebarService;
var FloatbarService = require('./js/floatbar').FloatbarService;
var ApplicationService = require('lib/sdk/core/application');
var BaseUI = Vue.extend({
    ready: function(){
      /* start to render LayoutManager layout */
      layout.loading(false);
      layout.setup();
      $("body").toggleClass("fixed");
      layout.layout.fixSidebar();
      //Fix the problem with right sidebar and layout boxed
      layout.pushMenu.expandOnHover();
      layout.layout.activate();
      layout.controlSidebar._fix($(".control-sidebar-bg"));
      layout.controlSidebar._fix($(".control-sidebar"));

      FloatbarService.init(layout);


      var controlsidebarEl = layout.options.controlSidebarOptions.selector;

      function setFloatBarMaxHeight(){
        $(controlsidebarEl).css('max-height',$(window).innerHeight());
        $('.g3w-sidebarpanel').height($(window).innerHeight()-$('.main-header').innerHeight());
      }
      setFloatBarMaxHeight();

      function setModalHeight(){
        $('#g3w-modal-overlay').height($(window).innerHeight());
      }

      $(window).resize(function() {
        setFloatBarMaxHeight();
        setModalHeight();
      });

      ViewportService.setView(AppService.getDefaultView());

          // definisco (implemento) i metodi dell'API globale della GUI
      GUI.getResourcesUrl = function(){ return AppService.config.resourcesurl };
      // mostra un pannello nella floatbar
      GUI.showForm = _.bind(FloatbarService.showPanel,FloatbarService);
      GUI.closeForm = _.bind(FloatbarService.closePanel,FloatbarService);
      GUI.showListing = _.bind(FloatbarService.showPanel,FloatbarService);
      GUI.closeListing = _.bind(FloatbarService.closePanel,FloatbarService);
      GUI.hideListing = _.bind(FloatbarService.hidePanel,FloatbarService);
      // mostra un pannello nella sidebar
      GUI.showPanel = _.bind(SidebarService.showPanel,SidebarService);

      GUI.setModal = _.bind(AppService.showModalOverlay,AppService);

      GUI.showSpinner = function(options){
        var container = options.container || 'body';
        var id = options.id || 'loadspinner';
        var where = options.where || 'prepend'; // append | prepend
        var style = options.style || '';
        var transparent = options.transparent ? 'background-color: transparent' : '';
        if (!$("#"+id).length) {
          $(container)[where].call($(container),'<div id="'+id+'" class="spinner-wrapper '+style+'" style="'+transparent+'"><div class="spinner '+style+'"></div></div>');
        }
      };

      GUI.hideSpinner = function(id){
        $("#"+id).remove();
      }

      GUI.ready();

      RouterService.initRoute();

      $(MapService.getViewport()).prepend('<div id="map-spinner" style="position:absolute;right:0px;"></div>')

      MapService.on('loadstart',function(){
        GUI.showSpinner({
          container: $('#map-spinner'),
          id: 'maploadspinner',
          style: 'blue'
        });
      });

      MapService.on('loadend',function(){
        GUI.hideSpinner('maploadspinner');
      });
    }
});

module.exports = BaseUI;
