/*
 * @Author: RongWei
 * @Date: 2021-09-13 20:31:07
 * @LastEditors: RongWei
 * @LastEditTime: 2021-11-25 17:04:37
 * @Description: file content
 */
const { generateTheme } = require("@maycur/theme-generator");
const path = require("path");
const fs = require("fs");

class MKThemePlugin {
  constructor(options) {
    const defaulOptions = {
      varFile: path.join(__dirname, "../../src/styles/variables.less"),
      antdStylesDir: path.join(__dirname, "../../node_modules/antd/lib"),
      stylesDir: path.join(__dirname, "../../src/styles/antd"),
      themeVariables: ["@primary-color"],
      indexFileName: "index.html",
      generateOnce: false,
      lessUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/less.js/2.7.2/less.min.js",
      publicPath: "",
      async: false
    };
    this.options = Object.assign(defaulOptions, options);
    this.generated = false;
  }

  apply(compiler) {
    const options = this.options;
    const { webpack } = compiler;
    const { sources, Compilation } = webpack;
    const { RawSource } = webpack.sources;
    const pluginName = 'MKThemePlugin';
    let hasColorLess = false;
    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      compilation.hooks.processAssets.tap({
        name: pluginName,
        stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
      }, (assets) => {
        const less = `
      <link rel="stylesheet/less" type="text/css" href="${options.publicPath}/color.less" />
      <script>
        window.less = {
          async: ${options.async},
          env: 'production',
          javascriptEnabled: true
        };
      </script>
      <script type="text/javascript" src="${options.lessUrl}"></script>
    `;
        if (
          options.indexFileName &&
          options.indexFileName in compilation.assets
        ) {
          const file = compilation.getAsset(options.indexFileName);
          compilation.updateAsset(
            options.indexFileName,
            new sources.RawSource(file.source.source().replace(less, "").replace(/<body(.*?)>/gi, `<body$1>${less}`))
          );
        }
      })

      compilation.hooks.processAssets.tapAsync({
        name: `${pluginName}-generateless`,
        stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
      }, (assets, callback) => {
        if (hasColorLess) {
          if (typeof callback === 'function') callback();
        } else {
          generateTheme(options)
            .then(css => {
              if (options.generateOnce) {
                this.colors = css;
              }
              hasColorLess = true;
              compilation.emitAsset(
                'color.less',
                new RawSource(css),
              )
              if (typeof callback === 'function') callback();
            })
            .catch(err => {
              if (typeof callback === 'function') callback(err);
            });
        }

      })
    });
    // compiler.hooks.emit.tap(pluginName, (compilation) => {           
    // const less = `
    //   <link rel="stylesheet/less" type="text/css" href="${options.publicPath}/color.less" />
    //   <script>
    //     window.less = {
    //       async: ${options.async},
    //       env: 'production',
    //       javascriptEnabled: true
    //     };
    //   </script>
    //   <script type="text/javascript" src="${options.lessUrl}"></script>
    // `;
    // if (
    //   options.indexFileName &&
    //   options.indexFileName in compilation.assets
    // ) {
    //   const file = compilation.getAsset(options.indexFileName);
    //   compilation.updateAsset(
    //     options.indexFileName,
    //     new sources.RawSource(file.source.source().replace(less, "").replace(/<body(.*?)>/gi, `<body$1>${less}`))
    //   );
    // }
    // })

    // compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
    //   // Tapping to the assets processing pipeline on a specific stage.
    //   compilation.hooks.processAssets.tapAsync({
    //     name: pluginName,
    //     stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
    //   }, (assets, callback) => {
    //     if (hasColorLess) {
    //       if (typeof callback === 'function') callback();
    //     } else {
    //       generateTheme(options)
    //         .then(css => {
    //           if (options.generateOnce) {
    //             this.colors = css;
    //           }
    //           hasColorLess = true;
    //           compilation.emitAsset(
    //             'color.less',
    //             new RawSource(css),
    //           )
    //           if (typeof callback === 'function') callback();
    //         })
    //         .catch(err => {
    //           if (typeof callback === 'function') callback(err);
    //         });
    //     }

    //   })
    // })

    // compiler.plugin("emit", function (compilation, callback) {
    //   const less = `
    // <link rel="stylesheet/less" type="text/css" href="${options.publicPath}/color.less" />
    // <script>
    //   window.less = {
    //     async: ${options.async},
    //     env: 'production',
    //     javascriptEnabled: true
    //   };
    // </script>
    // <script type="text/javascript" src="${options.lessUrl}"></script>
    //     `;
    //   if (
    //     options.indexFileName &&
    //     options.indexFileName in compilation.assets
    //   ) {
    //     const index = compilation.assets[options.indexFileName];
    //     let content = index.source();

    //     if (!content.match(/\/color\.less/g)) {
    //       index.source = () =>
    //         content.replace(less, "").replace(/<body(.*?)>/gi, `<body$1>${less}`);
    //       content = index.source();
    //       index.size = () => content.length;
    //     }
    //   }
    //   if (options.generateOnce && this.colors) {
    //     compilation.assets["color.less"] = {
    //       source: () => this.colors,
    //       size: () => this.colors.length
    //     };
    //     return callback();
    //   }
    //   generateTheme(options)
    //     .then(css => {
    //       if (options.generateOnce) {
    //         this.colors = css;
    //       }
    //       compilation.assets["color.less"] = {
    //         source: () => css,
    //         size: () => css.length
    //       };
    //       callback();
    //     })
    //     .catch(err => {
    //       callback(err);
    //     });
    // });

    compiler.hooks && compiler.hooks.done.tapPromise(
      this.constructor.name,
      (stats) => {
        return new Promise((resolve, reject) => {
          const insertStr = `
          (function () {
            var head = document.getElementsByTagName('head')[0];
            var link = document.createElement('link');
            link.type = 'text/css';
            link.rel = 'stylesheet/less';
            link.href = '${options.publicPath}/color.less';
            head.appendChild(link);

            window.less = {
              async: false,
              env: 'production',
              javascriptEnabled: true
            };
            var scriptEle = document.createElement('script');
            scriptEle.type = 'text/javascript';
            scriptEle.src = '${options.lessUrl}';
            head.appendChild(scriptEle);
          })();
          `;
          fs.writeFile('dist/themeScript.js', insertStr, 'utf8', error => {
            resolve();
          });
        });
      }
    );
  }
}

module.exports = MKThemePlugin;
