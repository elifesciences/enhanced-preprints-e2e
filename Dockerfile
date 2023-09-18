FROM mcr.microsoft.com/playwright:focal

# copy project (including tests)
COPY ./package.json /tests/package.json
COPY ./yarn.lock /tests/yarn.lock
COPY ./playwright.config.ts /tests/playwright.config.ts
COPY ./tsconfig.json /tests/tsconfig.json

WORKDIR /tests

# Install dependencies
RUN yarn

# Run playwright test
CMD [ "npx", "playwright", "test", "--reporter=list" ]
