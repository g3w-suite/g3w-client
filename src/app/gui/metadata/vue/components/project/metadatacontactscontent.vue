<template>
  <div>
    <div class="col-sm-3 metadata-label skin-color-dark" v-t="data.label"></div>
    <div class="col-sm-9 value" style="margin-top:0">
      <div v-for="(value, key) in data.value">
        <div class="row">
          <div class="col-sm-3 metadata-contact-label">
            <i class="contact-icon" :class="iconsClass[key]" aria-hidden="true"></i>
            <span v-t="'sdk.metadata.groups.general.fields.subfields.contactinformation.' + key"></span>
          </div>
          <div class="col-sm-9">
            <template v-if="key === 'personprimary'" >
              <div v-for="(subvalue, key) in value">
                <span v-t="'sdk.metadata.groups.general.fields.subfields.contactinformation.' + key" class="metadata-contact-label"></span>
                <span>{{ subvalue }}</span>
              </div>
            </template>
            <div v-else>
              <template v-if="key === 'contactelectronicmailaddress'">
                <a :href="'mailto:' + sanitizeValue(value)">{{sanitizeValue(value)}}</a>
              </template>
              <template v-else>
                {{ sanitizeValue(value) }}
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    name: "metadatacontatcs",
    props: {
      data: {}
    },
    data() {
      return {
        iconsClass: {
          contactelectronicmailaddress: this.g3wtemplate.getFontClass("mail"),
          personprimary: this.g3wtemplate.getFontClass("user"),
          contactvoicetelephone: this.g3wtemplate.getFontClass("mobile")
        }
      }
    },
    methods: {
      sanitizeValue(value) {
        if (value !== null && value !== undefined) {
          if (typeof value === 'object') {
            value = Object.keys(value).length ? value : '';
          } else if (Array.isArray(value)) {
            value = value.length ? value : '';
          }
        }
        return value;
      },
      geti18n(key) {

      }
    }
  }
</script>

<style scoped>
  .metadata-label {
    font-weight: bold;
    font-size: 1.1em;
  }
  .metadata-contact-label {
    font-weight: bold;
  }
  .contact-icon {
    margin-right: 3px;
  }
  .row {
    margin-bottom: 5px;
  }
</style>
