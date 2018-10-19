# G3W-SUITE

G3W-CLIENT client module for G3W-SUITE.


The following instructions are for a Ubuntu 16.04 LTS.

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
## Clone G3W-SDK and G3W-TEMPLATE repositories

The following instruction are mandatory to run and work with G3W-CLIENT

1) From main g3w-client folder, move to src/app subfolder
   ```bash
   ~/../g3w-client$ cd src/app
   ```
2) Clone G3W-TEMPLATE repository (you have to call it template)
    ```bash
      ~/../g3w-client/src/app$ git clone https://github.com/g3w-suite/g3w-client-template-lte.git template
      ```
3) Create a libs subfolder into src folder
   ```bash
      ~/../g3w-client/src/app$ cd ..
      ~/../g3w-client/src$ mkdir libs
      ~/../g3w-client/src$ cd libs
    ```
4) Clone G3W-SDK repository (you have to call it sdk)

    ```bash
       ~/../g3w-client/src/libs$ git clone https://github.com/g3w-suite/g3w-client-sdk.git sdk
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
      npm run g3w-admin
   ```

# Internalization

It is possible to change messages to the user or application components text changing file app.j
that is stored in g3w-client/src/app/config/locales



