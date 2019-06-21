module.exports = (function(bundular){
	var mod = {};

	mod.toggleChildrenWatchers = (element, pause) => {
		bundular._angular.forEach(element.children(), function (childElement) {
			mod.toggleAllWatchers(bundular._angular.element(childElement), pause);
		});
	}

	mod.toggleAllWatchers = (element, pause) => {
		var data = element.data();
		if (data.hasOwnProperty('$scope') && data.$scope.hasOwnProperty('$$watchers') && data.$scope.$$watchers) {
			if (pause) {
				data._bk_$$watchers = [];
				$.each(data.$scope.$$watchers, function (i, watcher) {
					data._bk_$$watchers.push($.extend(true, {}, watcher))
				});

				data.$scope.$$watchers = [];
			} else {
				if (data.hasOwnProperty('_bk_$$watchers')) {
					$.each(data._bk_$$watchers, function (i, watcher) {
						data.$scope.$$watchers.push($.extend(true, {}, watcher))
					});
				}
			}

		}
		mod.toggleChildrenWatchers(element, pause);
	}

	// example: div(freeze-on-change="lastUpdate")
	bundular.directive('freezeOnChange', function(){
		return {
			link: function ($scope, $element, $attrs) {
				let lastValue = null;
				$scope.$watch($attrs.freezeOnChange, function (newVal) {
					if (newVal === undefined || newVal === lastValue) {
						return;
					}
					mod.toggleChildrenWatchers($element, false);

					$scope.$$postDigest(function() {
						mod.toggleChildrenWatchers($element, true);
					});
				});
			}
		}
	});

	// example: div(freeze-if="!watch")
	bundular.directive('freezeIf', function(){
		return {
			link: function (scope, element, attrs) {
				scope.$watch(attrs.freezeIf, function (newVal) {
					if (newVal === undefined) {
						return;
					}
					if (newVal) {
						mod.toggleChildrenWatchers(element, true)
					} else {
						mod.toggleChildrenWatchers(element, false)
					}
				});
			}
		}
	});

	return mod;
});