const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const InlineManifestWebpackPlugin = require('inline-manifest-webpack-plugin')
const autoprefixer = require('autoprefixer')
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const ProgressBarPlugin = require('progress-bar-webpack-plugin')
const WebpackMd5Hash = require('webpack-md5-hash')
const HashedModuleIdsPlugin = require('./HashedModuleIdsPlugin')

const DEV = process.env.NODE_ENV !== 'production';

const config = require('./common.js')
// 辅助函数
const utils = require('./utils');
function resolve(dir) {
    return path.join(__dirname, '..', dir)
}

const fullPath  = utils.fullPath;
const pickFiles = utils.pickFiles;
// 项目根路径
const ROOT_PATH = fullPath('../');
// 项目源码路径
const SRC_PATH =  config.SRC_PATH;
// 产出路径
const DIST_PATH = config.DIST_PATH;

const NODE_MODULES_PATH = config.NODE_MODULES_PATH;

// loaders
const CACHE_PATH = config.CACHE_PATH;

let alias = pickFiles({
    id: /(conf\/[^\/]+).js$/,
    pattern:  `${SRC_PATH}/conf/*.js`
});

// components
// import Alert from 'components/alert';
alias = Object.assign(alias, pickFiles({
    id: /(components\/[^\/]+)/,
    pattern:  `${SRC_PATH}/components/*/index.js`
}));

// reducers
// import reducers from 'reducers/index';
alias = Object.assign(alias, pickFiles({
    id: /(reducers\/[^\/]+).js/,
    pattern:  `${SRC_PATH}/js/reducers/*`
}));

// import filter from 'reducers/index';
alias = Object.assign(alias, pickFiles({
    id: /(filters\/[^\/]+).js/,
    pattern: `${SRC_PATH}/js/filters/*`
}));

// actions
// import actions from 'actions/index';
alias = Object.assign(alias, pickFiles({
    id: /(actions\/[^\/]+).js/,
    pattern: `${SRC_PATH}/js/actions/*`
}));

alias = Object.assign(alias, {
    'react-router':  `${NODE_MODULES_PATH}/react-router/lib/index.js`,
    'react-redux': `${NODE_MODULES_PATH}/react-redux/lib/index.js`,
    'redux': `${NODE_MODULES_PATH}/redux/lib/index.js`,
    'redux-thunk': `${NODE_MODULES_PATH}/redux-thunk/lib/index.js`
});
//插件路径配置
alias = Object.assign(alias, {
    src:SRC_PATH,
    plugin:`${SRC_PATH}/plugin`,
    img:`${SRC_PATH}/img`,
    component:`${ROOT_PATH}/component`,
    js:`${SRC_PATH}/js`,
    pages:`${SRC_PATH}/pages`
});

module.exports = {
    output: {
        path: DIST_PATH,
        filename: 'js/[name].js',
        publicPath: DEV ? config.dev.publicPath : config.server.publicPath,
        chunkFilename: 'js/[name].chunk.js'
    },
    resolve: {
        extensions: ['.js', '.jsx'], // 能够使用户在引入模块时不带扩展
        modules: [resolve("node_modules"), resolve("src")],
        alias: alias
    },
    performance: {
        hints: false // 如果一个资源超过 250kb，webpack 会对此输出一个警告来通知你。 false关闭
    },
    module: {
        strictExportPresence: true, // 文件中如果缺少exports时会直接报错而不是警告
        rules: [// 模块规则（配置 loader、解析器等选项）
            //useEslint
            //eslint-loader
            {
                test: /\.(js|jsx)$/,
                loader:  require.resolve("babel-loader"),
                exclude: [/node_modules/, /src\/plugin/],
                options: {
                    //指定的目录将用来缓存 loader 的执行结果。之后的 webpack 构建，将会尝试读取缓存，来避免在每次执行时，可能产生的、高性能消耗的 Babel 重新编译过程
                    //官方文档中表示设置 cacheDirectory 可将 babel-loader 提速至少两倍
                    cacheDirectory: true,
                    plugins: ['transform-runtime', 'babel-plugin-transform-decorators-legacy'],
                    presets: ['es2015', 'stage-0', 'react']
                }
            },
            {
                test: /\.css$/,
                use: [
                    DEV ? require.resolve('style-loader') : MiniCssExtractPlugin.loader,
                    { loader:  'css-loader' },
                ]
            },
            {
                test: /\.(scss)$/,
                exclude: /node_modules/,
                use: [
                    DEV ? require.resolve('style-loader') : MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            importLoaders: 2
                        }
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            // Necessary for external CSS imports to work
                            // https://github.com/facebookincubator/create-react-app/issues/2677
                            sourceMap: true,
                            ident: 'postcss',
                            plugins: () => [
                                require('postcss-flexbugs-fixes'),
                                autoprefixer({
                                    browsers: [
                                        '>1%',
                                        'last 4 versions',
                                        'not ie < 9',
                                    ],
                                    flexbox: 'no-2009',
                                }),
                            ],
                        },
                    },
                    {
                        loader: 'fast-sass-loader'
                    }
                ]
            },
            {
                test:/\.(png|jpe?g|gif|svg|eot|ttf|woff|woff2)(\?.*)?$/,
                exclude: [/\.(js|jsx|mjs)$/, /\.html$/, /\.json$/],
                loader: 'url-loader',
                options: {
                    limit: 8000,
                    name: 'media/[name].[hash:8].[ext]' //发布到 dist/img 目录下，名称中添加 hash 值，避免缓存
                }
            },
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            filename: 'index.html',
            chunks: ['manifest', 'app', 'lib', 'common'],
            template: DEV ? `${SRC_PATH}/pages/dev.html` : `${SRC_PATH}/pages/app.html`,
            minify: {
                collapseWhitespace: true,
                collapseInlineTagWhitespace: true,
                removeRedundantAttributes: true,
                removeEmptyAttributes: true,
                removeScriptTypeAttributes: true,
                removeStyleLinkTypeAttributes: true,
                removeComments: true
            }
        }),
        new webpack.DefinePlugin({ //用于定义在编译过程中使用的全局变量，常用来定义 process.env 用来区分开发环境和生产环境
            "isProduction": true,
        }),
        new webpack.ProvidePlugin({
            "$":"n-zepto"
        }),
        new ProgressBarPlugin()
    ]
}