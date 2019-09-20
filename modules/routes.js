module.exports = (function(bundular){
	var mod = {};

	mod.init = (_options)=>{
		mod.options = {
			routes: [],
			sys_routes: [
				new mod.Route('/_sys/theme', '/views/_sys/_theme.html'),
				new mod.Route('/_sys/icons', '/views/_sys/_icons.html'),
			],
			notFoundTemplate: '',
			isHtml5Mode: true, 
			hashPrefix: '!',
			requireBase: true,
		}

		mod.options = libx.extend(mod.options, _options);
		libx.log.d('bundular:routes: options', mod.options);

		mod.options.routes = _.concat(mod.options.routes, mod.options.sys_routes); 

		bundular.config(($routeProvider, $sceDelegateProvider, $locationProvider) => {
			_.each(mod.options.routes, route=> {
				$routeProvider.when(route.path, { templateUrl: route.templateUrl } );
			});
			$routeProvider.otherwise({ templateUrl: mod.options.notFoundTemplate });

			$sceDelegateProvider.resourceUrlWhitelist(['self', new RegExp('.*')]);
			$locationProvider.hashPrefix('!');
			$locationProvider.html5Mode({
				enabled: mod.options.isHtml5Mode,
				requireBase: mod.options.requireBase
			});
			$sceDelegateProvider.resourceUrlWhitelist([
				'self', // Allow same origin resource loads.
				window.location.href + '/**' // Allow loading from our assets domain.  Notice the difference between * and **.
			]);

		});
	};

	mod.Route = class {
		constructor(path, templateUrl) {
			this.path = path;
			this.templateUrl = templateUrl;
		}
	}

	return mod;
});