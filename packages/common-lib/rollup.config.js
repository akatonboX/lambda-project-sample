import nodeResolve  from 'rollup-plugin-node-resolve'
import commonjs     from 'rollup-plugin-commonjs'
import sourcemaps from "rollup-plugin-sourcemaps";
import del from "rollup-plugin-delete";
import typescript from '@rollup/plugin-typescript';

const conf = {
  input: "src/index.ts",
  output: {
    file: "./lib/index.js",
    format: "cjs",
    exports: "auto",
    // sourcemap: true,
    sourcemap: false,
    assetFileNames: "[name]-[hash][extname]",
  },
  // this externelizes react to prevent rollup from compiling it
  plugins: [
    // these are babel comfigurations
    typescript({ 
			tsconfig: './tsconfig.production.json',
		}),
    nodeResolve({ 
      jsnext: true, // npmモジュールをnode_modulesから読み込む
      browser: true,
      preferBuiltins: false,
    }), 
    commonjs(), // CommonJSモジュールをES6に変換
    // this adds sourcemaps
    // sourcemaps(),
    del({ targets: "lib/*" }),//出力先をクリア
  ],
  external: [//axiosは、CommonJs形式で作られているため、external(およびpackage.jsonのpeerDependencies)に含めると、React側のWebPackがCommonJs形式をアセットに変換し、require('axios')を""のような文字列にしてしまう。このため、externalから除外し、package.jsonのdependenciesに格納する。
    "@types/lodash",
    "lodash"
  ]
};

export default conf;
