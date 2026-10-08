# Football-contracts

This is an online, long-term prediction game for football fans. It use real data from an API.

Register to create an account and then use the in-game currency to bid on contracts.

## Contracts

A contract describes something that need to be fulfilled, and for a specific team, for example three victories in a row [WWW] for Elfsborg.

All 27 possible combination of wins, losses or draws for three consecutive matches are available, but it's more common with three wins or three losses, and the pattern indicating a dipping form [WDL] and a rising form [LDW] are a bit more common than other random patterns.

Contracts are created regularly and automatically every wednesday at 03:00 CET. Teams will be picked randomly from all the leagues available.

## Bids and coupons

Users do not bid on the actual contracts, but on coupons based on contracts. There will only be a certain number of coupons, to trigger bids in the auction.

A coupon which contract is fulfilled will pay the owner/holder 100 credits, so the challenge for the user is to bid as low as possible to earn as much as possible, but still bid enough to win one of the coupons.

## Auction

For every contract, there will be an auction for all the coupons. There will be a fixed date and time for the end of the auction.

Users will bid silently, but the application will give out some information. When the auction closes, the coupons will be transferred to the winners and submit the bid money.

## Contract fulfillment

The fulfillment of a contract will be decided from the date a game is played, not the round of the league. This is important to know, as matches sometimes are moved so that a game in round 19 can be played in may when the current round is 6 or 7.

## Scores

Every user is ranked by their credit, and at the end of the season there will be winners announced. There will also be mid-term competitions, like the user that won the most in august or similar.
