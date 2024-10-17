const express = require("express")
const app = express()
const cors = require("cors")
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const res = require("express/lib/response");
require("dotenv").config()

app.use(cors())
app.use(express.static("public"))
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html")
});
app.use(bodyParser.json({ type: "application/*+json" }));
app.use(bodyParser.urlencoded({extended: false}));
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
    username: {
      type: String,
      required: true,
    },
});
const exerciseSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        required: true
    }
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

app.get("/api/users", function(request, response) {
    User.find()
    .then(documents => {
        response.json(documents)
    })
    .catch(error =>
        response.send(error.message)
    );
});

app.post("/api/users", function(request, response) {
    const user = new User({
        username: request.body.username
    });

    user.save()
    .then(document => {
        response.json({
            username: document.username,
            _id: document._id
        });
    })
    .catch(error => {
        response.send(error.message)
    });
});

app.post("/api/users/:_id/exercises", function(request, response) {
    let date;

    if (!request.body.date) {
        date = new Date();
    }
    else {
        date = new Date(request.body.date);
    }

    User.findOne({
        _id: request.params._id
    })
    .then(document => {
        if (!document) {
            response.json(document);

            return;
        }
        
        const user = document;

        const exercise = Exercise({
            user_id: user._id,
            description: request.body.description,
            duration: request.body.duration,
            date: date
        })
        
        exercise.save()
        .then(document => {
            response.json({
                _id: user._id,
                username: user.username,
                description: document.description,
                duration: document.duration,
                date: document.date.toDateString(),
            });
        })
        .catch(error => {
            res.send(error.message);
        });
    })
})

app.get("/api/users/:_id/logs", function(request, response) {
    User.findOne({
        _id: request.params._id
    })
    .then(document => {
        if (!document) {
            response.json(document);

            return;
        }

        const user = document;

        let filters = {
            user_id: user._id
        };

        if (request.query.from) {
            if (!filters.date) {
                filters.date = {};
            }

            filters.date["$gte"] = new Date(request.query.from);
        }
    
        if (request.query.to) {
            if (!filters.date) {
                filters.date = {};
            }

            filters.date["$lte"] = new Date(request.query.to);
        }

        const query = Exercise.find({}).where(filters);

        if (request.query.limit) {
            query.limit(request.query.limit);
        }

        query
        .then(documents => {
          response.json({
            username: user.username,
            count: documents.length,
            _id: user._id,
            log: documents.map(document => {
              return {
                description: document.description,
                duration: document.duration,
                date: document.date.toDateString(),
              }
            })
          });
        });
    })
    .catch(error => {
        response.send(error.message);
    });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port)
})
