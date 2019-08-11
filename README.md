# Angular 8+ Cloud Uploads Library

[![Travis](https://travis-ci.org/acaprojects/ngx-uploads.svg)](https://travis-ci.org/acaprojects/ngx-uploads)
[![npm version](https://badge.fury.io/js/%40acaprojects%2Fngx-uploads.svg)](https://badge.fury.io/js/%40acaprojects%2Fngx-uploads)
[![david-dm](https://david-dm.org/acaprojects/ngx-uploads.svg)](https://david-dm.org/acaprojects/ngx-uploads)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 8.0.0.

To be used in conjuction with [Comdominios](https://github.com/cotag/Condominios).

## Introduction

This project is an Angular library for handling secure direct to cloud uploads that are managed by the [Condominios](https://github.com/cotag/Condominios) project.
At CoTag Media we use it to handle all of our file ingestion as it:

* takes the load away from our API servers
* allows us to support hybrid cloud models
* works seamlessly with [AWS Lambda](http://docs.aws.amazon.com/lambda/latest/dg/with-s3.html) and [Google Cloud Functions](https://cloud.google.com/functions/docs)

Effectively this project takes [blob or file objects](https://github.com/cotag/a2-file-drop) in the browser and

* Manages an upload queue with pause, resume and progress for each upload
* Supports configuring individual upload parallelism and the number of simultaneous uploads
* All files are hashed in webworkers before upload for data integrity
* Communicates with Condominios to obtain [signed requests](http://docs.aws.amazon.com/AmazonS3/latest/dev/RESTAuthentication.html#UsingTemporarySecurityCredentials) for the uploads


## Usage

1. Optionally bootstrap `MD5_WORKER_BASE` - this allows you to customise the path of the [MD5 worker](https://github.com/cotag/ts-md5)
2. Bootstrap the `MD5Workers` - these perform the hashing in webworkers and should only be instansitated once
3. In the components you wish to perform uploads, inject your `Http` service and the `MD5Workers`
4. Import `UploadManager` and the storage providers you wish to use `Amazon`, `Google`, `Azure`, `OpenStack`
5. Add the providers to the upload manager: `UploadManager.addProvider(Amazon);`

You can now use the manager

```typescript

this.manager = new UploadManager(http, '/uploads', workers);
this.manager.autoStart = true;

// ...

// Add files to the upload manager
// Files is an array of Blobs or Files -> https://developer.mozilla.org/en/docs/Web/API/File
this.manager.upload(files);

```

## Development server

Run `gulp serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Build

Run `gulp build` to build the library. The build artifacts will be stored in the `dist/library` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Installation

You install the library from npm using `npm install @acaprojects/ngx-uploads`;
