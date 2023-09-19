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
docker compose up --wait
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

## Install playwright browsers

Install portable version of the browsers for the tests.

This command should be only run once per version of playwright.

```
yarn playwright install
```

> If you're running tests in docker this is optional.

## Run tests

To run tests on your host machine:

```
yarn test
```

To run tests in a docker container:

```
yarn test:docker
```

To run the linter:

```
yarn lint
```


## Preparing new tests

To avoid conflicts in tests, please ensure that all tests have unique msid in the corresponding docmap files before running them. You should use "[test name]-msid" format. The wiremock mappings should be positioned in wiremock/mappings/[test name] (for example title.spec.ts mappings are here --> [/wiremock/mappings/title](/wiremock/mappings/title)). The corresponding docmaps should be positioned in mock-data/docmaps/[test name] (for example title.spec.ts docmaps are here --> [/mock-data/docmaps/title](/mock-data/docmaps/title)).
