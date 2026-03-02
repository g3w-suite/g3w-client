<!--
  @file
  @since 3.11.0
-->

<template>
  <dialog
    v-if        = "show"
    id          = "modal-login"
    style       = "width: min(85vw, 600px);"
    :aria-label = "$t('sign_in')"
  >
    <form method = "dialog" style = "height: 60vh; padding: 0;">
      <button value = "cancel" style = "border: none;line-height: 1;font-weight: 700;font-size: 25px;background: none;position: absolute;inset: 0 0 auto auto;width: 40px;height: 40px;">&times;</button>
      <div style = "height: 100%; background: #d2d6de; display: grid; grid-template-areas: 'iframe'; place-items: center;">
        <span style = "grid-area: iframe;" v-t = "'Loading ...'"></span>
        <iframe
          loading = "lazy"
          style   = "border: 0; width: 100%; height: 100%; grid-area: iframe;"
          :src    = "login_url"
          @load   = "onIframeLoaded"
          ref     = "login_iframe"
          title   = "login form"
        ></iframe>
      </div>
    </form>
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
      return 'localhost:3000' === window.location.host
        ? (new URL(`/#/${window.g3w.state.language}/login`, initConfig.baseurl)).toString()
        : window.initConfig.user.login_url;
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