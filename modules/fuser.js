const libx = require('libx.js');
libx.bundler = require("libx.js/node/bundler");
libx.node = require("libx.js/node");
const path = require('path');
const fs = require('fs');
const argv = require('yargs').argv;

let projconfig;

(async ()=>{ /* init */ 
	var api = {};

	var dir = process.cwd(); //__dirname
	var src = dir + '/src';
	var dest = dir + '/build';
	
	var secretsFile = src + '/project-secrets.json';
	var secretsFileOpen = src + '/project-secrets-open.json';
	var secretsFileEmpty = src + '/project-secrets-Empty.json';
	var secretsKey = (argv.secret || process.env.FUSER_SECRET_KEY || "123").toString();
	// libx.log.info('!!! Secret key is: ', secretsKey);

	// var fs = require('fs');
	
	/*
	// await libx.bundler.copy(['./test.js', 'libx.bundler.js'], dest, libx.bundler.middlewares.minify );
	*/
	
	var copyProjectConfigToApi = async (shouldWatch)=> {
		await libx.bundler.copy([src + '/project.json'], './api/build', null, shouldWatch);
		await libx.bundler.copy([src + '/project-secrets.json'], './api/build', null, shouldWatch);
	}

	api.secretsLock = ()=>{
		if (!fs.existsSync(secretsFileOpen) && fs.existsSync(secretsFile)) {
			libx.log.w('SecretsLock: did not find decrypted file but has encrypted one, will decrypt...');
			libx.node.decryptFile(secretsFile, secretsKey, secretsFileOpen);
		}

		libx.node.encryptFile(secretsFileOpen, secretsKey, secretsFile);
		libx.log.info('Secrets file locked successfully');
	}
	api.secretsUnlock = ()=>{
		try {
			libx.node.decryptFile(secretsFile, secretsKey, secretsFileOpen);
			libx.log.info('Secrets file unlocked successfully');
		} catch(ex) { libx.log.warning('Could not decrypt secrets', ex); }
	}
	api.secretsEmpty = ()=>{
		libx.node.decryptFile(secretsFile, secretsKey, secretsFileOpen);
		var content = fs.readFileSync(secretsFileOpen);
		var obj = JSON.parse(content);
		var empty = libx.makeEmpty(obj);
		fs.writeFileSync(secretsFileEmpty, libx.jsonify(empty));

		libx.log.info('Empty secrets file was wrote successfully ', secretsFileEmpty);
	}
	
	if (argv.secretsLock) {
		api.secretsLock()
		return;
	}
	
	if (argv.secretsUnlock) {
		api.secretsUnlock();
		return;
	}

	if (argv.secretsEmpty) {
		api.secretsEmpty();
		return;
	}

	
	
	projconfig = libx.node.getProjectConfig(src, secretsKey);
	libx.bundler.projconfig = projconfig;

	var projName = projconfig.projectName.replace('-','_')

	api.deployRules = async () => {
		await copyProjectConfigToApi(false);

		var res = await libx.bundler.exec([
			'cd api', 
			'firebase use {0} --token {1}'.format(projconfig.firebaseProjectName, projconfig.private.firebaseToken), 
			'firebase deploy --only database --token {0}'.format(projconfig.private.firebaseToken),
		], true);
	}
	if (argv.deployRules) {
		api.deployRules();
		return;
	}

	libx.bundler.config.workdir = src;
	libx.bundler.config.devServer.port = projconfig.private.debugPort;
	libx.bundler.config.devServer.host = projconfig.private.host;
	libx.bundler.config.devServer.livePort = projconfig.private.livereloadPort;
	libx.bundler.config.devServer.useHttps = projconfig.private.debugIsSecure;
	// libx.bundler.config.isProd = projconfig.;

	if (argv.develop) {
		argv.watch = true;
		argv.serve = true;
		argv.build = true;
		argv.clearLibs = true;
	}

	if (argv.bare) {
		console.log('-- Using browserify.bare', argv.bare);
	}

	var shouldWatch = argv.watch || false;
	var shouldServe= argv.serve || shouldWatch;
	var shouldServeLibs = argv.libs || false;

	process.on('uncaughtException', function (err) {
		console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
		// console.error(err.stack, err);
		// libx.log.e("uncaughtException: ", err.stack, err)
		console.log("uncaughtException: ", err.stack || err);//, err);
		console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
	});

	// build:
	var build = async () => {
		libx.log.info('build: starting');

		if (libx.bundler.getArgs().noDelete == null) { 
			libx.log.info('test: cleaning build folder: ', dest);
			await libx.bundler.delete(dest);
		}

		api.secretsLock();
		api.secretsEmpty();

		if (shouldServe && shouldServeLibs && !libx.bundler.config.isProd) {
			var res = libx.bundler.exec([
				'cd ../base-publish', 
				'http-server --cors --gzip -p 3888'
			], true);
		}

		// await libx.bundler.copy(src + '/views/views-templates.js', dest + '/views/', null, shouldWatch);

		var p1 = libx.bundler.copy([src + '/resources/**/*.js', `!${src}/views/*`], dest + '/resources/', ()=>[
			// libx.bundler.middlewares.ifProd(libx.bundler.middlewares.babelify()),
			libx.bundler.middlewares.ifProd(libx.bundler.middlewares.minify()),
			// libx.bundler.middlewares.renameFunc(f=>f.basename='xx')
		], shouldWatch); 

		var p2 = libx.bundler.copy([src + '/resources/**/*.less'], dest + '/resources/', ()=>[
			libx.bundler.middlewares.less(),
			libx.bundler.middlewares.ifProd(libx.bundler.middlewares.minifyLess()),
			libx.bundler.middlewares.renameFunc(f=>f.extname = ".min.css"),
		], shouldWatch, { useSourceDir: true });

		var p3 = libx.bundler.copy(src + '/views/**/*.pug', dest + '/views', ()=>[
			libx.bundler.middlewares.pug(),
			libx.bundler.middlewares.template('views'),
			// libx.bundler.middlewares.triggerChange(src + '/index.pug'),
		], shouldWatch, { useSourceDir: true });

		var p4 = libx.bundler.copy(src + '/components/**/*.pug', dest + '/components', ()=>[
			libx.bundler.middlewares.pug(),
			libx.bundler.middlewares.write(dest + '/components'),
			libx.bundler.middlewares.template('components'),
		], shouldWatch);
		var p5 = libx.bundler.copy([src + '/components/**/*.js'], dest + '/components/', ()=>[
			// libx.bundler.middlewares.ifProd(libx.bundler.middlewares.babelify()),
			libx.bundler.middlewares.ifProd(libx.bundler.middlewares.minify()),
			// libx.bundler.middlewares.renameFunc(f=>f.basename='xx')
		], shouldWatch); 

		var p6 = libx.bundler.copy(src + '/resources/imgs/**/*', dest + '/resources/imgs/', null, shouldWatch);

		var p7 = libx.bundler.copy('./browserify/**/*.js', dest + '/resources/scripts/', ()=>[
			libx.bundler.middlewares.browserify({ bare: argv.bare || false }),
			libx.bundler.middlewares.ifProd(libx.bundler.middlewares.minify()),
			// libx.bundler.middlewares.concat('browserified.js'),
			// libx.bundler.middlewares.rename('browserified.js'),
			// libx.bundler.triggerChange(src + '/index.pug'),
			// libx.bundler.middlewares.liveReload(),
		], shouldWatch);
		
		await Promise.all([p1, p2, p3, p4 , p5, p6, p7]);

		libx.bundler.copy('./node_modules/bundularjs/dist/fonts/**/*', dest + '/resources/fonts/lib/', null, false, { debug: false });
		libx.bundler.copy('./node_modules/ng-inline-edit/dist/ng-inline-edit.js', dest + '/resources/scripts/lib/', null, false);
		// libx.bundler.copy('./node_modules/bundularjs/src/scripts/lib/angular-inview.js', dest + '/resources/scripts/lib/', null, false);
		
		var pIndex = libx.bundler.copy([src + '/index.pug'], dest, ()=>[
			libx.bundler.middlewares.pug(),
			libx.bundler.middlewares.localize('./', dest), //, true),
			libx.bundler.middlewares.ifProd(libx.bundler.middlewares.usemin('build/')),
		], shouldWatch, { base: src });
		
		await pIndex;

		if (shouldWatch) {
			libx.bundler.watchSimple([src + '/_content.pug'], (ev, p)=>{
				if (ev.type != 'changed') return;
				libx.bundler.triggerChange(src + '/index.pug');
			});
		}

		if (shouldWatch && libx.bundler.config.isProd) {
			libx.bundler.watchSimple([dest + '/**/*'], (ev, p)=>{
				if (ev.type != 'changed') return;
				libx.bundler.triggerChange(src + '/index.pug');
			});
		}

		if (shouldWatch) {
			libx.bundler.watchSimple([process.cwd() + '/./node_modules/bundularjs/dist/**/*.js'], (ev, p)=>{
				if (ev.type != 'changed') return;
				libx.bundler.delete('./lib-cache');
				libx.bundler.triggerChange(src + '/index.pug');
			});
		}

		await copyProjectConfigToApi(shouldWatch);
		
		libx.log.info('build: done');
	}

	var clearLibs = async ()=> {
		console.log('fuser:clearLibs: cleaning cache folder "lib-cache"')
		await libx.bundler.delete('./lib-cache');
	}

	api.runlocal = async () => {
		await copyProjectConfigToApi(true);

		var res = await libx.bundler.exec([
			'cd api', 
			'source $(brew --prefix nvm)/nvm.sh; nvm use v8.12.0',
			'firebase use {0} --token {1}'.format(projconfig.firebaseProjectName, projconfig.private.firebaseToken), 
			'firebase serve -p {0} --only functions --token {1}'.format(projconfig.private.firebaseFunctionsPort, projconfig.private.firebaseToken)
		], true);
	}

	api.deploy = async () => {
		try {
			await libx.bundler.copy([src + '/project.json'], './api/build');
			await libx.bundler.copy([src + '/project-secrets.json'], './api/build');

			var res = await libx.bundler.exec([
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
		libx.bundler.serve(dest, null, [dest + '/**/*.*']);
	}

	libx.log.info('done')
})();
