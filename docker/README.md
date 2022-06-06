# G3W-CLIENT docker container

In this folder you can find various scripts and configuration files needed to set up a suitable local docker container to test and develop the [g3w-client](https://g3w-suite.readthedocs.io/en/latest/g3wsuite_client.html) cartographic viewer.

---

## Project setup

Download and install [Node.js and NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) and [Docker Compose](https://docs.docker.com/compose/install/) in your development enviroment.

Clone and place the [g3w-admin](https://github.com/g3w-suite/g3w-admin) and [g3w-client](https://github.com/g3w-suite/g3w-client) repositories into two separated adjacent folders:

```sh
cd /path/to/your/development/workspace

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

For more info about this project dependencies see:

- [package.json](../package.json)
- [docker-compose.yml](./docker-compose.yml)

---

## How to develop

You can start the built-in development servers (client + admin) by using the following command:

```sh
npm run dev
```

Before that, for the first time only, create these configuration files from the available templates:

- [/config.template.js](../config.template.js) --> `/config.js`
- [/src/config/dev/index.template.js](../src/config/dev/index.template.js) --> `src/config/dev/index.js`
- [/src/config/keys/index.template.js](../src/config/keys/index.template.js) --> `src/config/keys/index.js`

---

## Overview of Docker Compose

For those unfamiliar with docker development [docker-compose](https://docs.docker.com/compose/) is a tool for defining and running multi-container applications.

Below are described the most frequent commands, that are also available here in this repository as [npm scripts](https://docs.npmjs.com/cli/run-script/), you can find similar information by running `npm run` from the command line.


Define and run the services that make up the g3w-client (admin) development server:

```
docker
  docker compose --env-file ./docker/.env --file ./docker/docker-compose.yml --project-name g3w-client --project-directory ./docker
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

Validate and view the Compose file (load and parse [docker-compose.yml](./docker-compose.yml) and [.env](./.env) variables):

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

---

## Additional setup and troubleshooting

These are some environment variables defined within the [.env](./.env) file that you might be interested in checking:

- `G3WSUITE_LOCAL_CODE_PATH`: path to local [g3w-admin](https://github.com/g3w-suite/g3w-admin) folder (default: `../../g3w-admin`)
- `G3WSUITE_DEBUG`: True | False
- `WEBGIS_DOCKER_SHARED_VOLUME`: path to docker container shared volume (default: `/tmp/shared-volume-g3wsuite-dev`)

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