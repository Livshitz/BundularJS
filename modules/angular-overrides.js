
module.exports = (function(mod){
	mod.config(($provide)=>{
		$provide.decorator('$templateRequest', ($http, $templateCache, $q, $delegate)=>{
			// Return a function that will be
			// called when a template needs to be fetched
			return function (templateUrl) {
				// Check if the template is already in cache
				var tpl = $templateCache.get(templateUrl);
				if (tpl === undefined) {
					if (false) {
						// If you only sometimes want to use POST and sometimes you want
						// to use GET instead, you can check here if the request should
						// be normal GET request or not. If it should, just use $delegate
						// service and it will call the original fetcher function.
	
						return $delegate(templateUrl);
					}
	
					// Make your POST request here
					return $http.get(templateUrl).then(function (res) {
						var result = res.data;
						if (result.startsWith('<!DOCTYPE html>')) // Means we did not find the template and got to default page (index.html)
							throw libx.log.fatal(`Could not find the view '${templateUrl}'!`);
	
						// Cache the result
						$templateCache.put(templateUrl, result);
						return result;
					});
				} else {
					return $q.resolve(tpl);
				}
			};
		});
	});
	

});
