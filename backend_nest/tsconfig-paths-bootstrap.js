const tsConfigPaths = require("tsconfig-paths");
const path = require("path");

tsConfigPaths.register({
  baseUrl: path.resolve(__dirname, "dist"),
  paths: {
    "@/*": ["*"],
  },
});
