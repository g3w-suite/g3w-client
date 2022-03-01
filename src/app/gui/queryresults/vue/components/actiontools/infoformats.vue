<template>
    <select v-if="infoformats.length" class="skin-color" v-select2="'infoformat'" :select2_value="infoformat" :search="false">
        <option v-for="infoformat in infoformats" :key="infoformat" :value="infoformat">{{infoformat}}</option>
    </select>
</template>

<script>
    const CatalogLayersStoresRegistry = require('core/catalog/cataloglayersstoresregistry');
    const parser = require('core/parsers/vector/parser');
    const {getAlphanumericPropertiesFromFeature} = require('core/utils/geo');
    const GUI = require('gui/gui');
    export default {
        name: 'Infoformats',
        props: {
            layer: {
                type: Object,
                required: true
            }
        },
        data(){
          return {
              infoformat: this.layer.infoformat
          }
        },
        computed: {
            infoformats(){
                return this.layer.infoformats || [];
            }
        },
        methods: {
          async reloadLayerDataWithChangedContentType(contenttype){
              const queryService = GUI.getService('queryresults');
              this.layer.loading = true;
              try {
                const data = await this.projectLayer.changeProxyDataAndReload({
                    headers: {
                        'Content-Type': contenttype
                      },
                    params:{
                        INFO_FORMAT: contenttype
                    }
                });
                if (contenttype === 'text/gml') {
                    this.layer.rawdata = null;
                    await this.$nextTick();
                    const parserGML = parser.get({
                        type: 'gml'
                    });
                    const features = parserGML({
                        data: data,
                        layer: this.projectLayer
                    });

                    features.forEach(feature => {
                        const {id:fid, geometry, properties:attributes} = queryService.getFeaturePropertiesAndGeometry(feature);
                        // in case of starting raw data (html) need to sett attributes to visualized on result
                        if (this.layer.attributes.length === 0) {
                            this.layer.hasgeometry = !!geometry;
                            // need to setActionsForLayers to visualize eventually actions
                            queryService.setActionsForLayers([this.layer]);
                            getAlphanumericPropertiesFromFeature(attributes).forEach(name =>{
                                this.layer.attributes.push({
                                    name,
                                    label:name,
                                    show: true
                                })
                            })
                        }
                        const queryFeature = {
                            id: fid,
                            attributes,
                            geometry,
                            show: true
                        };
                        queryFeature.show = true;
                        this.layer.features.push(queryFeature);
                    });
                } else {
                    this.layer.features.splice(0);
                    await this.$nextTick();
                    this.layer.rawdata = data;
                }
                this.layer.infoformat = contenttype;
                this.projectLayer.setInfoFormat(this.layer.infoformat);
              } catch(err){}
              this.layer.loading = false;
          }
        },
        watch: {
          'infoformat'(value){
              this.reloadLayerDataWithChangedContentType(value);
          }
        },
        created(){
            this.projectLayer = CatalogLayersStoresRegistry.getLayerById(this.layer.id);
        },
        beforeDestroy(){
            this.projectLayer.clearLastProxyData();
            this.projectLayer = null;
        }
    };
</script>
