module.exports = (function(bundular){
	var mod = {};

	mod.countWatches = (ngAppElm) => {
		var root = bundular._angular.element(document.getElementsByTagName(ngAppElm || 'body'));

		var watchers = [];

		var f = function (element) {
			bundular._angular.forEach(['$scope', '$isolateScope'], function (scopeProperty) { 
				if (element.data() && element.data().hasOwnProperty(scopeProperty)) {
					bundular._angular.forEach(element.data()[scopeProperty].$$watchers, function (watcher) {
						watchers.push(watcher);
					});
				}
			});

			bundular._angular.forEach(element.children(), function (childElement) {
				f(bundular._angular.element(childElement));
			});
		};

		f(root);

		// Remove duplicate watchers
		var watchersWithoutDuplicates = [];
		bundular._angular.forEach(watchers, function(item) {
			if(watchersWithoutDuplicates.indexOf(item) < 0) {
				watchersWithoutDuplicates.push(item);
			}
		});

		return watchersWithoutDuplicates.length;
	}

	mod.measureDigestCycle = () => {
		var ret = null;
		bundular._angular.element(document).injector().invoke(function($rootScope) { 
			var a = performance.now(); 
			$rootScope.$apply(); 
			ret = performance.now()-a; 
		})
		return ret;
	}

	mod.getStats = (printToConsole) => {
		var w = mod.countWatches();
		var dc = mod.measureDigestCycle();
		if (printToConsole != false) libx.log.v(`Performance stats: Watchers: ${w}, DigestCycle: ${dc}ms `);
		return { watches: w, digestCycleMS: dc };
	}

	return mod;
});