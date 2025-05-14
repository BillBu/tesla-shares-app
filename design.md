# Tesla shares app

## Development stack

This will be an Angular web app deployed via github pages.

## Requirements

The app should get the following information from a published
public api that can supply the information:

1. Tesla stock price ($TSLA)
2. The US$ to GB£ exchange rate

The information required is:

1. close of day values for the last two years.
2. current live information (for the current day) updated every 5 minutes.

## UI

There should be a text input that allows entering the number of
Tesla shares held by the user.

The following should be displayed:

1. The current Tesla share price
2. The current US$ to GB£ exchange rate
3. The current US$ value of the shares held
4. The current GB£ value of the shares held
5. A chart showing two lines one for US$ value and one for GB£ value showing the values for every 5 minutes of today.
6. Another chart the same as above but showing the values for the last 2 years, with buttons to change the duration to the last year,
   6 months, month and week.

## Deployment

The app will be deployed on the github pages for this repo.
You will need to either create the repo or give instructions
for me to create the repo and deploy it.
It should deploy to github pages automatically from the main
branch.
