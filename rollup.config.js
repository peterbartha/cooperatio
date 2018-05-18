import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';

export default {
  input: 'src/index.ts',
  output: {
    file: 'build/bundle/cooperatio.js',
    format: 'iife',
    name: 'cooperatio'
  },
  plugins: [
    typescript({
      tsconfig: "tsconfig.module.json",
    }),
    resolve({
      // pass custom options to the resolve plugin
      customResolveOptions: {
        moduleDirectory: 'node_modules'
      },
    }),
    commonjs(),
  ]
};
