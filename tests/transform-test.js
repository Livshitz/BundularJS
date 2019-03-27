const cheerio = require('cheerio')
const fs = require('fs')
const libx = require('libx.js');
// libx.crypto = require('libx.js/modules/crypto');

(async ()=>{
	var res = await libx.gulp.exec([
		'cd ../base-publish', 
		'http-server --cors'
	], true);
	// libx.log.v('res: ', res);

})();

return;


var index = './build/index.html';
var content = fs.readFileSync('./build/index.html');
var $ = cheerio.load(content)

var dest = './build';

var onFileReady = (elm, attr, file, ext, fname) => {
	libx.log.v('onFileReady: ', file)
	var type = '';
	switch(ext) {
		case '.js': type = 'scripts'; break;
		case '.css': type = 'styles'; break;
		case '.jpg': 
		case '.jpeg': 
		case '.gif': 
		case '.png': type = 'imgs'; break;
		case '.otf': 
		case '.svg': 
		case '.eot': 
		case '.ttf': 
		case '.woff': type = 'fonts'; break;
	}
	var p = `/resources/${type}/lib/`;
	libx.gulp.copy([file], dest + p)

	if (attr != null) $(elm).attr(attr, p + fname);
}

var transform = async (e, attr, avoidRenameFile) => {
	var src = $(e).attr(attr);
	if (src == null) return;
	var m = src.match(/\/.*?([^\/]+)(\.[^\.\/]+)$/);
	if (m == null || m.length == 1) return;
	var ext = m[2];
	var name = m[1];
	var isRemote = src.match(/^(.+:)?\/\/|http/g) != null
	if (!isRemote) return;
	var h = libx.crypto.SHA1(src).toString();
	var p = './lib-cache/';
	var fname = avoidRenameFile ? `${name}${ext}` : `${h}${ext}`;
	libx.log.v('fname: ', fname);
	var f = p + fname;
	if (!fs.existsSync(p)) fs.mkdirSync(p);

	if (!fs.existsSync(f)) {
		var dir = process.cwd(); //__dirname
		libx.log.v('getting2: ', src, ext, h, dir);
		libx.modules.network.httpGet(src).then(data=> {
			libx.log.v('got data: ', data.length);
			
			fs.writeFile(f, data, err=> {
				if (err) throw 'Write: error: ', err;
				return onFileReady(e, attr, f, ext, fname);
			});
		})
	} else {
		return onFileReady(e, attr, f, ext, fname,);
	}
}

(async ()=> {
	var p = [];

	$('script').each(async (i, e)=> {
		p.push(transform(e, 'src'));
	})
	$('link').each(async (i, e)=> {
		p.push(transform(e, 'href'));
	})

	$('font').each(async (i, e)=> {
		await transform(e, 'url', true);
		$(e).remove();
	});

	await Promise.all(p);

	libx.log.v('all done, saving')
	fs.writeFileSync(index, $.html());
	libx.log.i('done!')

})();
