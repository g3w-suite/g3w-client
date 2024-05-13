# G3W-CLIENT v3.9.8

[![License](https://img.shields.io/badge/license-MPL%202-blue.svg?style=flat)](LICENSE)

G3W-SUITE scripts and configuration files needed to set up a suitable local development enviroment for the [g3w-client](https://g3w-suite.readthedocs.io/en/latest/g3wsuite_client.html) cartographic viewer.

![g3w-client](https://g3w-suite.readthedocs.io/en/latest/_images/g3wclient_interface.png)

---

## Project setup

Download and install [Node.js and NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) and [Docker Compose](https://docs.docker.com/compose/install/) in your development enviroment.

Clone and place the [g3w-suite-docker](https://github.com/g3w-suite/g3w-suite-docker), [g3w-admin](https://github.com/g3w-suite/g3w-admin) and [g3w-client](https://github.com/g3w-suite/g3w-client) repositories into three separated adjacent folders:

```sh
cd /path/to/your/development/workspace

git clone https://github.com/g3w-suite/g3w-suite-docker.git --single-branch --branch dev ./g3w-suite-docker
git clone https://github.com/g3w-suite/g3w-admin.git --single-branch --branch dev ./g3w-admin
git clone https://github.com/g3w-suite/g3w-client.git --single-branch --branch dev ./g3w-client
```
Download all javascript and docker dependencies from within your [g3w-client](https://github.com/g3w-suite/g3w-client) local repository:

```sh
cd ./g3w-client
```
```sh
npm install         # javascript dependencies (client)
```
```sh
npm run docker pull # docker dependencies (admin)
```

Create these configuration files from the available templates:

- `/g3w-client/config.js` ← [config.template.js](https://github.com/g3w-suite/g3w-client/blob/dev/config.template.js)
- `/g3w-suite-docker/.env` ← [.env.example](https://github.com/g3w-suite/g3w-suite-docker/blob/dev/.env.example)
- `/g3w-suite-docker/config/g3w-suite/settings_docker.py` ← [settings_docker.py](https://github.com/g3w-suite/g3w-suite-docker/blob/dev/config/g3w-suite/settings_docker.py)
- `/g3w-suite-docker/shared-volume/` ← add this folder if it doesn't exist

And check that the following parameters are set as follows:

```sh
# /g3w-suite-docker/.env

WEBGIS_DOCKER_SHARED_VOLUME=./shared-volume # path to docker container shared volume
G3WSUITE_LOCAL_CODE_PATH=../g3w-admin       # path to local g3w-admin folder
G3WSUITE_DEBUG=True                         # default: False
```

Now your folder structure should matches this one:

```
.
├── g3w-admin/
│
├── g3w-client/
│   ├── node_modules/
│   ├── package.json
│   ├── package-lock.json
│   └── config.js
│
└── g3w-suite-docker/
    ├── config/
    │   └── g3w-suite/
    │       └── settings_docker.py
    ├── shared-volume/
    ├── scripts/
    │   └── docker-entrypoint-dev.sh
    ├── .env
    ├── docker-compose-dev.yml
    └── README_DEV.md
    
```

For more info about this project dependencies see:

- [package.json](https://github.com/g3w-suite/g3w-client/blob/dev/package.json)
- [docker-compose-dev.yml](https://github.com/g3w-suite/g3w-suite-docker/blob/dev/docker-compose-dev.yml)

---

## How to develop

From within your [g3w-client](https://github.com/g3w-suite/g3w-client) local repository:

```sh
cd ./g3w-client
```

You can start the built-in development servers by using the following:

```sh
npm run docker:up      # backend server   (g3w-admin)
```

```sh
npm run dev            # frontend server  (g3w-client)
```

```sh
npm run watch:plugins  # watch built-in plugins (editing, openrouteservice, qplotly, qtimeseries)
```

If everything went fine, you can now visit you local development server URL to see changes, the following rules are applied:

```sh
# EXAMPLE 1:
# project_group = "countries";
# project_type  = "qdjango";
# project_id    = "1"

http://localhost:8000/en/map/countries/qdjango/1 # g3w-admin  (production)
http://localhost:3000/en/map/countries/qdjango/1 # g3w-client (development)
```

```sh
# EXAMPLE 2:
# project_group = "eleprofile";
# project_type  = "qdjango";
# project_id    = "2"

http://localhost:8000/en/map/eleprofile/qdjango/2 # g3w-admin  (production)
http://localhost:3000/en/map/eleprofile/qdjango/2 # g3w-client (development)
```

### Plugins

If you want develop client plugins you need place them in the [`src/plugins`](https://github.com/g3w-suite/g3w-client/blob/dev/src/plugins) folder:

```sh
.
└── src/
    └── plugins/
        ├── base
        ├── eleprofile
        ├── sidebar
        └── ...
```

Update your [`config.js`](https://github.com/g3w-suite/g3w-client/blob/dev/config.template.js) file accordingly:

```js
// overrides global `window.initConfig.group.plugins` property for custom plugin development

const G3W_PLUGINS = [
  'base',
  'eleprofile',
  'sidebar',
  ...
];
```

And then start again the development servers:

```sh
npm run docker:up      # backend server (g3w-admin)
npm run dev            # frontend server (g3w-client)
npm run watch:plugins  # watch built-in plugins + any custom plugin (eg. base, eleprofile, sidebar)
```

For further information about plugin development, see also: [`src/plugins/README.md`](https://github.com/g3w-suite/g3w-client/blob/dev/src/src/plugins/README.md)

---

### FAQ

<details>

<summary>1. How can I start or stop docker containers?</summary>

For those unfamiliar with docker development [docker-compose](https://docs.docker.com/compose/) is a tool for defining and running multi-container applications.

Below are described the most frequent commands, that are also available here in this repository as [npm scripts](https://docs.npmjs.com/cli/run-script/), you can find similar information by running `npm run` from the command line.


Define and run the services that make up the g3w-client (admin) development server:

```
docker
  docker compose --env-file ../g3w-suite-docker/.env --file ../g3w-suite-docker/docker-compose-dev.yml --project-name g3w-suite-docker --project-directory ../g3w-suite-docker
```

Create and start containers (run default admin server at [localhost:8000](http://localhost:8000)):

```
docker:up
  npm run docker up -- -d
```

Stop and remove containers, networks, images, and volumes:

```
docker:down
  npm run docker down
```

Validate and view the Compose file (load and parse [docker-compose-dev.yml](https://github.com/g3w-suite/g3w-suite-docker/blob/dev/docker-compose-dev.yml) and [.env](https://github.com/g3w-suite/g3w-suite-docker/blob/dev/.env.example) variables):

```
docker:config
  npm run docker config
```

View output from containers:

```
docker:logs
    npm run docker logs
```

For more info:

- [Overview of docker-compose CLI](https://docs.docker.com/compose/reference/)

</details>

<details>

<summary>2. How can I inspect actual docker configuration?</summary>

If you are having trouble with your current project configuration you can use the docker config command to inspect the actual values of the variables passed to your docker container:

```sh
npm run docker config
```

If your container struggles to boot properly you can also use the docker logs command related to a specific container:

```sh
npm run docker logs g3w-suite -- -f
npm run docker logs postgis -- -f
```

For more info:

- [Overview of g3w-suite dockerization](https://g3w-suite.readthedocs.io/en/latest/docker.html)

</details>

<details>

<summary>3. How can I keep client plugins updated ?</summary>

Currently built-in and custom plugins are managed with several "independent" git repositories, so there is currently no automated task to achieve this.

You can use the following commands to fetch the latest changes of built-in plugins:

```sh
cd /g3w-client/src/plugins/editing

git pull editing
```

```sh
cd /g3w-client/src/plugins/openrouteservice

git pull openrouteservice
```

```sh
cd /g3w-client/src/plugins/qplotly

git pull qplotly
```

```sh
cd /g3w-client/src/plugins/qtimeseries

git pull qtimeseries
```

If you are looking for an alternative workflow, also try to take a look at [git submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules) or [git subtrees](https://www.atlassian.com/git/tutorials/git-subtree)

</details>

<details>

<summary>4. How can I translate this project?</summary>

Depending on your current project version, you can edit one of the following files and then submit a [pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request):

- `/g3w-client/src/locales/` (> v3.4)
- `/g3w-client/src/config/i18n/index.js` (<= v3.4)

</details>

### Changelog

All notable changes to this project are documented in the [releases](https://github.com/g3w-suite/g3w-client/releases) page.

---

**Compatibile with:**
[![g3w-admin version](https://img.shields.io/badge/g3w--admin-3.7-1EB300.svg?style=flat)](https://github.com/g3w-suite/g3w-admin/tree/v.3.7.x)
[![g3w-suite-docker version](https://img.shields.io/badge/g3w--suite--docker-3.7-1EB300.svg?style=flat)](https://github.com/g3w-suite/g3w-suite-docker/tree/v3.7.x)

---

**License:** MPL-2
