var webpack = require("webpack");

module.exports = {



    entry: {
        pagina1: "./src/main",// "./src/pagina1/index2", "./src/pagina1/index_css"],
    },
    output: {
        path: './dist/js/',
        filename: "app.bundle.js"
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
            { test: /\.html$/,   loader: "html"}
        ]
    },

    plugins: [

        //new webpack.optimize.CommonsChunkPlugin('common.js'),
    ],

};