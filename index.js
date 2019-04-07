module.exports = (function(){
	var mod = {};
	var libx = require('libx.js');

	return libx.di.register('bundular', require('./modules/angular-ex'));; 
})();

(()=>{ // Dependency Injector auto module registration
	__libx.di.register('bundular', module.exports);
})();
