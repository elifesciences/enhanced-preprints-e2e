FROM mcr.microsoft.com/playwright:focal

# copy project (including tests)
COPY . /tests

WORKDIR /tests

# Install dependencies
RUN yarn

# Run playwright test
CMD [ "npx", "playwright", "test", "--reporter=list" ]
