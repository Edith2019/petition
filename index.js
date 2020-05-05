const express = require('express');
const app = express();
const db = require('./utils/db');
const hb = require('express-handlebars');
var cookieSession = require('cookie-session');

const csurf = require('csurf');
const { hash, compare } = require('./utils/db');

let secrets;
if (process.env.SESSION_SECRET) {
    secrets = {
        cookieSession: {
            secret: process.env.SESSION_SECRET
        }
    };
} else {
    secrets = require('./utils/secrets');
}

//to set up handlebars
app.engine('handlebars', hb());
app.set('view engine', 'handlebars'); // makes a bug

// to set up the csrfToken
app.use((req, res, next) => {
    res.set('x-frame-options', 'DENY');
    res.locals.csrfToken = req.csrfToken;
    next();
});

//middleware for cookie
app.use(cookieSession({
    secret: secrets.cookieSession.secret,
    maxAge: 1000 * 60 * 60 * 24 * 14
}));

//to set up express
app.use(
    express.urlencoded({
        extended: false
    })
);
app.use(express.static('./public'));

const requireLoggedInUser = (req, res, next) => {
    if (!req.session.user) {
        res.redirect("/home");
    } else {
        next();
    }
};

const requireLoggedOutUser = (req, res, next) => {
    if (req.session.user && req.session.user.id) {
        res.redirect("/edit");
    } else {
        next();
    }
};

const requireSig = (req, res, next) => {
    if (!req.session.user.sigId) {
        res.redirect("/petition");
    } else {
        next();
    }
};

const requireNoSig = (req, res, next) => {
    if (req.session.user.sigId) {
        res.redirect("/petition/signers");
    } else {
        next();
    }
};

app.get('/', requireLoggedOutUser, (req, res) => {
    // console.log("made it to first page");
    res.redirect('/home');
});

app.get('/home', (req, res) => {
    res.render('home', {
        layout: 'main',
        'title': 'home'

    });

});

app.get('/register', requireLoggedOutUser, (req, res) => {
    // console.log('madeit to register sweetie');
    res.render('register', {
        layout: 'main',
        title: 'register',

    });

});

app.post('/register', requireLoggedOutUser, (req, res) => {
    // console.log("POST made it to post register");
    const first = req.body['first'];
    const last = req.body['last'];
    const email = req.body['email'];
    const pwreg = req.body['pwreg'];
    hash(pwreg).then(hPWresult => {
        db.addHashed(first, last, email, hPWresult)
            .then(result => {
                req.session.user = {}; //ALWAYS NEED TO BE CALLED BEFORE COOKIE ACTIVATION
                req.session.user.id = result.rows[0].id;
                req.session.first = result.rows[0]['first'];
                req.session.last = result.rows[0]['last'];
                req.session.email = result.rows[0]['email'];
                res.redirect('/profile');
            }).catch(err => {
                console.log("error within the dbc insertion", err);
                res.render('register', {
                    layout: 'main',
                    title: 'register',
                    err: true
                });
            });
    });
});

//go to profile
app.get('/profile', requireLoggedInUser, (req, res) => {
    // console.log('made it to register  profile');
    res.render('profile', {
        layout: "main",
        title: "profile",
    });
});

app.post('/profile', requireLoggedInUser, (req, res) => {
    // console.log('made it to profile post');
    const age = req.body['age'];
    const city = req.body['city'];
    const url = req.body['url'];
    const userId = req.session.user.id;

    db.addUserProfile(age, city, url, userId).then(result => {
        console.log("results profile", result);
        res.redirect('/petition');
    }).catch(err => {
        console.log("error in rendering the cookies data in profile", err);
        res.redirect('/profile');
    });
});

app.get('/login', requireLoggedOutUser, (req, res) => {
    console.log("made it to login");
    res.render('login', {
        layout: 'main',
        title: 'layout'
    });
});

app.post('/login', requireLoggedOutUser, (req, res) => {
    // console.log('POST login');
    const emailDb = req.body['loginEmail'];
    const loginPW = req.body['loginpw'];
    db.getHashed(emailDb).then(result => {
        // console.log("result hashed", result);
        const HashedPW = result.rows[0].password;
        compare(loginPW, HashedPW).then(response => {
            if (response === true) {
                req.session.user = {
                    id: result.rows[0].id,
                    first: result.rows[0]['first'],
                    last: result.rows[0]['last'],
                };
                const sigId = req.session.user.id;
                db.getSignatures(sigId).then(result => {
                    req.session.user.sigId = result.rows[0].id;
                    res.redirect('/petition/thankyou');
                }).catch(err => {
                    console.log("error within login", err);
                });
            } else {
                res.render('login', {
                    layout: 'main',
                    title: 'layout',
                    err: true
                });
            }
        });
    }).catch(err => {
        console.log("error in gethashed", err);
        res.render('login', {
            layout: 'main',
            title: 'register',
            err: true
        });

    });
});

