const libx = require('libx.js');
libx.pax = require("pax.libx.js");
libx.node = require("libx.js/node");
const fs = require('fs');

class Secrets {
	constructor(srcFolder) {
		this.secretsFile = srcFolder + '/project-secrets.json';
		this.secretsFileOpen = srcFolder + '/project-secrets-open.json';
		this.secretsFileEmpty = srcFolder + '/project-secrets-Empty.json';
		this.secretsKey = (libx.node.args.secret != null) ? libx.node.args.secret.toString() : process.env.FUSER_SECRET_KEY;
		// libx.log.info('!!! Secret key is: ', this.secretsKey);
	}

	lock() {
		if (!fs.existsSync(this.secretsFileOpen) && fs.existsSync(this.secretsFile)) {
			libx.log.w('SecretsLock: did not find decrypted file but has encrypted one, will decrypt...');
			libx.node.decryptFile(this.secretsFile, this.secretsKey, this.secretsFileOpen);
		}
	
		libx.node.encryptFile(this.secretsFileOpen, this.secretsKey, this.secretsFile);
		libx.log.info('Secrets file locked successfully');
	}

	unlock() {
		try {
			libx.node.decryptFile(this.secretsFile, this.secretsKey, this.secretsFileOpen);
			libx.log.info('Secrets file unlocked successfully');
		} catch (ex) { libx.log.warning('Could not decrypt secrets', ex); }
	}

	makeEmpty() {
		if (!fs.existsSync(this.secretsFileOpen))
			libx.node.decryptFile(this.secretsFile, this.secretsKey, this.secretsFileOpen);
		var content = fs.readFileSync(this.secretsFileOpen);
		var obj = JSON.parse(content);
		var empty = libx.makeEmpty(obj);
		fs.writeFileSync(this.secretsFileEmpty, libx.jsonify(empty));
	
		libx.log.info('Empty secrets file was wrote successfully ', this.secretsFileEmpty);
	}
};

module.exports = Secrets;

// Support calling this module from CLI:

var cliSecrets = new Secrets(process.cwd() + '/src');

if (libx.node.args.lock) {
	cliSecrets.lock()
	return;
}
if (libx.node.args.unlock) {
	cliSecrets.unlock();
	return;
}
if (libx.node.args.empty) {
	cliSecrets.makeEmpty();
	return;
}