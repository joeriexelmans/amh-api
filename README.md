# Alpine Mountain Hut API

The purpose of this project is to build a REST API that ultimately contains both static (e.g., coordinates) and dynamic (e.g., booking status) information about as many Alpine mountain huts as possible.

Since there already exist many services that offer this information (although very fragmented), the goal is not to copy/duplicate any of this information, but instead crawl it from publically available APIs and websites. Also, for the booking status of huts, you want to be up-to-date.

## Data sources

Currently, two data sources have been implemented:

 - [hut-reservation.org](https://hut-reservation.org/) has a public API with *all* the mountain huts from OEAV (Austria), DAV (Germany), SAC (Switzerland), AVS (South-Tyrol).
    - Note: to use this API, you need to authenticate with a (free) account.
 - [ffcam.fr](https://ffcam.fr) does not have a public API, so I crawl the HTML of their booking wizard and also another web page of theirs listing all huts. No account is necessary to consult the booking status of huts.

What's missing:
 - **France** has many private (non-FFCAM) huts as well. Some (e.g., in the Vanoise parc) all use a single booking system, so it's quite realistic that a bunch more will be added soon.
 - **Italy**: I have to check what kind of reservation system(s) exist there.
 - private huts in Austria, Germany, Switzerland, South-Tirol (although there aren't that much).

## Software Architecture

Goals

 - **Extensive caching**
    - Requests to external services are cached as much as possible to prevent overloading them (and getting banned)
    - The cache duration is a parameter in the source code. By default:
      - 4 hours for static data
      - 5 minutes for booking status
 - **Ease of deployment**
    - The whole service runs in-memory, so no need to setup a filesystem or database. This is possible because even if all information we have on all huts is cached, it occupies only a couple of megabytes.

