/*
 * @Author: RongWei
 * @Date: 2021-09-13 20:31:07
 * @LastEditors: RongWei
 * @LastEditTime: 2021-12-21 16:56:10
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
        "https://cmimg.maycur.com/dt/static/less.min.js",
      publicPath: "",
      async: false
    };
    this.options = Object.assign(defaulOptions, options);
    this.generated = false;
  }

  apply(compiler) {
    const options = this.options;
    compiler.plugin("emit", function (compilation, callback) {
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
        const index = compilation.assets[options.indexFileName];
        let content = index.source();

        if (!content.match(/\/color\.less/g)) {
          index.source = () =>
            content.replace(less, "").replace(/<body(.*?)>/gi, `<body$1>${less}`);
          content = index.source();
          index.size = () => content.length;
        }
      }
      if (options.generateOnce && this.colors) {
        compilation.assets["color.less"] = {
          source: () => this.colors,
          size: () => this.colors.length
        };
        return callback();
      }
      generateTheme(options)
        .then(css => {
          if (options.generateOnce) {
            this.colors = css;
          }
          compilation.assets["color.less"] = {
            source: () => css,
            size: () => css.length
          };
          callback();
        })
        .catch(err => {
          callback(err);
        });
    });

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
