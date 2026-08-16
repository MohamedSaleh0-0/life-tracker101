# Life Dashboard

Build a web app called "Life Tracker" — a personal dashboard that merges finance tracking and habit tracking and metrics(or normal stuff like weight and sleeptime) tracking into one unified view. Dark mode only.

It should feel like a focused personal analytics tool, not a generic SaaS template. Habit, metric tracking should feel just as important as the finance side — not a small addendum bolted onto a finance app.

Use realistic sample data (a handful of accounts and transactions, a few habits, a couple of metrics like weight/sleep/wake-up time, one or two shopping lists) so the design can be judged with real content density.

What it needs to contain

Finance:

Total balance, income, expenses, and net for a selectable time period (today/week/month/year/custom range)

Upcoming/due recurring bills or income that need reviewing/confirming

Charts: income vs. expenses, net worth over time, expenses by category, income by source, account balances

A way to log a new expense, income, or transfer between accounts

Shopping lists — multiple lists, each with pending items (with estimated prices) and a purchase history

Full transaction history — searchable and filterable

Habits & metrics:

Habits: things checked off daily/on a schedule (either a simple yes/no, or a number against a target, e.g. "8 glasses of water"), with streak tracking

Metrics: freeform daily values that aren't pass/fail — numbers (weight), time-of-day (wake-up time), or text — logged once per day

Once something's logged for today it should clearly look "done," with an obvious way to go back and edit it

Some way to see trends over time for habits and metrics — this is currently missing from the existing version of this app and is a priority: habit consistency over time, and value trends for numeric/time metrics

A guided way to create a new habit or new metric (they each have a few configuration choices to make — name, type, and for habits a schedule)

you should also design pop up modals where a user can log a new habit, metric, transaction 

Constraints

No light mode, no onboarding/auth flow — just the dashboard itself

Come up with your own visual style, layout, and information architecture — I want to see your take on how to organize and present this, not a spec to follow

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://life-tracker101.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/47f1726c-eb10-4273-abab-fa7be2489cd0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
