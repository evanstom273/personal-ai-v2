import { execSync } from 'node:child_process'

// Vercel only needs the Vite frontend — skip laptop backend install in cloud builds
if (process.env.VERCEL) {
	console.log('Skipping server postinstall on Vercel')
	process.exit(0)
}

execSync('npm install --prefix server', { stdio: 'inherit' })