/// Edit route
app.get('/edit', requireLoggedInUser, (req, res) => {
    // console.log("made it to edit route");
    const profileData = req.session.user.id;
    db.addUserEdit(profileData).then(result => {
        res.render('edit', {
            layout: 'main',
            title: 'edit',
            first: result.rows[0].first,
            last: result.rows[0].last,
            email: result.rows[0].email,
            age: result.rows[0].age,
            city: result.rows[0].city,
            url: result.rows[0].url,
        });
    }).catch(err => {
        console.log("error in edit get app", err);
    });
});

app.post('/edit', requireLoggedInUser, (req, res) => {
    // console.log("madeit to post Edit");
    if (req.body.pw == "") {
        const userId = req.session.user.id;
        const first = req.body['first'];
        const last = req.body['last'];
        const email = req.body['email'];
        db.getUserEditUsersNoPW(first, last, email, userId).then(result => {
            // console.log("result no pw update", result);
            const age = req.body['age'];
            const city = req.body['city'];
            const url = req.body['url'];
            db.getUserEditUsersProfile(age, city, url, userId).then(result => {
                // console.log("results user profile", result);
            }).catch(err => {
                console.log("error ingetUserEditUsersNoPW ", err);
            });
            res.redirect('/edit');
        }).catch(err => {
            console.log("error etUserEditUsersNoPW ", err);
        });
    } else {
        const userId = req.session.user.id;
        const first = req.body['first'];
        const last = req.body['last'];
        const email = req.body['email'];
        const pwEdit = req.body['pw'];
        let hashedPW = '';
        hash(pwEdit).then(hPWresult => {
            hashedPW = hPWresult;
            return hashedPW;
        }).then(
            db.getUserEditUsersPW(first, last, email, hashedPW, userId))
            .then(result => {
                // console.log("result pw with users bd", result);
                const age = req.body['age'];
                const city = req.body['city'];
                const url = req.body['url'];
                db.getUserEditUsersProfile(age, city, url, userId).then(result => {
                    // console.log("results user profile", result);
                }).catch(err => {
                    console.log("error getUserEditUsersProfile ", err);
                });
            }).catch(err => {
                console.log("error getUserEditUsersPW ", err);
            });
        res.redirect('/edit');
    }
});

app.get('/petition', requireLoggedInUser, requireNoSig, (req, res) => {
    if (req.session.user.sigId) {
        res.redirect('/petition/thankyou');
    } else {
        res.render('petition', {
            layout: 'main',
            title: 'petition',
        });
    }
});

app.post('/petition', requireLoggedInUser, requireNoSig, (req, res) => {
    // console.log("post petition");
    const signature = req.body['sig'];
    const userId = req.session.user.id;

    db.addSig(signature, userId)
        .then(result => { //using promises to replace callbacks
            req.session.user.sigId = result.rows[0].id; //set cookie and the rows result id comes from the result object
            res.redirect('/petition/thankyou');
        })
        .catch(err => {
            console.log('error in signature', err);
            res.render('petition', {
                layout: 'main',
                title: 'petition',
                err: true,
            });

        });

});

app.get('/petition/thankyou', requireLoggedInUser, requireSig, (req, res) => {
    // console.log("madeit to app get petition thank you");
    db.getSigcount().then(count => {
        const userId = req.session.user.id;
        db.getSignerSignature(userId)
            .then(result => {
                // console.log("result petition thank you signature", result);
                res.render('thankyou', {
                    layout: 'main',
                    sigDb: result.rows[0].signature,
                    sigCount: count.rows[0].count,
                    title: 'thankyou'
                });
            }).catch(err => {
                console.log('there is an error with signature render', err);
            });
    }).catch(err => {
        console.log("err in count", err);
    });
});

app.post('/petition/thankyou', requireLoggedInUser, requireSig, (req, res) => {
    // console.log("petition thank you route");
    const sigId = req.session.user.id;
    db.getEmptySigCanvas(sigId).then(result => {
        req.session.user.sigId = "";
        // console.log("signature cookie and draw deleted", result);
        res.redirect('/petition');
    }).catch(err => {
        console.log("error in deleting signature", err);
    });
});

app.get('/petition/signers', requireLoggedInUser, requireSig, (req, res) => {
    // console.log("signer city route");
    db.getSignersResults().then(result => {
        const signatures = result.rows;
        res.render('signers', {
            layout: 'main',
            title: 'signers',
            signatures
        });
    }).catch(err => {
        console.log("error in result for getsignature", err);
    });
});

app.get('/petition/signers/:city', requireLoggedInUser, requireSig, (req, res) => {
    // console.log("made it to petition signer city");
    const city = req.params['city'];
    db.getSignersCity(city).then(result => {
        const cityData = result.rows;
        console.log("signer CITY result", cityData);
        res.render('signerscity', {
            layout: 'main',
            title: 'signerscity',
            cityData,
        });
    }).catch(err => {
        console.log("error in signers city", err);
    });
});

app.get('/logout', requireLoggedInUser, (req, res) => {
    req.session = null;
    res.redirect('/home');
});

app.use(csurf());

if (require.main == module) {
    app.listen(process.env.PORT || 8080, () => console.log("Server Listening"));
}