const os = require("os");
const path = require("path");

// macOS: use wrapper script that invokes SF via bundled JRE + JAR
// Wrapper lives at ~/.local/bin/ScreamingFrogSEOSpider and does:
//   exec "$SF_JRE" -jar "$SF_JAR" "$@"
const SF_WRAPPER = path.join(os.homedir(), ".local/bin/ScreamingFrogSEOSpider");

module.exports = {
  cliPath: SF_WRAPPER,
  outputDir: "./exports",
  licenseKey: process.env.SF_LICENSE_KEY
};
