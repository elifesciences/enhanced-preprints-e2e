## Description

This repository contains end2end tests for the EPP system.

The tests can be found in [/tests](/tests) and are primarily browser tests in the playwright test suite.

We need the applications to be running in order to perform the tests. See instructions below.

## Prerequisites

- docker
- docker-compose (if docker version below 1.27.0)
- node
- nvm
- yarn

Install node with `nvm install` or `nvm use` (if node version available already).

## Install dependencies

```
yarn install
```

## Bring up services

```
docker compose up -d
```

Alternatively run `docker compose up` and wait for the services to come up.

### List of services

Here is a list of some of the services (full list in [/docker-compose.yaml](/docker-compose.yaml)) and how to access them on the host environment:

- **minio (mock for S3 buckets)**: Available at `http://localhost:9101`.
- **temporal (EPP import)**: Available at `http://localhost:8233`.
- **api (EPP server)**: Available at `http://localhost:3000`.
- **app (EPP client)**: Available at `http://localhost:3001`.
- **xslt (EPP XSLT API)**: Available at `http://localhost:3004`.
- **wiremock (mock of DocMap API)**: Available at `http://localhost:8080`.

## Run tests

```
yarn lint
yarn test
```

## Reset services

```
docker compose run loadbucket
docker compose run resetdb
docker compose restart temporal
```
