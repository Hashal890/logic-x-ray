/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  // Transpile reactflow and its dependencies for Next.js compatibility
  transpilePackages: ["reactflow"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // web-tree-sitter's Emscripten runtime has a Node-only code path (guarded
      // at runtime by its own environment check) that references these core
      // modules. They're never reached in the browser, but webpack still tries
      // to statically resolve them for the client bundle unless stubbed out.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        "fs/promises": false,
        module: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
