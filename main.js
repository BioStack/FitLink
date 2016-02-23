"use strict"

var express = require("express"),
    fs = require("fs"),
    moment = require("moment"),
    format = require("string-format"),
    async  = require("async"),
    app = express();


format.extend(String.prototype);

var FitbitApiClient = require("./fitbit-api-client.js"),
    client = new FitbitApiClient("CLIENTID", "CLIENTSECRET");

var callbackURL = "http://localhost:3000/callback";

function getDateRange(date, days)
{
  var day  = moment(date);
  var last = moment(date).add(days,'d');
  var dates = [];
  while( day < last )
  {
    dates.push(day.format("YYYY-MM-DD"));
    day = day.add(1,'d');
  }
  return dates;
}

function getRequestForDate(type,date,resolution)
{
  var reqFormat = samplereqs[type];
  return reqFormat.format(date, resolution);
}

function getRequestsForDateRange(date, days, type, resolution)
{
  var range = getDateRange(date, days);
  var requests = [];
  for( var i = 0; i < range.length; i++ )
  {
    requests.push(getRequestForDate(type, range[i], resolution));
  }
  return requests;
}

var samplereqs = 
{
  steps:"/activities/steps/date/{0}/{1}.json",
  heartrate:"/activities/heart/date/{0}/{1}.json",
  weight:"/body/log/weight/date/{0}/1d.json",
  calories:"/activities/calories/date/{0}/{1}.json",
}

function getAndSaveResult( requestAddress, access_token )
{
  client.get(req, access_token).then(function (results) 
  {
    var body = JSON.stringify(results[0], null, 3);
    //console.log("response received", body);
    fs.writeFileSync(name + ".json", body);
  }).catch(function (error) {
    console.error(error);
  });
}

function getAndSaveResultForDateRange( date, days, name, resolution, access_token, onDone )
{
  var reqs = getRequestsForDateRange(date, days, name, resolution);
  var visited = [];
  async.eachSeries( reqs,
    function (req, callback) 
    {
      client.get(req, access_token).then(function (results) 
      {
        console.log(req);
        var body = results[0];
        visited.push(body);
        callback(null);
      });
    },
    function done(err)
    {
      if( err )
        console.error(err);
      else
      {
        var obj = {};
        obj.type = name;
        obj.range = getDateRange(date,days);
        obj.days = visited;

        console.log(visited.length);
        fs.writeFileSync(name + ".json", JSON.stringify(obj, null, 3));
        onDone();
      }
    }
  );
}

app.get("/callback", function (req, res) {

	console.log("callback", req.query.code);

  client.getAccessToken(req.query.code, callbackURL).then(function (result) 
  {
      // Temporary access token that will expire in 10 minutes.
      var access_token = result.access_token;
      if( !access_token )
      {
        res.send("no access_token acquired");
        return;
      }

      getAndSaveResultForDateRange("2016-02-15",7,"steps", "1d", access_token, function(){
          res.write("retrieved steps");
      });
      getAndSaveResultForDateRange("2016-02-15",7,"heartrate", "1d", access_token, function(){
          res.write("retrieved heartrate");
      });
      getAndSaveResultForDateRange("2016-02-15",7,"weight", "1d", access_token, function(){
          res.write("retrieved weight");
      });
      getAndSaveResultForDateRange("2016-02-15",7,"calories", "1d", access_token, function(){
          res.write("retrieved calories");
      });

  }).catch(function (error) {
    res.send(error);
    console.error(error);
  });

});

app.get("/authorize", function (req, res) {
  var url = client.getAuthorizeUrl('activity heartrate location nutrition profile settings sleep social weight', callbackURL);
  console.log(url)

   res.redirect(url);
});

var favicon = new Buffer('AAABAAEAEBAQAAAAAAAoAQAAFgAAACgAAAAQAAAAIAAAAAEABAAAAAAAgAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAA/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEREQAAAAAAEAAAEAAAAAEAAAABAAAAEAAAAAAQAAAQAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAEAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//wAA//8AAP//AAD8HwAA++8AAPf3AADv+wAA7/sAAP//AAD//wAA+98AAP//AAD//wAA//8AAP//AAD//wAA', 'base64'); 
app.get("/favicon.ico", function(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Length', favicon.length);
  res.setHeader('Content-Type', 'image/x-icon');
  res.setHeader("Cache-Control", "public, max-age=2592000"); // expires after a month
  res.setHeader("Expires", new Date(Date.now() + 2592000000).toUTCString());
  res.end(favicon);
});

if( process.env.NODE_ENV != "test")
{
  app.listen(3000);
}