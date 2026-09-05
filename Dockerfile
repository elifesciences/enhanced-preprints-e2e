FROM mcr.microsoft.com/playwright:v1.63.0-noble

# copy project (including tests)
COPY ./package.json /tests/package.json
COPY ./yarn.lock /tests/yarn.lock
COPY ./.yarnrc.yml /tests/.yarnrc.yml
COPY ./.yarn/releases /tests/.yarn/releases
COPY ./playwright.config.ts /tests/playwright.config.ts
COPY ./tsconfig.json /tests/tsconfig.json

WORKDIR /tests

# Install dependencies
RUN yarn

# Run playwright test
CMD [ "yarn", "playwright", "test", "--reporter=list" ]
