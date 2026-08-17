// Windows-friendly PM2 entry (avoids npm.cmd spawn issues)
require('tsx/cjs/api').register()
require('./src/index.ts')
