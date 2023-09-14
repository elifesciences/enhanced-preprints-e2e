## Description

This repository contains end2end tests for the EPP system.

The tests can be found in /tests/ and are primarily browser tests in the playwright test suite.

We need the applications to be running in order to perform the tests. See instructions below.

## Prerequisites

- docker
- docker-compose or docker compose
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
docker compose up
```

## Run tests

```
yarn lint
yarn test
```
