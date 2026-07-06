# Alpine Mountain Hut API (AMH-API)

## Problem Statement

The Alps have hundreds of mountain huts. Most require upfront reservation to spend the night, but there is no single reservation system. Reservation systems are (highly) fragmented, due to huts being located in different countries, being owned by different organizations (Alpine clubs, national parks, private owners, ...).

## Goal

The main purpose of this project is to build a single REST API that contains reservation status information on as many Alpine mountain huts as possible.

## Software Architecture

Goals are:

 - **Extensive caching**
    - Requests to external services are cached as much as possible to prevent overloading them (and getting banned)
    - The cache duration is a parameter in the source code. By default:
      - 4 hours for static data
      - 5 minutes for reservation status
 - **Ease of deployment**
    - The whole service runs in-memory, so no need to setup a filesystem or database. This is possible because even if all information we have on all huts is cached, it occupies only a couple of megabytes.


## Data sources

Currently, two data sources have been implemented:

 - [hut-reservation.org](https://hut-reservation.org/) has a public API with *all* the mountain huts from OEAV (Austria), DAV (Germany), SAC (Switzerland), AVS (South-Tyrol).
    - Note: to use this API, you need to authenticate with a (free) account.
 - [ffcam.fr](https://ffcam.fr) does not have a public API, so I crawl the HTML of their booking wizard and also another web page of theirs listing all huts. No account is necessary to consult the booking status of huts.

What's missing:
 - **France** has many private (non-FFCAM) huts as well. Some (e.g., in the Vanoise parc) all use a single booking system, so it's quite realistic that a bunch more will be added soon.
 - **Italy**: I have to check what kind of reservation system(s) exist there.
 - private huts in Austria, Germany, Switzerland, South-Tirol (although there aren't that much).

