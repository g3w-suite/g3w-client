<template>
  <div>
    <h4 @click="showHideInfo" class="layer_header skin-color-dark" data-toggle="collapse" :data-target="'#' + state.id">
      <i class="layer-header-icon" :class="[isSpatial ? g3wtemplate.font['map']: g3wtemplate.font['table']]" aria-hidden="true"></i>
      <span class="layer-name">{{ state.name }}</span>
      <span class="open-close" :class="[show ? g3wtemplate.getFontClass('minus') :g3wtemplate.getFontClass('plus')]"></span>
    </h4>
    <div :id="state.id" class="collapse">
      <ul class="metadata-nav-tabs nav nav-tabs" role="tablist">
        <li role="presentation" class="active spatial-tab">
          <a v-t="'sdk.metadata.groups.layers.groups.general'" :href="'#layer_general_' + state.id" aria-controls="general" role="tab" data-toggle="tab">
          </a>
        </li>
        <li v-if="isSpatial" role="presentation" class="spatial-tab">
          <a v-t="'sdk.metadata.groups.layers.groups.spatial'" :href="'#layer_spatial_' + state.id" aria-controls="profile" role="tab" data-toggle="tab">
          </a>
        </li>
      </ul>
      <!-- Tab panes -->
      <div class="tab-content">
        <div role="tabpanel" class="tab-pane active" :id="'layer_general_' + state.id">
          <div class="container-fluid">
            <div v-if="findAttributeFormMetadataAttribute('title')" class="row">
              <div v-t="'sdk.metadata.groups.layers.fields.subfields.title'" class="col-md-2 col-sm-12 metadata-label skin-color-dark"></div>
              <div class="col-md-10 col-sm-12 value">{{ state.metadata.title }}</div>
            </div>
            <div v-if="findMetadataAttribute('name')" class="row">
              <div v-t="'sdk.metadata.groups.layers.fields.subfields.name'" class="col-md-2 col-sm-12 metadata-label skin-color-dark"></div>
              <div class="col-md-10 col-sm-12 value">{{ state.name }}</div>
            </div>
            <div v-if="findMetadataAttribute('source')" class="row metadata-layer-source">
              <div v-t="'sdk.metadata.groups.layers.fields.subfields.source'" class="col-md-2 col-sm-12 metadata-label skin-color-dark metadata-layer-source-value-key"></div>
              <div class="col-md-10 col-sm-12 value metadata-layer-source-value">{{ state.source.type }}</div>
            </div>
            <div v-if="findAttributeFormMetadataAttribute('abstract')" class="row">
              <div v-t="'sdk.metadata.groups.layers.fields.subfields.abstract'" class="col-md-2 col-sm-12 metadata-label skin-color-dark"></div>
              <div class="col-md-10 col-sm-12 value">{{ state.metadata.abstract[0] }}</div>
            </div>
            <div v-if="findAttributeFormMetadataAttribute('keywords')" class="row">
              <div v-t="'sdk.metadata.groups.layers.fields.subfields.keywords'" class="col-md-2 col-sm-12 metadata-label skin-color-dark"></div>
              <div class="col-md-10 col-sm-12 value">
                <div>{{ state.metadata.keywords.join(', ') }}</div>
              </div>
            </div>
            <div v-if="findAttributeFormMetadataAttribute('metadataurl') && state.metadata.metadataurl.onlineresources" class="row">
              <div v-t="'sdk.metadata.groups.layers.fields.subfields.metadataurl'" class="col-md-2 col-sm-12 metadata-label skin-color-dark"></div>
              <div class="col-md-10 col-sm-12 value">
                <a :href="state.metadata.metadataurl.onlineresources">{{ state.metadata.metadataurl.onlineresources }}</a>
              </div>
            </div>
            <div v-if="findAttributeFormMetadataAttribute('dataurl') && state.metadata.dataurl.onlineresources" class="row">
              <div v-t="'sdk.metadata.groups.layers.fields.subfields.dataurl'" class="col-md-2 col-sm-12 metadata-label skin-color-dark"></div>
              <div class="col-md-10 col-sm-12 value">
                <a :href="state.metadata.dataurl.onlineresources">{{ state.metadata.dataurl.onlineresources }}</a>
              </div>
            </div>
            <div v-if="findAttributeFormMetadataAttribute('attributes')" class="row">
              <div v-t="'sdk.metadata.groups.layers.fields.subfields.attributes'" class="col-md-2 col-sm-12 metadata-label skin-color-dark"></div>
              <div class="col-md-10 col-sm-12 value" style="overflow: auto;">
                <table class="table table-striped" style="background-color: #eeeeee !important">
                  <thead>
                  <tr>
                    <th v-for="(value, header) in state.metadata.attributes[0]">{{ header }}</th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-for="attribute in state.metadata.attributes">
                    <td v-for="(value, header) in attribute">{{ value }}</td>
                  </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div role="tabpanel" class="tab-pane" :id="'layer_spatial_'+state.id">
          <div class="container-fluid">
            <div v-if="findMetadataAttribute('crs')" class="row">
              <div v-t="'sdk.metadata.groups.layers.fields.subfields.crs'" class="col-sm-3 metadata-label skin-color-dark"></div>
              <div class="col-sm-9 value">{{ state.crs }}</div>
            </div>
            <div v-if="findMetadataAttribute('geometrytype')" class="row">
              <div v-t="'sdk.metadata.groups.layers.fields.subfields.geometrytype'" class="col-sm-3 metadata-label skin-color-dark"></div>
              <div class="col-sm-9 value">{{ state.geometrytype }}</div>
            </div>
            <div v-if="findMetadataAttribute('bbox')" class="row">
              <div v-t="'sdk.metadata.groups.layers.fields.subfields.bbox'" class="col-sm-3 metadata-label skin-color-dark"></div>
              <div class="col-sm-9 value">
                <p v-for="(value, key) in state.bbox">
                  <span style="font-weight: bold; margin-right: 5px;">{{ key }}</span>
                  <span>{{ value}}</span>
                </p>
              </div>
            </div>
            <div v-if="findAttributeFormMetadataAttribute('crs')" class="row">
              <div v-t="'sdk.metadata.groups.layers.fields.subfields.crs'" class="col-sm-3 metadata-label skin-color-dark"></div>
              <div class="col-sm-9 value">
                <div v-for="crs in state.metadata.crs">
                  <span>{{ crs }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import MetadataMixin from '../metadatamixin';

  export default {
    name: "layer",
    mixins: [MetadataMixin],
    props: {
      state: {}
    },
    data() {
      return {
        show: false
      }
    },
    computed: {
      isSpatial() {
        return this.state.geometrytype != 'NoGeometry'
      }
    },
    methods: {
      showHideInfo() {
        this.show = !this.show;
      },
    },
    mounted() {}
  }
</script>

<style scoped>
  .layer_header {
    border-bottom: 1px solid rgba(226, 226, 226, 0.3);
    padding: 5px;
    margin-bottom: 0;
    cursor: pointer;
  }
  .layer-name {
    font-weight: bold;
  }
  .layer-header-icon {
    margin-right: 10px;
  }
  .layer_header span.open-close {
    position: absolute;
    right: 5px;
  }
  .metadata-label {
    font-weight: bold;
    font-size: 1.1em;
  }
  .row {
    margin-bottom: 10px;
  }
  .nav-tabs { border-bottom: 0 solid #DDD; }
  .nav-tabs > li.active > a, .nav-tabs > li.active > a:focus, .nav-tabs > li.active > a:hover { border-width: 0; }
  .nav-tabs > li > a { border: none; color: #aeaeae; }
  .nav-tabs > li.active > a, .nav-tabs > li > a:hover { border: none; background: transparent; }
  .nav-tabs > li > a::after { content: ""; height: 2px; position: absolute; width: 100%; left: 0px; bottom: -1px; transition: all 250ms ease 0s; transform: scale(0); }
  .nav-tabs > li.active > a::after, .nav-tabs > li:hover > a::after { transform: scale(1); }
  .tab-nav > li > a::after { background: #21527d none repeat scroll 0% 0%; color: #fff; }
  .tab-pane { padding: 15px 0; }
  .tab-content {
    padding: 5px;
    background-color: #e4e4e4;
    overflow: auto;
  }
  .spatial-tab{
    font-weight: bold;
  }

</style>
