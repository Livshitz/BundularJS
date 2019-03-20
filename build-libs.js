const libx = require("libx.js");
libx.gulp = require("libx.js/node/gulp");
const argv = require("yargs").argv;

(async () => {
	var shouldWatch = argv.watch;
	var src = __dirname + "/./src";
	var dest = __dirname + "/./dist";
	libx.gulp.config.isProd = argv.env == "prod";
	libx.gulp.config.workdir = src;

	console.log("libx.gulp.config.isProd:", libx.gulp.config.isProd);

	process
		.on("unhandledRejection", (reason, p) => {
			console.error(reason, "Unhandled Rejection at Promise", p);
		})
		.on("uncaughtException", err => {
			console.error(err, "Uncaught Exception thrown");
			process.exit(1);
		});

	var build = async () => {
		if (libx.gulp.getArgs().noDelete == null) {
			libx.log.info("- cleaning build folder: ", dest);
			await libx.gulp.delete(dest, { force: true });
		}

		var p1 = libx.gulp.copy(
			src + "/fonts/**/",
			dest + "/fonts",
			null,
			false
		);

		// angularjs & angularjs material
		var p2 = libx.gulp.copy(
			[
				"node_modules/angular/angular.min.js",
				"node_modules/angular-animate/angular-animate.min.js",
				"node_modules/angular-aria/angular-aria.min.js",
				"node_modules/angular-cookies/angular-cookies.min.js",
				"node_modules/angular-resource/angular-resource.min.js",
				"node_modules/angular-route/angular-route.min.js",
				// 'node_modules/angular-sanitize/angular-sanitize.min.js',
				"node_modules/angular-material/angular-material.min.js"
			],
			dest + "/framework/",
			() => [libx.gulp.middlewares.concat("bundle.angular.js")],
			false
		);

		// firebase
		var p3 = libx.gulp.copy(
			[
				// 'node_modules/firebase/firebase.js',
				"node_modules/firebase/firebase-app.js",
				"node_modules/firebase/firebase-auth.js",
				"node_modules/firebase/firebase-database.js",
				"node_modules/firebase/firebase-storage.js"
				// 'node_modules/firebase/firebase-firestore.js',
				// 'node_modules/firebase/firebase-messaging.js',
				// 'node_modules/firebase/firebase-functions.js',
			],
			dest + "/framework/",
			() => [libx.gulp.middlewares.concat("bundle.firebase.js")],
			false
		);

		// algolia
		var p4 = libx.gulp.copy(
			[
				// 'node_modules/algoliasearch/dist/algoliasearch.min.js',
				"node_modules/algoliasearch/dist/algoliasearchLite.min.js"
			],
			dest + "/framework/",
			() => [libx.gulp.middlewares.concat("bundle.algolia.js")],
			false
		);

		// jquery
		var p5 = libx.gulp.copy(
			[
				// 'node_modules/jquery/dist/jquery.min.js',
				"node_modules/jquery/dist/jquery.slim.min.js",
				// 'node_modules/jquery/dist/core.js',
				src + "/scripts/lib/slick/slick.min.js"
			],
			dest + "/framework/",
			() => [libx.gulp.middlewares.concat("bundle.jquery.js")],
			false
		);

		var p6 = libx.gulp.copy(
			src + "/scripts/browserify/**/*.js",
			dest + "/scripts/",
			() => [
				libx.gulp.middlewares.browserify({ bare: false }),
				libx.gulp.middlewares.ifProd(libx.gulp.middlewares.minify())
			],
			shouldWatch
		);

		var p7 = await libx.gulp.copy(
			[
				src + "/scripts/**/*.css",
				src + "/styles/**/*.less",
				"!" + src + "/styles/lib/**/*",
				"node_modules/angular-material/angular-material.css",
				"node_modules/angular-material/angular-material.scss",
			],
			dest + "/styles/",
			()=> [ libx.gulp.middlewares.renameFunc(f => (f.dirname =  "." )) ],
			null,
			false,
			null
		);

		await libx.gulp.copy(
			[src + "/styles/main.less"],
			dest + "/styles/",
			() => [
				libx.gulp.middlewares.less(),
				libx.gulp.middlewares.ifProd(
					libx.gulp.middlewares.minifyLess()
				),
				libx.gulp.middlewares.renameFunc(f => (f.extname = ".min.css"))
			],
			shouldWatch
		);

		await Promise.all([p1, p2, p3, p4, p5, p6, p7]);

		await libx.gulp.copy(
			[dest + "/styles/*.css"],
			dest + "/framework/",
			() => [
				libx.gulp.middlewares.concat("bundle.styles.css"),
				libx.gulp.middlewares.ifProd(libx.gulp.middlewares.minifyLess())
			],
			shouldWatch
		);
	};

	await build();
})();
