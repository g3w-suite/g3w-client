# G3W-SUITE

G3W-CLIENT client module for G3W-SUITE.


The following instructions are for a Ubuntu 18.04 LTS.

## Installation of node.js

```bash
sudo apt-get install -y nodejs-legacy npm
```

Note: You have to install Node version >= v8.11.1


## Clone sdk and template repository

To use G3W-CLIENT

## Install G3W-CLIENT development dependencies

The following instruction will install all node modules mandatory to use development enviromental

```bash
npm install
```

## Local Server Configuration

This is the front-end part of the G3W-SUITE. Before run it in develop mode YOU NEED TO INSTALL AND RUN the server part  [**g3w-admin**](https://github.com/g3w-suite/g3w-admin)

After server side installation you can customize local server configuration through "config.js" file


1) Create a new file named config.js form config.template.js and change local G3W-ADMIN path, server port, etc ..:

    ```bash
       ~/../g3w-client$ nano config.js
     ```


## Development Task Command


We use [**Gulp**](https://gulpjs.com/)  for automating tasks in development


The main gulp commands to use in develop enviroment are:

1."Default Commad". It used to run local server. Run it from ~/../g3w-client$

  ```bash
    ~/../g3w-client$ npm run default
  ```
2."Admin Command". It used to build and copy the client files (.js, .css, etc..) and index.html template to g3w-admin client folders

  ```bash
      npm run admin
   ```

# Internalization
It is possible to add internalization translation adding/modified  g3w-client/src/config/i18n/index.js



