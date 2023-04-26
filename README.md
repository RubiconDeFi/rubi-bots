# EXPERIMENTAL AND IN DEVELOPMENT - USE AT YOUR OWN RISK

# rubi-bots
Open-source bots for activists in the Rubicon ecosystem

## Welcome
Welcome to `rubi-bots`! This repo is for operating bots on Rubicon for potential profits, learning, and tech improvement. Currently offering market-making bots, with liquidator and arbitrage bots coming soon. A one-stop shop for traders and activists to improve performance and grow the Rubicon ecosystem together.

## Quickstart
1. Clone this repo to your machine `gh repo clone RubiconDeFi/rubi-bots`
2. Start a terminal session in that repo `cd rubi-bots`
3. Download dependencies `yarn install`
4. Launch Guided Start `yarn run guidedStart`

## Target bots and strategies to build/release:
- [X] RiskMinimized MM strategy - RiskMinimized
- [WIP] Competitive MM strategy - TargetVenueOutBid
- [] Two Venue Arbitrage - Rubi vs Selected Venue
- [] v2 Liduidator Bot - Money Market Activist

## Cloud Configuration and Forking
In order to configure and deploy your own instance of this project in a cloud environment, it is recommended to follow these steps:

1. Fork the repository: Start by creating a fork of this public repository. This will create a separate copy of the repository under your own GitHub account, allowing you to make customizations and maintain your own version of the project.

2. Clone your fork: Clone the forked repository to your local machine, so you can work on it and configure it as per your needs.

3. Create a Procfile: In the root directory of your forked repository, create a Procfile to define the processes that need to be run for your specific deployment. This file should not be committed to the public repository, so make sure it is added to the .gitignore file.

4. Configure the Procfile: Set up the Procfile according to your specific requirements. You can refer to the example provided earlier in the conversation for guidance.

5. Pull upstream improvements as needed: To keep your fork updated with the latest changes and improvements from the upstream repository, follow these steps:
a. First, add the original repository as a remote repository by running this command in your local repository:
```
git remote add upstream https://github.com/your-upstream-repo/rubi-bots.git
```
b. Fetch the latest changes from the upstream repository:
```
git fetch upstream
```
c. Merge the fetched changes into your local branch:
```
git merge upstream/main
```
d. Push the updated local branch to your forked repository:
```
git push origin main
```
By following these steps, you can maintain your own customized version of the project in your forked repository while still benefiting from the upstream improvements and updates.