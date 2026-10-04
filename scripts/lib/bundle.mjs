import * as esbuild from 'esbuild';

/**
 * Bundles an entry module into a single classic script. The output is not minified:
 * the live-build console shows it to visitors, so it should stay readable.
 *
 * @param {string} entryPoint
 * @param {Record<string, unknown>} virtualModules modules generated at build time,
 *   imported as `virtual:<name>`
 */
export async function bundle(entryPoint, virtualModules = {}) {
  const result = await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    format: 'iife',
    target: 'es2022',
    charset: 'utf8',
    legalComments: 'inline',
    loader: { '.css': 'text' },
    plugins: [
      {
        name: 'virtual-modules',
        setup(build) {
          build.onResolve({ filter: /^virtual:/ }, (args) => ({
            path: args.path,
            namespace: 'virtual',
          }));
          build.onLoad({ filter: /.*/, namespace: 'virtual' }, (args) => {
            const name = args.path.slice('virtual:'.length);
            if (!(name in virtualModules)) throw new Error(`Unknown virtual module: ${args.path}`);
            return { contents: JSON.stringify(virtualModules[name]), loader: 'json' };
          });
        },
      },
    ],
  });
  return result.outputFiles[0].text;
}
