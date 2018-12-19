'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dns = require('dns');
const url = require('url');

var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
mongoose.connect(process.env.MONGOLAB_URI);

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

const shortenedURLSchema = new mongoose.Schema({
  original_url: String,
  short_url: String,
  url_number: Number,
  url_path: String
});

const urlCountSchema = new mongoose.Schema({
  currentCount: Number
})

const ShortenedURL = mongoose.model('ShortenedURL', shortenedURLSchema);
const URLCount = mongoose.model('URLCount', urlCountSchema)

// Pre-loading all the shortened URLs into the site
ShortenedURL.find((err, urls) => {
  if (err) {
    console.log(err);
  } else {
    for (let urlEntry in urls) {
      app.get(urlEntry.url_path, (req, res) => {
        res.redirect(urlEntry.original_url);
      }) 
    }
  }
})

app.post('/api/shorturl/new', (req, res) => {
  let inputURL = null;
  try {
    inputURL = new URL(req.body.url);
  } catch (err) {
    invalidURL(res);
    return;
  }
  
  dns.lookup(inputURL.hostname, (err, result) => {
    if (err) {
      invalidURL(res);
    } else {
      createURL(inputURL, res);
    }
  })
});

function invalidURL(res) {
  res.json({error: "invalid URL"})
}

function createURL(inputURL, res) {
  console.log("going to make a url with " + inputURL.href);
  URLCount.find().then((result, err) => {
    if (err) {
      console.log(err)
    } else {
      if (result.length === 0) {
        const urlCounter = new URLCount({currentCount: 1});
        urlCounter.save();
        return 1;
      } else {
        const urlCounter = result[0];
        urlCounter.currentCount = urlCounter.currentCount + 1;
        console.log("Current count is " + urlCounter.currentCount);
        urlCounter.save();
        return urlCounter.currentCount;
      }
    }
  }).then(currentCount => {
    console.log("The current count is " + currentCount);
    
    let newURLEntry = new ShortenedURL({
      original_url: inputURL.href,
      short_url: "https://tangible-risk.glitch.me/api/shorturl/" + currentCount,
      url_path: "/api/shorturl/" + currentCount,
      url_number: currentCount
    });
    
    app.get(newURLEntry.url_path, (req, res) => {
      res.redirect(newURLEntry.original_url);
    });
    
    res.json({
      original_url: newURLEntry.original_url,
      short_url: newURLEntry.url_number
    })
  })
}

app.listen(port, function () {
  console.log('Node.js listening ...');
});
