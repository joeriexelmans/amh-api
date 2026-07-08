For FFCAM (Alpine club federation in France), we have to resort to HTML scraping :(

Basically, we make a HTTP GET request, and in the resulting HTML there exists a `<script>` tag that assigns JSON values to global variables (which are then read by other scripts on the page). This JSON contains the data we're interested in.