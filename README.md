# unmistakeably-memozied

Simplistic web crawler based on AWS Lambda functions.  Given a _domain_ and an integer _limit_
the project system crawls web pages and returns terse information about them. The number 
of pages returned is constrained by _limit_.

The project implements the basic requirements and adds _concurrency_ and _pagination_. 

The former is
achieved by allowing up to 5 workers execute at the same time while observing the _limit_ with work
being allocated on a FIFO basis by the AWS Lambda platform. Pagination is achieved by the API and Datastore wherein the UI never has
more than 20 objects (ie, one page) locally.


## architecture

The project composes three parts that collaborate as follows:

* **UI** - a simple SPA (run locally) accepts _url_ and _limit_. Inputs and results appear on separate
tabs with the latter being paged at a static count of 20 objects. Pagination elements appear when the 
result set is large enough to warrant them. The UI afford a _reset_ ability in the case where the _domain_
value fails validation by the API.

* **API** - a simple `http` api accepts crawl requests and pagination requests from the UI. The API
validates the given _domain_ in a blunt-force fashion: preprending the string 'http//' to the end-user supplied
domain value and perfoming an `http GET` against it. A status code of `200` is taken as _valid_ and anything else
is considered _invalid_. Requests made with an invalid domain are returned immediately to the client UI.  Valid requests 
result in the submission of a new crawl request to a cloud-based queue which automatically invoke workers (crawlers).

* **Datastore** - a cloud, document-oriented datastore is used to track overall scan progress and return saved page objects
to the api and client.

* **Crawler** - a Lambda function that accepts a unit of work from the cloud-based queue. The crawler accepts an array of domains
from the work message and scans them, recording in memory for each, the url, the page title, and a set of child links. It then
stores a "page object" in the datastore for the url. The number of page objects is constrained by _limit_ which all invocations
of the crawler observe.

Given the implementation of the crawler as a Lambda function, it cannot recurse in the traditional sense of the term, particularly
in light of the hard execution timeout inherent in the AWS Lambda model.  Thus, after saving pages, the crawler "forwards" it's 
unfinsihed work - in the form of all the child links it has discovered in its execution - by writing a new work message to the 
queue.  Again, the _limit_ value controls this action of the crawler.

Also, while the crawler will not store page objects more than allowed by _limit_, there are valid cases where crawlers will be
invoked by queue messages only to find they are 'too late', the _limit_ has been reached, so they end without action.


## code organization

The layout of the project is a little obtuse; this is mostly because I developed ad-hoc as I went and did not go back and rationalize it.
All the code of the project (save for `npm` deps) is in this repo.

* (top level) - the file `crawler.js` is the Lambda worker. It uses code from the `lib` subfolder. The file `serverless.yml` 
attests to the use of the Serverless Framework for this component, but it is a largely a convenience.

* **api** - contains the Express code for the api server and endpoint handlers for the routes. The api is unsecured.

* **lib** - contains modules shared by the **api** and the **crawler* regarding queue and datastore operations.

* **ui** - contains the code and a runnable (bundled) version of the UI.


## running the application

Most of the application is cloud-based. To run the UI (which has been statically configured to point to the API) locally, do the following:

1. Clone this repo.
2. Change to the directory `ui/public`.
3. Run an http server to serve `index.html`.

The UI was developed using the Svelte framework which uses a "compiler" step in the dev work flow. Thus, very little JS is actually shipped to the
client, and all 3rd party deps are in the package. (If you like, you can install the client side deps in the typical way, but it's not
required to run the UI locally.)

Logging on the part of the API and the Crawler is **verbose** but 100% in the cloud.  If there is interest in seeing the results, please let me know.

We can assume that AWS will not be down, but the API server is another matter. (I went cheap.) The following link can be used to check it's status:

* https://stats.uptimerobot.com/7D77oimmE5


## issues, observations, things to improve

1. Crawling is pretty slow. Part of that is the self-imposed throttling I put on the scanner and the Lambdas to ensure I stayed well-within
the bounds of AWS Terms Of Service.  Additionally, there is a crude guard to prevent a runaway Lambda scenario.

2. On occasion the connection to the datastore is dropped; this was difficult to repro quickly so its largely unhandled. From the UI side,
just refresh and try again. Not the best, but not the worst either for this type of project.

3. Some websites are odd, meaning they proved difficult to meaningfully scan using simple techniques. A lot of work would go into the
scan function to make it comprehensive.

4. No effort was made to avoid storing duplicate pages or to order the pages in any manner.

5. In a cash-constrained setting, letting a few more Lambdas run even when _limit_ has been reached could be considered wasteful. This is
a matter of taste and dollars, I guess. The 'extra' Lambdas exit immediately so are billed at the barest resource rate, but in fairness, 
they do count as full invocations, which is another AWS billing metric.

6. The UX is pretty bare bones and easily fooled. For example, if, during a crawl, you navigate to the results tab and then return to the
inputs tab, the clock is borked.  Haha, be patient and don't do that.

7. Like many things in the cloud, it's possible for timeouts, latency, and the like to foul things up. Specifically, there may be
cases where a Lambda crawler will timeout before actually finishing in a good way. I struck a balance between cost-savings and productivity.
But depending on which domains are scanned and how _limit_ is set, you may experience issues. 

All of these topics are critical TODOs if this were a production effort.