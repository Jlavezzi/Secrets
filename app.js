require('dotenv').config()
const express = require('express');
const ejs = require('ejs');
const bodyParser= require('body-parser');
const mongoose = require('mongoose');
main().catch(err => console.log(err));
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.set('view engine', 'ejs');

app.use(express.static('public'));

app.use(bodyParser.urlencoded({extended:true}));

//configure session
app.use(session({
  secret: 'our little secret.',
  resave: false,
  saveUninitialized: true
}));

//initialize passport
app.use(passport.initialize());
//use passport to manage sessions
app.use(passport.session());


async function main() {
  await mongoose.connect('mongodb://localhost:27017/userDB')
};

const userSchema =  new mongoose.Schema({
   email:String,
   password: String,
   secret:String,
   googleId:String
});
//configure our schema to use passportLocalMongoose
userSchema.plugin(passportLocalMongoose);

userSchema.plugin(findOrCreate);
const user = new mongoose.model('User', userSchema);

//local strategy to authenticate users
passport.use(user.createStrategy());


//configuration to create and crumble cookies(passportLocalMongoose)
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});


//configuring google strategy
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: 'https://www.googleapia.com/oauth2/v3/userinfo',
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    console.log(profile);
    user.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));

// passport.use(new FacebookStrategy({
//     clientID: FACEBOOK_APP_ID,
//     clientSecret: FACEBOOK_APP_SECRET,
//     callbackURL: "http://localhost:3000/auth/facebook/secrets"
//   },
//   function(accessToken, refreshToken, profile, cb) {
//     user.findOrCreate({ facebookId: profile.id }, function (err, user) {
//       return cb(err, user);
//     });
//   }
// ));

//root route render home
app.get('/', (req,res)=>{
  res.render('home')
});

//sign up in with google
//use passport to authenticate using google strategy
//first authentication
app.get('/auth/google',
  passport.authenticate('google', { scope:
      [ 'email', 'profile' ] }
));
//second authentication via our server
app.get( '/auth/google/secrets',
    passport.authenticate( 'google', {
        successRedirect: '/secrets',
        failureRedirect: '/register'
}));

//get request to register route
app.get('/register', (req,res)=>{
  res.render('register')
});

//get request to secrets routes
app.get('/secrets', (req,res)=>{
// unauthenticated access now allowed renders secrets publicly but anonymously
  user.find({'secret' : {$ne:null}}, (err, foundUser)=>{
    if (err) {
      console.log(err);
    }else {
      if (foundUser) {
        res.render('secrets', {usersWithSecrets:foundUser})
      }
    }
  })
});

// get request to submit
//check if req is authenticated
app.get('/submit', (req,res)=>{
  if (req.isAuthenticated()) {
   res.render('submit')
 }else {
   res.redirect('/login')
 }
})

//post request to submit route
app.post('/submit', (req,res)=>{
  const submitedSecret = req.body.secret
//search for the user and save secrets to database and redirect to secrets route
  user.findById(req.user.id, (err,foundUser)=>{
    if (err) {
      console.log(err);
    }else {
      if (foundUser) {
        foundUser.secret =submitedSecret;
        foundUser.save(()=>{
          res.redirect('/secrets')
        });
      }
    }
  });
});

//post request to register route
app.post('/register', (req,res)=>{
//save inputs to db using passport
 user.register({username: req.body.username}, req.body.password, function(err, user){
   if (err) {
console.log(err);
 res.redirect('/register')
}else {
  //authenticate the user using passport and grant access to authenticated user
  //create a cookie to store login session
  passport.authenticate('local')(req,res, function(){
    res.redirect('/secrets')
  });
}
});
});

//get request to log in page
app.get('/login',(req,res)=>{
  res.render('login')
});

//using passport parameters to log users out
app.get('/logout',(req,res)=>{
  req.logout((err)=>{
    if (err) {
      return next(err)
    }
    res.redirect('/');
  });
});

//post request to login page
app.post('/login', (req,res)=>{
  //create a new user
const newUser = new user ({
  username: req.body.username,
  password: req.body.password
});
//using passport to authenticate user by checking if record exists on database
req.login(newUser,(err)=>{
  if (err) {
    console.log(err);
  }else {
    //authenticate users and login using local strategy
    //create a cookie to store login session
    passport.authenticate('local')(req,res, function(){
      res.redirect('/secrets')
    })
  };
});
});


//localhost address
app.listen(3000, ()=>{
  console.log('Success');
});
