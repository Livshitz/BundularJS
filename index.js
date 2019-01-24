const infra = require('libx.js');
const argv = require('yargs').argv;

(async ()=>{
	var shouldWatch = argv.watch;
	var src = './src';
	var dest = './dist';
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
			await infra.gulp.delete(dest);
		}

		await infra.gulp.copy(src + '/fonts/**/', dest + '/fonts', null, false);

		await infra.gulp.copy([src + '/main.less'], dest + '/', ()=>[
			infra.gulp.middlewares.less(),
			infra.gulp.middlewares.ifProd(infra.gulp.middlewares.minifyLess()),
			infra.gulp.middlewares.renameFunc(f=>f.extname = ".min.css")
		], shouldWatch).catch(err => console.log(err));

		// var p2 = infra.gulp.copy(dest + '/**/*.css', dest + '/bundle/', ()=>[
		// 	infra.gulp.middlewares.concat('bundle.min.css'),
		// ], shouldWatch);
		// await Promise.all([p2]);
	}

	await build();
})();