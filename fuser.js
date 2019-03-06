const infra = require('libx.js');
infra.node = require('libx.js/node');
const path = require('path');
const argv = require('yargs').argv;

let projconfig;

(async ()=>{ /* init */
	var dir = process.cwd(); //__dirname
	var src = dir + '/src';
	var dest = dir + '/build';
	
	var secretsFile = src + '/project-secrets.json';
	var secretsKey = (argv.secret || process.env.FUSER_SECRET_KEY || "123").toString();
	// infra.log.info('!!! Secret key is: ', secretsKey);

	// var fs = require('fs');
	if (infra.gulp.getArgs().noDelete == null) { 
		infra.log.info('test: cleaning build folder: ', dest);
		await infra.gulp.delete(dest);
	}

	/*
	// await infra.gulp.copy(['./test.js', 'infra.gulp.js'], dest, infra.gulp.middlewares.minify );
	*/

	if (argv.secretsLock) {
		try {
			infra.node.decryptFile(src + '/project-secrets.json', secretsKey);
			throw "Cannot encrypt file, it's not decrypted!";
		} catch(ex) { 
			// Only encrypt when can't decrypt the file (meaning it's unencrypted, otherwise we'll encrypt encrypted file)
			infra.node.encryptFile(secretsFile, secretsKey);
			infra.log.info('Secrets file locked successfully');
		}
		return;
	}
	
	if (argv.secretsUnlock) {
		try {
			infra.node.decryptFile(src + '/project-secrets.json', secretsKey);
			infra.log.info('Secrets file unlocked successfully');
		} catch(ex) { infra.log.warning('Could not decrypt secrets', ex); }
		return;
	}
	
	projconfig = infra.gulp.readConfig(src + '/project.json', secretsKey);

	infra.gulp.config.workdir = src;
	infra.gulp.config.devServer.port = projconfig.private.debugPort;
	infra.gulp.config.devServer.host = projconfig.private.host;
	infra.gulp.config.devServer.livePort = projconfig.private.livereloadPort;
	infra.gulp.config.devServer.useHttps = projconfig.private.debugIsSecure;
	// infra.gulp.config.isProd = projconfig.;

	if (argv.develop) {
		argv.watch = true;
		argv.serve = true;
		argv.build = true;
		argv.clearLibs = true;
	}

	var shouldWatch = argv.watch || false;
	var shouldServe= argv.serve || shouldWatch;
	var shouldServeLibs = argv.libs || false;

	process.on('uncaughtException', function (err) {
		console.error(err.stack, err);
		console.log("Node NOT Exiting...");
	});

	// build:
	var build = async () => {
		infra.log.info('build: starting');

		if (shouldServe && shouldServeLibs && !infra.gulp.config.isProd) {
			var res = infra.gulp.exec([
				'cd ../base-publish', 
				'http-server --cors --gzip -p 3888'
			], true);
		}

		// await infra.gulp.copy(src + '/views/views-templates.js', dest + '/views/', null, shouldWatch);

		var p1 = infra.gulp.copy([src + '/**/*.js', `!${src}/views/*`], dest + '/resources/', ()=>[
			// infra.gulp.middlewares.ifProd(infra.gulp.middlewares.babelify()),
			infra.gulp.middlewares.ifProd(infra.gulp.middlewares.minify()),
			// infra.gulp.middlewares.renameFunc(f=>f.basename='xx')
		], shouldWatch); 

		var p2 = infra.gulp.copy([src + '/**/*.less'], dest + '/resources/', ()=>[
			infra.gulp.middlewares.less(),
			infra.gulp.middlewares.ifProd(infra.gulp.middlewares.minifyLess()),
			infra.gulp.middlewares.renameFunc(f=>f.extname = ".min.css")
		], shouldWatch);

		var p3 = infra.gulp.copy(src + '/views/**/*.pug', dest + '/views', ()=>[
			infra.gulp.middlewares.pug(),
			infra.gulp.middlewares.template('views'),
			// infra.gulp.middlewares.triggerChange(src + '/index.pug'),
		], shouldWatch, { useSourceDir: true });

		var p4 = infra.gulp.copy(src + '/components/**/*.pug', dest + '/resources/components', ()=>[
			infra.gulp.middlewares.pug(),
			infra.gulp.middlewares.write(dest + '/resources/components'),
			infra.gulp.middlewares.template('components'),
		], shouldWatch);

		var p5 = infra.gulp.copy(src + '/imgs/**/*', dest + '/resources/imgs/', null, shouldWatch);

		var p6 = infra.gulp.copy('./node/**/*.js', dest + '/resources/scripts/', ()=>[
			infra.gulp.middlewares.browserify({ bare: false }),
			infra.gulp.middlewares.ifProd(infra.gulp.middlewares.minify()),
		], shouldWatch);
		
		await Promise.all([p1, p2, p3, p4 , p5, p6]);

		infra.gulp.copy('./node_modules/libx.fuser/dist/fonts/**/*', dest + '/resources/fonts/lib/', null, false, { debug: false });
		infra.gulp.copy('./node_modules/ng-inline-edit/dist/ng-inline-edit.js', dest + '/resources/scripts/lib/', null, false);
		// infra.gulp.copy('./node_modules/libx.fuser/src/scripts/lib/angular-inview.js', dest + '/resources/scripts/lib/', null, false);
		
		var pIndex = infra.gulp.copy([src + '/index.pug'], dest, ()=>[
			infra.gulp.middlewares.pug(),
			infra.gulp.middlewares.localize('./', dest), //, true),
			infra.gulp.middlewares.ifProd(infra.gulp.middlewares.usemin('build/')),
		], shouldWatch, { base: src });
		
		await pIndex;

		if (shouldWatch) {
			infra.gulp.watchSimple([src + '/_content.pug'], (ev, p)=>{
				if (ev.type != 'changed') return;
				infra.gulp.triggerChange(src + '/index.pug');
			});
		}

		if (shouldWatch && infra.gulp.config.isProd) {
			infra.gulp.watchSimple([dest + '/**/*'], (ev, p)=>{
				if (ev.type != 'changed') return;
				infra.gulp.triggerChange(src + '/index.pug');
			});
		}

		if (shouldWatch) {
			infra.gulp.watchSimple([process.cwd() + '/./node_modules/libx.fuser/dist/**/*.js'], (ev, p)=>{
				if (ev.type != 'changed') return;
				infra.gulp.delete('./lib-cache');
				infra.gulp.triggerChange(src + '/index.pug');
			});
		}

		infra.log.info('build: done');
	}

	var clearLibs = async ()=> {
		await infra.gulp.delete('./lib-cache');
	}

	var api = {};
	api.runlocal = async () => {
		await infra.gulp.copy([src + '/project.json'], './api/build', null, true);
		await infra.gulp.copy([src + '/project-secrets.json'], './api/build', null, true);
		var res = await infra.gulp.exec([
			'cd api', 
			'source $(brew --prefix nvm)/nvm.sh; nvm use v8.12.0',
			'firebase use {0} --token {1}'.format(projconfig.firebaseProjectName, projconfig.private.firebaseToken), 
			'firebase serve -p {0} --only functions --token {1}'.format(projconfig.private.firebaseFunctionsPort, projconfig.private.firebaseToken)
		], true);
	}
	api.deploy = async () => {
		try {
			await infra.gulp.copy([src + '/project.json'], './api/build');
			await infra.gulp.copy([src + '/project-secrets.json'], './api/build');

			var res = await infra.gulp.exec([
				'cd api', 
				'npm install', 
				'firebase deploy -P {0} --only functions:api2 --token "{1}"'.format(projconfig.firebaseProjectName, projconfig.private.firebaseToken)
			], true);
		} catch (ex) {
			console.log('error: ', ex);
		}
	}

	if (argv.clearLibs) await clearLibs();
	if (argv.build) await build();
	if (argv.apiRun) api.runlocal();
	if (argv.apiDeploy) api.deploy();

	if (shouldServe) {
		infra.log.info('test: serving...');
		infra.gulp.serve(dest, null, [dest + '/**/*.*']);
	}

	infra.log.info('done')
})();
