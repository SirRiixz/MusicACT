const passport = require('passport');
const jwt = require('jsonwebtoken');
const passportjwt = require('passport-jwt');
const User = require('../models/user');

// The createStrategy is responsible to setup passport-local LocalStrategy with the correct options.
passport.use(User.createStrategy());

// after did the passport Strategy assign the cookie
// serializeUser() Generates a function that is used by Passport to serialize users into the session (done is a callback (null= no error))
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// deserializeUser() Generates a function that is used by Passport to deserialize users into the session
passport.deserializeUser((id, done) => {
  User.findById(id).then(user => {
    done(null, user);
  });
});

passport.use(
  new passportjwt.Strategy(
    {
      // fromAuthHeaderAsBearerToken() creates a new extractor that looks for the JWT in the authorization header with the scheme 'bearer'
      jwtFromRequest: passportjwt.ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'topsecret',
      algorithm: ['HS256']
    },
    (payload, done) => {
      User.findById(payload.sub)
        .then(user => {
          if (user) {
            done(null, user);
          } else {
            done(null, false);
          }
        })
        .catch(error => {
          done(error, false);
        });
    }
  )
);
// given a user object, create a token based on that user object and sent back in the response object to either curl nor client app
function signJWTForUser(req, res, next) {
  const user = req.user;
  const token = jwt.sign(
    {
      email: user.email
    },
    'topsecret',
    {
      algorithm: 'HS256',
      expiresIn: '7 days',
      //subject: if you want to check subject (sub), provide a value here
      subject: user._id.toString()
    }
  );

  req.token = token;
  next();
  // res.json({ token });
  // console.log(token);
}

//decode
// function decodeJWTFindUser(req, res) {
//   // authorization: Bearer <access_token>
//   const bareHeader = req.headers['authorization'];
//   if (typeof bearHeader !== 'undefined') {
//     // split at the space
//     const bearer = bearHeader.split(' ');
//     // get the token from array
//     const bearerToken = bearer[1];
//     req.token = bearerToken;
//     next();
//   } else {
//     res.sendStatus(403);
//   }
// }

function register(req, res, next) {
  const user = new User(req.body);

  User.register(user, req.body.password, (error, callback) => {
    if (error) {
      next(error);
      return;
    }
    req.user = callback;
    next();
  });
}

// passport.initialize() middleware is required to initialize Passport. If your application uses persistent login sessions, passport.session() middleware must also be used.
module.exports = {
  initialize: [passport.initialize(), passport.session()],
  register,
  signin: passport.authenticate('local', { session: false }),
  signJWTForUser,
  decodeJWTFindUser,
  requireJWT: passport.authenticate('jwt', { session: false })
};
