module.exports = {
	apps: [
		{
			name: 'personalai',
			cwd: './server',
			script: 'npm.cmd',
			args: 'run start',
			interpreter: 'none',
			watch: false,
			autorestart: true,
			max_restarts: 10,
		},
	],
}
