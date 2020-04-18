# Lucid Chart Importer

This module is used by Envoy and it's related projects to convert a user journey lucidchart csv file into a format that Envoy understands and then load it into and Envoy DB.

This module is used as a shared dependecy between both [ip-envoy](https://github.com/Financial-Times/ip-envoy/) and [ip-envoy-api](https://github.com/Financial-Times/ip-envoy-api).

# Installation
- `npm i @financial-times/ip-envoy-lucidimporter`

# Prerequisite 
- If you run it locally , you need to set up `NODE_ENV=development` on `.env` file in your project root directory.

# Deploying a new version of this module

- `package.json` version should remain at `0.0.0`
- Merge your new changes into master via a PR
- Create a new release of this project on Github with corresponding semver
- CircleCI will pickup that new release and then publish the changes to npm
