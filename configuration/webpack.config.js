var webpack = require("webpack");

module.exports = {

    resolve: {
        alias: {
            //librerie javascript js
            jquery_ui : './src/common/jquery-ui/jquery-ui.min.js',
            //css
            jquery_ui_css : "./src/common/jquery-ui/jquery-ui.min.css"

        }
    },

    entry: {
        pagina1: "./src/pagina1/index",// "./src/pagina1/index2", "./src/pagina1/index_css"],
        pagina2: "./src/pagina2/index",
        vendors: ["jquery_ui", "jquery_ui_css"]
    },
    output: {
        path: './dist/js/',
        filename: "[name].js",
        chunkFilename: "[id].chunk.js"
    },


    module: {
        loaders: [
            //server per convertore file less in css e succesivamente imposrtato come tag style
            {
                test: /\.less$/,
                loader: "style!css!less"
            },
            {
                test: /\.css$/,
                loader: "style!css"
            },

            //file immagini, etc..
            { test: /\.(woff|woff2)$/,               loader: "file?name=bootstrap/[name].[ext]" },
            { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,    loader: "file?name=bootstrap/[name].[ext]" },
            { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,    loader: "file?name=bootstrap/[name].[ext]" },
            { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,    loader: "file?name=bootstrap/[name].[ext]" },
            { test: /\.png$/,    loader: "file?name=img/[name].[ext]" }
        ]
    },

    plugins: [
        //this plugin webpack can prepend var $ = require(“jquery”) every time it encounters the global $ identifier or JQuery (es bootstrap)
        new webpack.ProvidePlugin({
            jQuery: "jquery",
            $: "jquery",
            'window.jQuery': "jquery",
        }),
        new webpack.optimize.CommonsChunkPlugin('common.js'),
    ],
    watch : false
};