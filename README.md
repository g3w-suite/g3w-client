# G3W-SUITE

G3W-CLIENT client module for G3W-SUITE.


The following instructions are for a Ubuntu 18.04 LTS.

## Installation of node.js

```bash
sudo apt-get install -y nodejs-legacy npm
```

Note: You have to install Node version => v10.x.x


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
Go to ***g3w-client/src/config/dev*** folder and create a new ***index.js*** from index.template.js setting dev configuration

Go to ***g3w-client/src/config/keys*** folder and create a new ***index.js*** from index.template.js setting your GOOGLE and BING KEYS

```js{1,2}
export const GOOGLE_API_KEY = '<INSERT HERE YOUR GOOGLE API KEY>';
export const BING_API_KEY = '<INSERT HERE YOUR BING API KEY>';
export default {
  GOOGLE_API_KEY,
  BING_API_KEY
}```

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

#Run web client
After add a group and at least one qgis project in admin you can run web client application following the below rules:

Es ADMIN_URL: http://localhost:8000/en/map/group1-maps/qdjango/1/ where http://localhost:8000/en/map/<group_name_in_lower_case>/<project_type>/<id_project>/

Es CLIENT_URL: http://localhost:3000/?project=group1-maps/qdjango/1 where http://localhost:3000/?project=<group_name_in_lower_case>/<project_type>/<id_project>

