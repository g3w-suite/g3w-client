<template>
    <i v-if="!isMobile()" :class="g3wtemplate.getFontClass('resize-h')" style="font-weight: bold; font-size: 1.4em; padding: 5px; cursor: pointer" class="action button skin-color-dark" @click="resize"></i>
</template>

<script>
    const GUI = require('gui/gui');
    export default {
        name: 'h-resize',
        methods:{
            resize(){
                const perc = GUI.getContentPercentage();
                const currentPercentage = perc == 100 ? GUI.getNot100ContentPercentage() : 100;
                GUI.setContentPercentage(currentPercentage);
                this.$emit('h_size_change', currentPercentage)
            },
        }
    };
</script>
