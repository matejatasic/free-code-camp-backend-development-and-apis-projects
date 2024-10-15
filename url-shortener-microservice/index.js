require("dotenv").config();
const express = require("express");
const cors = require("cors");
const dns = require("dns");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));
app.use(bodyParser.json({ type: 'application/*+json' }));
app.use(bodyParser.urlencoded({extended: false}));

const urlSchema = new mongoose.Schema({
  _id: Number,
  original_url: {
    type: String,
    required: true,
    unique: true
  },
});
const Url = mongoose.model('Url', urlSchema);

app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function(req, res) {
  res.json({ greeting: "hello API" });
});

app.get("/api/shorturl/:id", (request, response) => {
  Url.findOne({_id: request.params.id})
    .then(document => {
      response.redirect(document.original_url);
    });
});

app.post("/api/shorturl", function(request, response) {
    if (!request.body.url) {
      response.json({
        error: "Invalid URL"
      });

      return;
    }

    const url = request.body.url;
    const urlRegex = /(https:\/\/)?(www\.)?(\w+\.)?(.+\.[a-z0-9]+)\/?.*/;
    const domainExists = url.match(urlRegex) && url.match(urlRegex)[4];
    
    if(!domainExists) {
      response.json({
        error: "Invalid URL"
      });

      return;
    }
    
    const domain = url.match(urlRegex)[4];

    dns.lookup(domain, function (error, address, family) {
      if (error) {
        response.json({
          error: "Invalid URL"
        });

        return;
      }
    });

    Url.findOne({
      original_url: url
    })
    .then((document)=> {
      if (document === null) {
        let id;
        
        Url.findOne({}, {}, { sort: { _id : -1 } })
        .then(document => {
          if (!document) {
            id = 1;
          }
          else {
            id = document._id + 1;
          }

          const urlDocument = new Url();
          urlDocument._id = id;
          urlDocument.original_url = url;
          urlDocument.save()
            .then((document) => {
              response.json({
                original_url: document.original_url,
                short_url: document._id
              });

              return;
            });
        });

        return;
      }

      response.json({
        original_url: document.original_url,
        short_url: document._id
      });

      return;
    });
  });

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
