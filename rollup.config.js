// Based on example: https://github.com/rollup/rollup-starter-lib
import { eslint } from "rollup-plugin-eslint";
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import babel from '@rollup/plugin-babel'
import { terser } from 'rollup-plugin-terser'
import pkg from './package.json'
import css from 'rollup-plugin-css-only'

export default [
  {
    input: './src/css.js',
    output: {
			name: 'brcatlas',
			file: pkg.browser,
			format: 'umd'
		},
		plugins: [
      css({ output: null })
		]
  },
	// browser-friendly UMD builds
  {
		input: 'index.js',
		output: {
			name: 'brcatlas',
			file: pkg.browser,
			format: 'umd'
		},
		plugins: [
      eslint(),
			resolve(), // so Rollup can find node libs
      commonjs(), // so Rollup can convert CommonJS modules to an ES modules
      babel({ babelHelpers: 'bundled', presets: ['@babel/preset-env'] }),
		]
  },
  {
		input: 'index.js',
		output: {
			name: 'brcatlas',
			file: pkg.browsermin,
			format: 'umd'
		},
		plugins: [
      eslint(),
			resolve(), 
      commonjs(),
      babel({ babelHelpers: 'bundled', presets: ['@babel/preset-env'] }),
      terser()
		]
  }
]