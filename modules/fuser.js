const libx = require('libx.js');
libx.pax = require("pax.libx.js");
libx.node = require("libx.js/node");

const Secrets = require("./secrets");

const path = require('path');
const fs = require('fs');

let projconfig;
let packageJson;

var api = {};

var dir = process.cwd(); //__dirname
api.options = {
	src: dir + '/src',
	dest: dir + '/build',
	watch: libx.node.args.watch || false,
	watchOnlyChanges: libx.node.args.watchOnlyChanges || false,
	// serveLibs: libx.node.args.libs || false,
	deployRules: libx.node.args.deployRules || false,
	isDevelop: libx.node.args.develop || false,
	noDelete: libx.pax.getArgs().noDelete,
	clearLibs: libx.node.args.clearLibs || true,
	bare: false,
}

var secrets = new Secrets(api.options.src);

(async () => { /* init */
	var tsProject = libx.pax.ts.createProject(dir + '/tsconfig.json');

	if (api.options.develop) {
		api.options.watch = true;
		api.options.watchOnlyChanges = false;
		api.options.serve = true;
		api.options.build = true;
		api.options.clearLibs = true;
	}

	var copyProjectConfigToApiFolder = async (shouldWatch) => {
		await libx.pax.copy([api.options.src + '/project.json'], './api/build', null, shouldWatch);
		await libx.pax.copy([secrets.secretsFile], './api/build', null, shouldWatch);
	}

	projconfig = libx.node.getProjectConfig(api.options.src, secrets.secretsKey);
	packageJson = libx.node.readPackageJson();
	libx.pax.projconfig = projconfig;
	if (packageJson != null && packageJson.version != null) libx.pax.projconfig.version = packageJson.version;

	projconfig.compiledFolder = projconfig.compiledFolder || './browserify/';
	projconfig.compiledMainEntry = projconfig.compiledMainEntry || 'libx.js';

	var projName = projconfig.projectName.replace('-', '_')

	api.deployRules = async () => {
		await copyProjectConfigToApiFolder(false);

		var res = await libx.pax.exec([
			'cd api',
			'firebase use {0} --token {1}'.format(projconfig.firebaseProjectName, projconfig.private.firebaseToken),
			'firebase deploy --only database --token {0}'.format(projconfig.private.firebaseToken),
		], true);
	}
	if (api.options.deployRules) {
		api.deployRules();
		return;
	}

	libx.pax.config.workdir = api.options.src;
	libx.pax.config.devServer.port = projconfig.private.debugPort;
	libx.pax.config.devServer.host = projconfig.private.host;
	libx.pax.config.devServer.livePort = projconfig.private.livereloadPort;
	libx.pax.config.devServer.useHttps = projconfig.private.debugIsSecure;
	libx.pax.config.devServer.reloadDebounceMS = projconfig.private.reloadDebounceMS;
	libx.pax.config.devServer.reloadGraceMS = projconfig.private.reloadGraceMS;
	// libx.pax.config.isProd = projconfig.;

	if (api.options.bare) {
		console.log('-- Using browserify.bare', api.options.bare);
	}

	process.on('uncaughtException', function (err) {
		console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
		// console.error(err.stack, err);
		// libx.log.e("uncaughtException: ", err.stack, err)
		console.log("uncaughtException: ", err.stack || err);//, err);
		console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
	});

	// build:
	api.build = async (options) => {
		libx.log.info('build: starting');

		options = libx.extend({}, api.options, options);

		libx.pax.config.watchOnlyChanges = options.watchOnlyChanges;

		if (options.noDelete != true) {
			libx.log.info('test: cleaning build folder: ', options.dest);
			await libx.pax.delete(options.dest);
		}

		if (options.secret != null) {
			secrets.lock();
			secrets.makeEmpty();
		}

		// if (serve && serveLibs && !libx.pax.config.isProd) {
		// 	var res = libx.pax.exec([
		// 		'cd ../base-publish',
		// 		'http-server --cors --gzip -p 3888'
		// 	], true);
		// }

		var p1 = libx.pax.copy([options.src + '/resources/**/*.js', `!${options.src}/views/*`], options.dest + '/resources/', () => [
			// libx.pax.middlewares.ifProd(libx.pax.middlewares.babelify()),
			libx.pax.middlewares.ifProd(libx.pax.middlewares.minify()),
			// libx.pax.middlewares.renameFunc(f=>f.basename='xx')
		], options.watch);

		var p2 = libx.pax.copy([options.src + '/resources/**/*.less'], options.dest + '/resources/', () => [
			libx.pax.middlewares.less(),
			libx.pax.middlewares.ifProd(libx.pax.middlewares.minifyLess()),
			libx.pax.middlewares.renameFunc(f => f.extname = ".min.css"),
		], options.watch, { useSourceDir: true });
		
		var p22 = libx.pax.copy([options.src + '/resources/**/*.scss'], options.dest + '/resources/', () => [
			libx.pax.middlewares.sass(),
			libx.pax.middlewares.ifProd(libx.pax.middlewares.minifyCss()),
			libx.pax.middlewares.renameFunc(f => f.extname = ".min.css"),
		], options.watch, { useSourceDir: true });

		var p3 = libx.pax.copy(options.src + '/views/**/*.pug', options.dest + '/views', () => [
			libx.pax.middlewares.pug(options.pugLocals),
			libx.pax.middlewares.template('views'),
			// libx.pax.middlewares.triggerChange(options.src + '/index.pug'),
		], options.watch, { useSourceDir: true });

		var p4 = libx.pax.copy(options.src + '/components/**/*.pug', options.dest + '/components', () => [
			libx.pax.middlewares.pug(options.pugLocals),
			libx.pax.middlewares.write(options.dest + '/components'),
			libx.pax.middlewares.template('components'),
		], options.watch);
		var p5 = libx.pax.copy([options.src + '/components/**/*.js'], options.dest + '/components/', () => [
			// libx.pax.middlewares.ifProd(libx.pax.middlewares.babelify()),
			libx.pax.middlewares.ifProd(libx.pax.middlewares.minify()),
			// libx.pax.middlewares.renameFunc(f=>f.basename='xx')
		], options.watch);

		var p6 = libx.pax.copy(options.src + '/resources/imgs/**/*', options.dest + '/resources/imgs/', null, options.watch);

		var p7 = libx.pax.copy(dir + '/' + projconfig.compiledFolder + '/' + (projconfig.compiledMainEntry || '**/*.js'), options.dest + '/resources/scripts/', () => [
			// libx.pax.middlewares.tsify({ sourcemapDest: options.dest + '/resources/scripts/' }),
			libx.pax.middlewares.browserify(options.browserify),
			libx.pax.middlewares.ifProd(libx.pax.middlewares.minify()),
			// libx.pax.middlewares.concat('browserified.js'),
			// libx.pax.middlewares.rename('browserified.js'),
			// libx.pax.triggerChange(options.src + '/index.pug'),
			// libx.pax.middlewares.liveReload(),
		], options.watch);

		await Promise.all([p1, p2, p22, p3, p4, p5, p6, p7]);

		libx.pax.copy('./node_modules/bundularjs/dist/fonts/**/*', options.dest + '/resources/fonts/lib/', null, false, { debug: false });
		libx.pax.copy('./node_modules/ng-inline-edit/dist/ng-inline-edit.js', options.dest + '/resources/scripts/lib/', null, false);
		// libx.pax.copy('./node_modules/bundularjs/src/scripts/lib/angular-inview.js', options.dest + '/resources/scripts/lib/', null, false);

		var pIndex = libx.pax.copy([options.src + '/index.pug'], options.dest, () => [
			libx.pax.middlewares.pug(options.pugLocals),
			libx.pax.middlewares.localize('./', options.dest), //, true),
			libx.pax.middlewares.ifProd(libx.pax.middlewares.usemin('build/')),
		], options.watch, { base: options.src });

		await pIndex;

		if (options.watch) {
			libx.pax.watchSimple([projconfig.compiledFolder + '/**/*.ts'], (ev, p) => {
				if (ev.type != 'changed') return;
				libx.pax.triggerChange(projconfig.compiledFolder + '/' + projconfig.compiledMainEntry);
			});

			libx.pax.watchSimple([options.src + '/_content.pug'], (ev, p) => {
				if (ev.type != 'changed') return;
				libx.pax.triggerChange(options.src + '/index.pug');
			});

			libx.pax.watchSimple([process.cwd() + '/./node_modules/bundularjs/dist/**/*.js'], (ev, p) => {
				if (ev.type != 'changed') return;
				libx.pax.delete('./lib-cache');
				libx.pax.triggerChange(options.src + '/index.pug');
			});

			if (libx.pax.config.isProd) {
				libx.pax.watchSimple([options.dest + '/**/*'], (ev, p) => {
					if (ev.type != 'changed') return;
					libx.pax.triggerChange(options.src + '/index.pug');
				});
			}
		}

		await copyProjectConfigToApiFolder(options.watch);

		libx.log.info('build: done');
	}

	api.clearLibs = async () => {
		console.log('fuser:clearLibs: cleaning cache folder "lib-cache"')
		await libx.pax.delete('./lib-cache');
	}

	api.runlocal = async () => {
		await copyProjectConfigToApiFolder(true);

		var res = await libx.pax.exec([
			'cd api',
			'source $(brew --prefix nvm)/nvm.sh; nvm use v8.12.0',
			'firebase use {0} --token {1}'.format(projconfig.firebaseProjectName, projconfig.private.firebaseToken),
			'firebase serve -p {0} --only functions --token {1}'.format(projconfig.private.firebaseFunctionsPort, projconfig.private.firebaseToken)
		], true);
	}

	api.deploy = async () => {
		try {
			await libx.pax.copy([api.options.src + '/project.json'], './api/build');
			await libx.pax.copy([secrets.secretsFile], './api/build');

			var res = await libx.pax.exec([
				'cd api',
				// 'npm install',
				'firebase functions:config:set {0}.fuser_secret_key="{1}"'.format(projName, secrets.secretsKey),
				'firebase deploy -P {0} --only functions:{2}{3} --token "{1}"'.format(projconfig.firebaseProjectName, projconfig.private.firebaseToken, projName, libx.node.args.specificFunction ? ('-' + libx.node.args.specificFunction) : '')
			], true);
		} catch (ex) {
			console.log('error: ', ex);
		}
	}

	api.serve = async (options) => {
		libx.log.info('test: serving...');
		libx.pax.serve(api.options.dest, options, [api.options.dest + '/**/*.*']);
	}

	// if (api.options.clearLibs || libx.node.args.clearLibs) await api.clearLibs();
	// if (api.options.build || libx.node.args.build) await api.build(api.options);
	// if (api.options.apiRun || libx.node.args.apiRun) api.runlocal();
	// if (api.options.deploy || libx.node.args.apiDeploy) api.deploy();
	// if (api.options.serve || api.options.serve) api.serve();
	// libx.log.info('done')

	api.test = () => console.log('--- ok!')
})();

module.exports = api;
