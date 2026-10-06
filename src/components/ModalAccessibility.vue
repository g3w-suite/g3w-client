<!--
  @file
  @since v4.2
-->
<template>
  <dialog
    id           = "modal-accessibility"
    ref          = "dialog"
    style        = "width: 80vw; max-width: 540px;"
    :aria-label  = "$t('Accessibility')"
  >
    <form method = "dialog">
      <header class = "a11y-header">
        <h3>{{ $t('Accessibility') }}</h3>
        <button
          type         = "button"
          class        = "a11y-close"
          :aria-label  = "$t('close')"
          @click       = "close"
        >
          <i class = "fas fa-times" aria-hidden = "true"></i>
        </button>
      </header>

      <fieldset class = "a11y-section">
        <legend hidden>{{ $t('Appearance') }}</legend>
        <label class = "a11y-toggle">
          <span>{{ $t('High contrast') }}</span>
          <input
            type      = "checkbox"
            :checked  = "high_contrast"
            @change   = "setHighContrast($event.target.checked)"
            :disabled = "is_localhost"
          />
        </label>
        <label class = "a11y-row">
          <span>{{ $t('Theme color') }}</span>
          <input
            type    = "color"
            :value  = "theme_color"
            @input  = "setColor('skin_color', '--skin-color', $event.target.value)"
          />
        </label>
        <label class = "a11y-row">
          <span>{{ $t('Primary color') }}</span>
          <input
            type    = "color"
            :value  = "primary_color"
            @input  = "setColor('skin_primary', '--skin-primary', $event.target.value)"
          />
        </label>
        <label class = "a11y-toggle">
          <span>{{ $t('Reduce animations') }}</span>
          <input
            type     = "checkbox"
            :checked = "reduced_motion"
            @change  = "setReducedMotion($event.target.checked)"
          />
        </label>
        <label class = "a11y-toggle">
          <span>{{ $t('Open sidebar on startup') }}</span>
          <input
            type     = "checkbox"
            :checked = "sidebar_open_at_startup"
            @change  = "setSidebarOpenAtStartup($event.target.checked)"
          />
        </label>
      </fieldset>

      <menu class = "a11y-footer">
        <button type = "button" class = "btn btn-default" @click = "resetPreferences">{{ $t('Restore defaults') }}</button>
        <button type = "submit" class = "btn btn-primary">{{ $t('close') }}</button>
      </menu>
    </form>
  </dialog>
</template>

<script>
import ApplicationState from 'g3w-state';
import GUI              from 'g3w-app';

const HIGH_CONTRAST_COLORS = {
  skin_color:   '#212c31',
  skin_primary: '#0056b3',
};

