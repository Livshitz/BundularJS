const infra = require('libx.js');
const argv = require('yargs').argv;

(async ()=>{
	var shouldWatch = argv.watch;
	var src = __dirname + '/./src';
	var dest = __dirname + '/./dist';
	infra.gulp.config.isProd = argv.env == "prod";
	infra.gulp.config.workdir = src;

	process
		.on('unhandledRejection', (reason, p) => {
			console.error(reason, 'Unhandled Rejection at Promise', p);
		})
		.on('uncaughtException', err => {
			console.error(err, 'Uncaught Exception thrown');
			process.exit(1);
		});

	var build = async ()=> {
		if (infra.gulp.getArgs().noDelete == null) { 
			infra.log.info('- cleaning build folder: ', dest);
			await infra.gulp.delete(dest, {force: true});
		}

		var p1 = infra.gulp.copy(src + '/fonts/**/', dest + '/fonts', null, false);
		
		// angularjs & angularjs material
		var p2 = infra.gulp.copy(
			[
				'node_modules/angular/angular.min.js',
				'node_modules/angular-animate/angular-animate.min.js',
				'node_modules/angular-aria/angular-aria.min.js',
				'node_modules/angular-cookies/angular-cookies.min.js',
				'node_modules/angular-resource/angular-resource.min.js',
				'node_modules/angular-route/angular-route.min.js',
				// 'node_modules/angular-sanitize/angular-sanitize.min.js',
				'node_modules/angular-material/angular-material.min.js',
			] , dest + '/framework/', ()=>[
				infra.gulp.middlewares.concat('bundle.angular.js'),
			], false);

		// firebase
		var p3 = infra.gulp.copy(
			[
				// 'node_modules/firebase/firebase.js',
				'node_modules/firebase/firebase-app.js',
				'node_modules/firebase/firebase-auth.js',
				'node_modules/firebase/firebase-database.js',
				'node_modules/firebase/firebase-storage.js',
				// 'node_modules/firebase/firebase-firestore.js',
				// 'node_modules/firebase/firebase-messaging.js',
				// 'node_modules/firebase/firebase-functions.js',
			] , dest + '/framework/', ()=>[
				infra.gulp.middlewares.concat('bundle.firebase.js'),
			], false);

		// algolia
		var p4 = infra.gulp.copy(
			[
				// 'node_modules/algoliasearch/dist/algoliasearch.min.js',
				'node_modules/algoliasearch/dist/algoliasearchLite.min.js',
			] , dest + '/framework/', ()=>[
				infra.gulp.middlewares.concat('bundle.algolia.js'),
			], false);
	
		// jquery
		var p5 = infra.gulp.copy(
			[
				// 'node_modules/jquery/dist/jquery.min.js',
				'node_modules/jquery/dist/jquery.slim.min.js',
				// 'node_modules/jquery/dist/core.js',
				src + '/scripts/lib/slick/slick.min.js',
			] , dest + '/framework/', ()=>[
				infra.gulp.middlewares.concat('bundle.jquery.js'),
			], false);

		var p6 = infra.gulp.copy(
			[
				src + '/styles/**/*.less',
				'!' + src + '/styles/lib/**/*',
				'node_modules/angular-material/angular-material.scss',
			] , dest + '/styles/', null, false);

		var p6 = infra.gulp.copy(
			[
				src + '/scripts/lib/slick/slick.css',
				src + '/scripts/lib/slick/slick-theme.css',
			] , dest + '/styles/', null, false);

		var p7 = infra.gulp.copy(src + '/scripts/browserify/**/*.js', dest + '/scripts/', ()=>[
			infra.gulp.middlewares.browserify({ bare: false }),
			infra.gulp.middlewares.ifProd(infra.gulp.middlewares.minify()),
		], shouldWatch);

		await infra.gulp.copy([
			src + '/styles/main.less', 
			'node_modules/angular-material/angular-material.css'
		], dest + '/styles/', ()=>[
			infra.gulp.middlewares.less(),
			infra.gulp.middlewares.ifProd(infra.gulp.middlewares.minifyLess()),
			infra.gulp.middlewares.renameFunc(f=>f.extname = ".min.css")
		], shouldWatch);

		await infra.gulp.copy([
			dest + '/**/*.css',
		], dest + '/framework/', ()=>[
			infra.gulp.middlewares.concat('bundle.styles.css'),
		], shouldWatch);
		

		await Promise.all([p1, p2, p3, p4, p5, p6, p7]);
	}

	await build();
})();