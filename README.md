# G3W-SUITE

G3W-CLIENT client module for G3W-SUITE.

The following instructions are for a Ubuntu 16.04 LTS.

## Installation of node.js 

```bash
sudo apt-get install -y nodejs-legacy npm
```

## Clone sdk and template repository

To use G3W-CLIENT 

## Install G3W-CLIENT development dependencies

The following instruction will install all node modules mandatory to use development enviromental 

```bash
npm install
```

After you can start locally demo (we use [**Gulp**](https://gulpjs.com/)):

```bash
gulp default
```

## Local Server Configuration

You can customize local server configuration through "config.js" file

## Development Task Command

The main gulp command to use develop enviroment are:

1."Default Commad". It used to run local server
 
  ```bash
    gulp default
  ``` 
2."Admin Command". It used to build and copy the client files (.js, .css, etc..) and index.html template to g3w-admin client folders
  
  ```bash
      gulp g3w-admin
   ```

