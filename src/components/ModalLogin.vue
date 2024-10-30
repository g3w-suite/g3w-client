<!--
  @file
  @since 3.11.0
-->

<template>
  <!-- Modal -->
  <div
    id       = "modal-login"
    class    = "modal fade"
    tabindex = "-1"
    role     = "document"
  >
    <div class = "modal-dialog" style = "height: 60%; width: 60%;">
      <div class = "modal-content" style = "height: 100%; background: #d2d6de; display: grid; grid-template-areas: 'iframe'; place-items: center;">
        <button
          type         = "button"
          class        = "close"
          data-dismiss = "modal"
          style        = "position: absolute;inset: 0 0 auto auto;padding: 10px 15px;"
        >&times;</button>
        <span style="grid-area: iframe;">Loading..</span>
        <iframe
          loading = "lazy"
          style   = "border: 0; width: 100%; height: 100%; grid-area: iframe;"
          :src    = "login_url"
          @load   = "onIframeLoaded"
          ref     = "login_iframe"
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script>

export default {

  /** @since 3.11.0 */
  name: 'modal-login',

  computed: {

    login_url() {
      return window.initConfig.user.login_url;
    },

  },

  methods: {

     onIframeLoaded(e) {
      const iframe = this.$refs.login_iframe.contentWindow.g3wsdk && this.$refs.login_iframe.contentWindow.g3wsdk.core.ApplicationState;
      if (iframe && iframe.user && iframe.user.logout_url) {
        window.location.reload();
      }
    },

  },

};
</script>