export default {

  name: 'modal-accessibility',

  data() {
    const css = getComputedStyle(document.body);
    const storedSidebarPreference = window.localStorage.getItem('map:preferences:sidebar_open');
    const storedMotionPreference = window.localStorage.getItem('map:accessibility:reduced_motion');
    const default_sidebar_open = !document.body.classList.contains('sidebar-collapse');
    let sidebar_open_at_startup = default_sidebar_open;
    let reduced_motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (null !== storedSidebarPreference) {
      sidebar_open_at_startup = 'true' === storedSidebarPreference;
    }
    if (null !== storedMotionPreference) {
      reduced_motion = 'true' === storedMotionPreference;
    }

    return {
      ApplicationState,
      is_localhost: 'localhost' === window.location.hostname,
      skin_color: window.localStorage.getItem('map:preferences:skin_color') || css.getPropertyValue('--skin-color').trim() || '#95ad36',
      skin_primary: window.localStorage.getItem('map:preferences:skin_primary') || css.getPropertyValue('--skin-primary').trim() || '#4091bf',
      default_sidebar_open,
      sidebar_open_at_startup,
      high_contrast: 'true' === window.localStorage.getItem('map:accessibility:high_contrast'),
      reduced_motion,
    };
  },

  computed: {

    theme_color() {
      if (this.high_contrast) {
        return HIGH_CONTRAST_COLORS.skin_color;
      }
      return this.skin_color;
    },

    primary_color() {
      if (this.high_contrast) {
        return HIGH_CONTRAST_COLORS.skin_primary;
      }
      return this.skin_primary;
    },

  },

  mounted() {
    if (window.localStorage.getItem('map:preferences:skin_color')) {
      this.applyColor('--skin-color', this.skin_color);
    }
    if (window.localStorage.getItem('map:preferences:skin_primary')) {
      this.applyColor('--skin-primary', this.skin_primary);
    }
    this.setReducedMotionClass(this.reduced_motion);

    const storedSidebarPreference = window.localStorage.getItem('map:preferences:sidebar_open');
    if ('true' === storedSidebarPreference) {
      GUI.showSidebar();
    }
    if ('false' === storedSidebarPreference) {
      GUI.hideSidebar();
    }

    if (this.high_contrast) {
      this.applyHighContrast(true);
    }
  },

  methods: {

    show() {
      this.$refs.dialog.showModal();
    },

    close() {
      this.$refs.dialog.close();
    },

    resetPreferences() {
      [
        'map:preferences:skin_color',
        'map:preferences:skin_primary',
        'map:preferences:sidebar_open',
        'map:accessibility:high_contrast',
        'map:accessibility:reduced_motion',
      ].forEach(preferenceKey => window.localStorage.removeItem(preferenceKey));

      document.body.style.removeProperty('--skin-color');
      document.body.style.removeProperty('--skin-primary');
      document.querySelector('.navbar')?.style.removeProperty('--skin-color');
      document.querySelector('.navbar')?.style.removeProperty('--skin-primary');

      const css = getComputedStyle(document.body);
      this.skin_color = css.getPropertyValue('--skin-color').trim();
      this.skin_primary = css.getPropertyValue('--skin-primary').trim();
      this.high_contrast = false;
      this.reduced_motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.setReducedMotionClass(this.reduced_motion);
      this.sidebar_open_at_startup = this.default_sidebar_open;

      if (this.default_sidebar_open) {
        GUI.showSidebar();
      }
      if (!this.default_sidebar_open) {
        GUI.hideSidebar();
      }
    },

    setColor(stateKey, cssVariable, color) {
      this.disableHighContrast();
      this[stateKey] = color;
      window.localStorage.setItem(`map:preferences:${stateKey}`, color);
      this.applyColor(cssVariable, color);
    },

    applyColor(cssVariable, color) {
      document.body.style.setProperty(cssVariable, color);
      document.querySelector('.navbar')?.style.setProperty(cssVariable, color);
    },

    setHighContrast(enabled) {
      this.high_contrast = enabled;
      window.localStorage.setItem('map:accessibility:high_contrast', enabled);
      this.applyHighContrast(enabled);
    },

    applyHighContrast(enabled) {
      if (enabled) {
        this.applyColor('--skin-color', HIGH_CONTRAST_COLORS.skin_color);
        this.applyColor('--skin-primary', HIGH_CONTRAST_COLORS.skin_primary);
        return;
      }
      this.applyColor('--skin-color', this.skin_color);
      this.applyColor('--skin-primary', this.skin_primary);
    },

    disableHighContrast() {
      if (!this.high_contrast) {
        return;
      }
      this.setHighContrast(false);
    },

    setSidebarOpenAtStartup(open) {
      this.sidebar_open_at_startup = open;
      window.localStorage.setItem('map:preferences:sidebar_open', open);
    },

    setReducedMotion(reduced) {
      this.reduced_motion = reduced;
      window.localStorage.setItem('map:accessibility:reduced_motion', reduced);
      this.setReducedMotionClass(reduced);
    },

    setReducedMotionClass(reduced) {
      document.body.classList.toggle('reduced-motion', reduced);
    },

  },

};
</script>

<style scoped>
dialog                        { border: 0; border-radius: 3px; padding: 18px; }
.a11y-header                  { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #ddd; }
.a11y-header h3               { margin: 0; font-size: 1.3em; font-weight: 700; }
.a11y-close                   { width: 32px; height: 32px; border: 0; background: transparent; color: inherit; }
.a11y-section                 { padding: 14px 0; border-bottom: 1px solid #ddd; }
.a11y-section legend          { margin: 0 0 10px; border: 0; font-size: 1.05em; font-weight: 700; }
.a11y-row, .a11y-toggle       { display: flex; align-items: center; justify-content: space-between; gap: 16px; width: 100%; margin: 0; font-weight: 400; }
.a11y-section > label + label { margin-top: 12px; }
.a11y-row input[type="color"] { width: 44px; height: 32px; padding: 2px; border: 1px solid #999; cursor: pointer; }
.a11y-toggle input            { flex: 0 0 auto; }
.a11y-footer                  { display: flex; justify-content: space-between; margin: 14px 0 0; padding: 0; }
</style>

<style>
body.reduced-motion *,
body.reduced-motion *::before,
body.reduced-motion *::after {
  animation: none !important;
  scroll-behavior: auto !important;
  transition: none !important;
}
</style>