const libx = require('libx.js');
libx.gulp = require("libx.js/node/gulp");
const path = require('path');
const argv = require('yargs').argv;

let projconfig;

(async ()=>{ /* init */
	var dir = process.cwd(); //__dirname
	var src = dir + '/src';
	var dest = dir + '/build';
	
	var secretsFile = src + '/project-secrets.json';
	var secretsKey = (argv.secret || process.env.FUSER_SECRET_KEY || "123").toString();
	// libx.log.info('!!! Secret key is: ', secretsKey);

	// var fs = require('fs');
	if (libx.gulp.getArgs().noDelete == null) { 
		libx.log.info('test: cleaning build folder: ', dest);
		await libx.gulp.delete(dest);
	}

	/*
	// await libx.gulp.copy(['./test.js', 'libx.gulp.js'], dest, libx.gulp.middlewares.minify );
	*/ 

	if (argv.secretsLock) {
		try {
			libx.node.decryptFile(src + '/project-secrets.json', secretsKey);
			throw "Cannot encrypt file, it's not decrypted!";
		} catch(ex) { 
			// Only encrypt when can't decrypt the file (meaning it's unencrypted, otherwise we'll encrypt encrypted file)
			libx.node.encryptFile(secretsFile, secretsKey);
			libx.log.info('Secrets file locked successfully');
		}
		return;
	}
	
	if (argv.secretsUnlock) {
		try {
			libx.node.decryptFile(src + '/project-secrets.json', secretsKey);
			libx.log.info('Secrets file unlocked successfully');
		} catch(ex) { libx.log.warning('Could not decrypt secrets', ex); }
		return;
	}
	
	projconfig = libx.getProjectConfig(src, secretsKey);
	libx.gulp.projconfig = projconfig;

	var projName = projconfig.projectName.replace('-','_')

	libx.gulp.config.workdir = src;
	libx.gulp.config.devServer.port = projconfig.private.debugPort;
	libx.gulp.config.devServer.host = projconfig.private.host;
	libx.gulp.config.devServer.livePort = projconfig.private.livereloadPort;
	libx.gulp.config.devServer.useHttps = projconfig.private.debugIsSecure;
	// libx.gulp.config.isProd = projconfig.;

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
		console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
		console.error(err.stack, err);
		console.log("Node NOT Exiting...", err.stack, err);
		console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
	});

	// build:
	var build = async () => {
		libx.log.info('build: starting');

		if (shouldServe && shouldServeLibs && !libx.gulp.config.isProd) {
			var res = libx.gulp.exec([
				'cd ../base-publish', 
				'http-server --cors --gzip -p 3888'
			], true);
		}

		// await libx.gulp.copy(src + '/views/views-templates.js', dest + '/views/', null, shouldWatch);

		var p1 = libx.gulp.copy([src + '/**/*.js', `!${src}/views/*`], dest + '/resources/', ()=>[
			// libx.gulp.middlewares.ifProd(libx.gulp.middlewares.babelify()),
			libx.gulp.middlewares.ifProd(libx.gulp.middlewares.minify()),
			// libx.gulp.middlewares.renameFunc(f=>f.basename='xx')
		], shouldWatch); 

		var p2 = libx.gulp.copy([src + '/**/*.less'], dest + '/resources/', ()=>[
			libx.gulp.middlewares.less(),
			libx.gulp.middlewares.ifProd(libx.gulp.middlewares.minifyLess()),
			libx.gulp.middlewares.renameFunc(f=>f.extname = ".min.css"),
		], shouldWatch, { useSourceDir: true });

		var p3 = libx.gulp.copy(src + '/views/**/*.pug', dest + '/views', ()=>[
			libx.gulp.middlewares.pug(),
			libx.gulp.middlewares.template('views'),
			// libx.gulp.middlewares.triggerChange(src + '/index.pug'),
		], shouldWatch, { useSourceDir: true });

		var p4 = libx.gulp.copy(src + '/components/**/*.pug', dest + '/resources/components', ()=>[
			libx.gulp.middlewares.pug(),
			libx.gulp.middlewares.write(dest + '/resources/components'),
			libx.gulp.middlewares.template('components'),
		], shouldWatch);

		var p5 = libx.gulp.copy(src + '/imgs/**/*', dest + '/resources/imgs/', null, shouldWatch);

		var p6 = libx.gulp.copy('./browserify/**/*.js', dest + '/resources/scripts/', ()=>[
			libx.gulp.middlewares.browserify({ bare: false }),
			libx.gulp.middlewares.ifProd(libx.gulp.middlewares.minify()),
			// libx.gulp.middlewares.concat('browserified.js'),
			// libx.gulp.middlewares.rename('browserified.js'),
			// libx.gulp.triggerChange(src + '/index.pug'),
			// libx.gulp.middlewares.liveReload(),
		], shouldWatch);
		
		await Promise.all([p1, p2, p3, p4 , p5, p6]);

		libx.gulp.copy('./node_modules/libx.fuser/dist/fonts/**/*', dest + '/resources/fonts/lib/', null, false, { debug: false });
		libx.gulp.copy('./node_modules/ng-inline-edit/dist/ng-inline-edit.js', dest + '/resources/scripts/lib/', null, false);
		// libx.gulp.copy('./node_modules/libx.fuser/src/scripts/lib/angular-inview.js', dest + '/resources/scripts/lib/', null, false);
		
		var pIndex = libx.gulp.copy([src + '/index.pug'], dest, ()=>[
			libx.gulp.middlewares.pug(),
			libx.gulp.middlewares.localize('./', dest), //, true),
			libx.gulp.middlewares.ifProd(libx.gulp.middlewares.usemin('build/')),
		], shouldWatch, { base: src });
		
		await pIndex;

		if (shouldWatch) {
			libx.gulp.watchSimple([src + '/_content.pug'], (ev, p)=>{
				if (ev.type != 'changed') return;
				libx.gulp.triggerChange(src + '/index.pug');
			});
		}

		if (shouldWatch && libx.gulp.config.isProd) {
			libx.gulp.watchSimple([dest + '/**/*'], (ev, p)=>{
				if (ev.type != 'changed') return;
				libx.gulp.triggerChange(src + '/index.pug');
			});
		}

		if (shouldWatch) {
			libx.gulp.watchSimple([process.cwd() + '/./node_modules/libx.fuser/dist/**/*.js'], (ev, p)=>{
				if (ev.type != 'changed') return;
				libx.gulp.delete('./lib-cache');
				libx.gulp.triggerChange(src + '/index.pug');
			});
		}

		await libx.gulp.copy([src + '/project.json'], './api/build', null, shouldWatch);
		await libx.gulp.copy([src + '/project-secrets.json'], './api/build', null, shouldWatch);

		libx.log.info('build: done');
	}

	var clearLibs = async ()=> {
		await libx.gulp.delete('./lib-cache');
	}

	var api = {};
	api.runlocal = async () => {
		await libx.gulp.copy([src + '/project.json'], './api/build', null, true);
		await libx.gulp.copy([src + '/project-secrets.json'], './api/build', null, true);
		var res = await libx.gulp.exec([
			'cd api', 
			'source $(brew --prefix nvm)/nvm.sh; nvm use v8.12.0',
			'firebase use {0} --token {1}'.format(projconfig.firebaseProjectName, projconfig.private.firebaseToken), 
			'firebase serve -p {0} --only functions --token {1}'.format(projconfig.private.firebaseFunctionsPort, projconfig.private.firebaseToken)
		], true);
	}
	api.deploy = async () => {
		try {
			await libx.gulp.copy([src + '/project.json'], './api/build');
			await libx.gulp.copy([src + '/project-secrets.json'], './api/build');

			var res = await libx.gulp.exec([
				'cd api', 
				// 'npm install', 
				'firebase functions:config:set {0}.fuser_secret_key="{1}"'.format(projName, secretsKey),
				'firebase deploy -P {0} --only functions:{2}{3} --token "{1}"'.format(projconfig.firebaseProjectName, projconfig.private.firebaseToken, projName, argv.specificFunction ? ('-' + argv.specificFunction) : '')
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
		libx.log.info('test: serving...');
		libx.gulp.serve(dest, null, [dest + '/**/*.*']);
	}

	libx.log.info('done')
})();
