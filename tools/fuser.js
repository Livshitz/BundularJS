// BundularJS

// This file is intended to be copied into a project that has installed bundularjs.
// Run this to install bundularjs: `npm install --save bundularjs`
// Grab latest fuser.js: `curl -O -L https://raw.githubusercontent.com/Livshitz/bundularjs/master/tools/fuser.js`

const libx = require('libx.js');
libx.node = require('libx.js/node');
libx.gulp = require('libx.js/node/gulp');

// libx.log.v('projconfig: ', libx.gulp.projconfig, libx.shuffle([1,2,3,4]));
// libx.log.v(libx.node.args.env);

(async ()=>{
	var secret = libx.node.args.secret || process.env.FUSER_SECRET_KEY;

	var modes = {
		devenv: async ()=> {
			libx.log.v('starting devenv');

			// libx.js files changed -> bundularjs pulls those files and builds the `dist` folder ->
			// clear libs cache -> rebuild index.pug
			libx.gulp.watchSimple(['./node_modules/libx.js/**/*.js', '!./node_modules/libx.js/node_modules/**'], (ev, p)=>{
				if (ev.type != 'changed') return;
				libx.log.v('change! ', ev, p)
				// libx.gulp.exec(['node ./node_modules/bundularjs/build-libs.js'], true);
				libx.throttle(()=>{
					libx.gulp.triggerChange('browserify/libx.js');
				}, 100)();
			});

			var res = await libx.gulp.exec([
				// 'node ./node_modules/bundularjs/build-libs.js',
				`node ./node_modules/bundularjs/modules/fuser.js --build --serve --watch --clearLibs --secret=${secret} ${libx.node.args.api ? ' --api-run' : ''} ${libx.node.args.env ? '--env='+libx.node.args.env:'' }`, 
			], true);

			
			// libx.log.v('res: ', res);
		},
		build: async ()=> {
			await libx.gulp.exec([
				'node ./node_modules/bundularjs/modules/fuser.js --build --clearLibs --env=prod --secret=' + secret,
			], true);
		},
		linkLibx: async ()=> {
			var res = await libx.gulp.exec([
				'npm link bundularjs', 
				'npm link libx.js', 
			], true);
		},
		api_deploy: async ()=> {
			var res = await libx.gulp.exec([
				'node ./node_modules/bundularjs/modules/fuser.js --api-deploy', 
			], true);
		},
		update: async ()=> {
			var res = await libx.gulp.exec([
				'curl -O -L https://raw.githubusercontent.com/Livshitz/bundularjs/master/tools/fuser.js', 
			], true);
		},
	};

	if (libx.node.args.apiDeploy) {
		modes.api_deploy();
	} else if (libx.node.args.build) {
		modes.build();
	} else if (libx.node.args.dev) { 
		modes.devenv();
	} else if (libx.node.args.linkLibx) {
		modes.linkLibx();
	} else if (libx.node.args.update) {
		modes.update();
	} else {
		modes.devenv();
	}

})();