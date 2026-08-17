module.exports = {
	apps: [
		{
			name: 'personalai',
			cwd: './server',
			script: 'start.cjs',
			interpreter: 'node',
			watch: false,
			autorestart: true,
			max_restarts: 10,
		},
	],
}
