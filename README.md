## Description

This repository contains end2end tests for the EPP system.

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
