# Football-contracts

This is an online game for football fans. It will be played over the span of a season (april-november for sweden) and use real data from an API.
As a user you create an account and then use the in-game currency to bid on contracts. 

## Users

Football fans interested in the swedish leauges (Allsvenskan, OBOS Damallsvenskan, Superettan and Elitettan). 

## Account

Registration with email and password, and activation via email.  
The user can create an account without paying. Every user starts with 1000 credits.

## Game specific

### Contracts

A contract describes something that need to be fulfilled, and for a specific team, for example three victories in a row for Elfsborg. Another type of contract would be time-based ("10 goals scored for Malmö FF in june."). But we will wait with these contracts until later, as I'm not sure if the API can give that information with ease.
No more than three games in a row should be for the first type of contract, but there could be any combination of wins, losses or draws. But start with a set of [WWW, DDD, LLL, WDL, LDW] to keep it simple.
Contracts are created regularly and automatically by the backend, let's say 25 new contracts every wednesday at 03:00 CET. Teams should be picked randomly from all the leagues.

### Bids and coupons

Users do not bid on contracts, but on coupons based on contracts. Every contract should hold an amount of coupons matching the user stock. For a start there should be a minumum of 5 coupons per contract, but if the user stock passes 50, the amount of coupons should be 10% of the user stock.

A coupon which contract is fulfilled will pay the owner/holder 100 credits, so the challenge for the user is to bid as low as possible to earn as much as possible, but still bid enough to win one of the coupons.

### Auction

For every contract, there will be an auction for all the coupons. There will be a fixed date and time for the end of the auction, say 48 hours after the creation of a contract. The users will bid silently, but the application will give out some information (how many bids and some random bid). When the auction closes, the backend will transfer the coupons to the winners and submit the bid money.

### Contract fulfillment

It will be the date a game is played that will determine if there are three wins in a row, not the round of the league. This is important, as matches sometimes are moved so that a game in round 19 can be played in may when the current round is 6 or 7.

### Scores

Every user is ranked by their credit, and at the end of the season there will be winners announced. I'm also thinking about having mid-term competitions, like the user that won the most in august or similar.

### Dashboard

A user logged in should have a clear view of the coupons that are live, the users credit and position related to all users. Also, there should be a short list of available contracts.

## Technical

### External resources

The application should be online somewhere and I budget for a domain and a proper account at https://www.api-football.com/. Please put an agent to do some research for pricing for both API and different deployment services.

### Backend

I prefer any SQL-based solution. Feel free to pick for yourself. There need to be some sort of time trigger for the creation of new contracts and coupons, and the opening and closing of auctions.

### Frontend

React would be nice, as I use that in my classes. Feel free to pick any good react-based solution. I want warm colors, rather high contrast and a combination of fonts that combines good readability in tables and numerical contexts, while also have striking, bold headlines.

