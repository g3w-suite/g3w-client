<!--
  @file
  @since 3.11.0
-->

<template>
  <!-- Modal -->
  <dialog
    v-if     = "show"
    id       = "modal-login"
  >
    <div class = "modal-dialog" style="height: 60vh;">
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
  </dialog>
</template>

<script>

export default {

  /** @since 3.11.0 */
  name: 'modal-login',
  data() {
    return {
      show: false,
    }
  },

  computed: {

    login_url() {
      return window.initConfig.user.login_url;
    },

  },

  methods: {

     onIframeLoaded(e) {
      const iframe = this.$refs.login_iframe?.contentWindow?.g3wsdk?.core?.ApplicationState;
      if (iframe?.user?.logout_url) {
        this.show = false;
        window.location.reload();
      }
    },

  },

  async mounted() {
    document.body.appendChild(this.$el);
    await this.$nextTick();
    this.show = true;
  }

};
</script>