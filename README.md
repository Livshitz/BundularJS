# Libx.fuser 

[![npm](https://img.shields.io/npm/v/libx.fuser.svg?maxAge=1000)](https://www.npmjs.com/package/libx.fuser)
[![CircleCI](https://circleci.com/gh/Livshitz/libx.fuser/tree/master.svg?style=shield)](https://circleci.com/gh/Livshitz/libx.fuser)
[![npm](https://img.shields.io/bundlephobia/minzip/libx.fuser.svg?style=plastic)](https://www.npmjs.com/package/libx.fuser)
[![npm](https://img.shields.io/bundlephobia/min/libx.fuser.svg?style=plastic)](https://www.npmjs.com/package/libx.fuser)
[![npm](https://img.shields.io/github/languages/code-size/livshitz/libx.fuser.svg?label=source%20code%20size)](https://www.github.com/livshitz/libx.fuser)

> libx.fuser is framework, bundler and a static site generator all combined. Based on [libx.js](https://github.com/livshitz/libx.js).


## Features: 
Libx.fuser Can allow you build webapps which are:
* __Serverless__ - Zero maintenance of servers
* __Static__ - All resources are compiled, built and bundled ahead of time
* __Progressive__ - Crucial resources loaded immediately while other components are loaded when needed
* __Slick__ - Jade/Pug engine is used to precompile neat declarative markdown into HTML
* __Continuously Deployed__ - Changes are automatically deployed and served, based on the git branch
* __Edge technology__ - Using Firebase to store and propagate changes to all viewer in real time, manage user authentication and serverless+microservices using Cloud Functions

## Tools:
* __libx.js__ ([npm](https://www.npmjs.com/package/libx.js)) - Swiss army knife full of useful modules and helpers
* __libx.fuser__ ([npm](https://www.npmjs.com/package/libx.fuser)) - A prebuilt framework of script bundles, styles and configurations. Also serves as bundler (like Webpack), and dev env server.
* [__Firebase__](https://firebase.google.com) - Database, auth, Cloud Functions
* [__Netlify__](https://netlify.com) - CI/CD, hosting, pre-rendering, routing, DNS management, SSL

## Description:
This project grabs statuses and information from LeasePilot's github repo and PivotalTracker.<br/>
The infrastructure used here is libx.fuser & libx.js which provide a framework of predefined bundles, configs and heavily modified version of AngularJS (1.7) to make it progressive and modern. Also provides a handy workspace by using a specifically designed bundler and local server to generate static (pre-compiled) & bundled webapp.<br/>
The tools used, mainly Firebase & Netlify, allows the maintenance seamless and effortless by continue deployment, hosting, dns, and enhanced database & synchronization.

## Usage
> `npm install --save libx.fuser` 
<!-- [TBD]: Add instructions to fork and clone a scaffold project -->

<!-- 
Scaffold a new project:<br/>
See ['psm' project](https://github.com/Livshitz/ProjectStructureManager)<br/>

* Get psm:<br/>
 `curl -sL https://github.com/Livshitz/ProjectStractureManager/raw/master/psm.sh -o psm.sh && chmod +x psm.sh`
* Grab the scaffold:<br/>
  `./psm.sh init {https://github.com/Livshitz/SuperWebApp.git}`
-->

## Initial Setup:
1. Clone the repo and `cd` into the project folder
2. `npm install` to install dependencies for the webapp
3. `npm install -g firebase-tools`
4. Firebase: 
   1. Create account in Firebase and grab your personal token by running `firebase login:ci`
   2. Create new project and realtime-database
   3. `cp src/project-secrets-empty.json src/project-secrets.json`
   4. Get your service account ('private key'), copy it's content to the file `src/project-secrets.json`
   5. Create a private passphrase to secure your secrets file `export FUSER_SECRET_KEY=<your-secret>`
   6. Lock your secrets file `node node_modules/libx.fuser --secrets-lock`
   7. Edit `src/project.json` file with relevant paths to your new Firebase project
5. Netlify (optional):
   1. Create new project and point to your cloned repo


## Running Locally:
Run local server: `node fuser-client.js --secret=<?>`.

With api (local Firebase Cloud Functions): `node fuser-client.js --secret=<?> --api`.

## Useful Commands:
* `node fuser-client.js` - Build & run local frontend server with watch and hot-reload
* `node fuser-client.js --build` - Build only
* `node fuser-client.js --api` - Build & run local frontend server with local backend (cloud functions)
* `node node_modules/libx.fuser --api-run` - Run local backend only
* `node fuser-client.js --env=prod` - Run local frontend server with production configuration (bundling & compression enabled)
* `node fuser-client.js --api-deploy` - Deploy whole api backend
* `node node_modules/libx.fuser --secrets-lock` - Encrypt your secrets file
* `node node_modules/libx.fuser --secrets-unlock` - Decrypt your secrets file
* `firebase deploy -P <project> --only functions:'<functionsGroupName>.<functionName>' --token <token>` - Deploy only one specific Cloud function from your api

## Contributing

Fork into your own repo, run locally, make changes and submit PullRequests to the main repository.

<!-- 
### Code of Conduct

We have adopted the same Code of Conduct as Facebook that we expect project participants to adhere to. Please read [the full text](https://code.facebook.com/codeofconduct) so that you can understand what actions will and will not be tolerated.

### Contributing Guide

Read our [contributing guide](/CONTRIBUTING.md) to learn about how you can contribute, how to propose improvements or if you are interested in translating the content. -->


## License

All projects and packages in this repository are [MIT licensed](/LICENSE).
