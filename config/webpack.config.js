var webpack = require("webpack");

module.exports = {



    entry: {
        pagina1: "./src/app/index.js",// "./src/pagina1/index2", "./src/pagina1/index_css"],
    },
    output: {
        path: './dist/js/',
        filename: "app.min.js"
        //chunkFilename: "[id].chunk.js"
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
            { test: /\.png$/, loader: "file?name=img/[name].[ext]" },
            //html loader
            { test: /\.html$/,   loader: "html"},
            ///uglify
//            {
//            // I want to uglify with mangling only app files, not thirdparty libs
//            {
//                test: /.*\/src\/.*\.js$/,
//                //exclude: /.spec.js/, // excluding .spec files
//                loader: "uglify"
//            }
        ]
    },

    plugins: [
        //plugin uglify
        new webpack.optimize.UglifyJsPlugin()
        //new webpack.optimize.CommonsChunkPlugin('common.js'),

    ],

};