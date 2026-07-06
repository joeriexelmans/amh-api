# Alpine Mountain Hut API (AMH-API)

## Motivation

### Problem Statement

The Alps have hundreds of mountain huts. Most require upfront reservation to spend the night, but there is no single reservation system. Reservation systems are (highly) fragmented, due to huts being located in different countries, being owned by different organizations (Alpine clubs, national parks, private owners, ...).

### Existing Solutions

A number of people have already created web apps that bring together information from different reservation systems, such as:

  - [hutfinder.app](https://hutfinder.app/)
  - [madetohike.com/hut-map](https://madetohike.com/hut-map)
  - [refugesdesalpes.com](https://refugesdesalpes.com/) FFCAM & SAC

However:

  - Each has only a subset of mountain huts, and there is **no obvious way of contributing**.
  - They all **re-implement** some part of the same **boring** data aggregation/federation functionality!
  - None of them offer the UI that I want (see Epilogue ...)

So instead of doing the same thing and creating yet another app that only has a subset of mountain huts, this project is my attempt at creating an open-source, **collaborative** effort to creating a **federated API** that anyone can use, extend, and easily run on their own machines.

## Goal

The main purpose of this project is to build a single REST API that brings together information on as many Alpine mountain huts as possible, most importantly **reservation status information**.

## Implementation Decisions

 - The service runs entirely **in-memory**.
     - All hypothetical information on *all* mountain huts only consumes a couple of megabytes! (let's say 100 MB at most)
     - It greatly **simplifies deployment**: no need to set up a file system or database. It should be easy for anyone to host an instance of this API (no single point of failure).

 - Collected information is **extensively cached**
     - to minimize latency
     - to prevent flooding our data sources with requests (and getting banned)
     - Cache duration is configurable. Defaults are:
        - 4 hours for static data
        - 5 minutes for reservation status

## Documentation

The API is not yet stable. For now, have a look at the TypeScript definitions in [types.ts](./src/types.ts) to get an idea of what information is offered.

## Data sources

Currently, two data sources have been implemented:

 - [hut-reservation.org](https://hut-reservation.org/) has a public API with *all* the mountain huts from OEAV (Austria), DAV (Germany), SAC (Switzerland), AVS (South-Tyrol).
    - Note: to use this API, you need to authenticate with a (free) account.
 - [ffcam.fr](https://ffcam.fr) does not have a public API, so I crawl the HTML of their booking wizard and also another web page of theirs listing all huts. No account is necessary to for this data source.

What's missing:
 - **France** has many private (non-FFCAM) huts as well. Some (e.g., in the Vanoise parc) all use a single booking system, so it's quite realistic that a bunch more will be added soon.
 - **Italy**: I have to check what kind of reservation system(s) exist there.
 - private huts in Austria, Germany, Switzerland, South-Tirol (although there aren't that much).

## Epilogue: My 'cunning plan' ...


When planning a hut-to-hut trip, I usually visit all the different reservation websites manually and collect information about hut availability in a spreadsheet, like so:

![spreadsheet screenshot](./docs/images/spreadsheet.png)

It shows the availabilities of every hut in a wide time range. A diagonal of available huts corresponds to a "bookable" trip.

This, I believe, is the most convenient way of booking a hut-to-hut trip, because not only does it show me ***if*** some trip is possible, but also ***why*** some trip is *not* possible: for instance, maybe one of the huts is always completely booked, and by skipping that one hut, I can still take the trip.

No existing app can create such a table for me.
I really just want to create a web app that automatically generates this table if I fill in the names of the huts...
