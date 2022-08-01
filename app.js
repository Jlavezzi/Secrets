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

// console.log(process.env.SECRET);
app.set('view engine', 'ejs');

app.use(express.static('public'));

app.use(bodyParser.urlencoded({extended:true}));

//configure session
app.use(session({
  secret: 'our little secret.',
  resave: false,
  saveUninitialized: true
}))

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


// passport.serializeUser(user.serializeUser())
// passport.deserializeUser(user.deserializeUser())
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

passport.use(new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    user.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
app.get('/', (req,res)=>{
  res.render('home')
});

app.get('/auth/google',
  passport.authenticate('google', { scope:
      [ 'email', 'profile' ] }
));

app.get( '/auth/google/secrets',
    passport.authenticate( 'google', {
     // scope: 'https://www.googleapis.com/auth/plus.login',
        successRedirect: '/secrets',
        failureRedirect: '/register'
}));

app.get('/register', (req,res)=>{
  res.render('register')
});


app.get('/secrets', (req,res)=>{
//check if the request is authenticated
  if (req.isAuthenticated()) {
    res.render('secrets')

  }else {
    res.redirect('/login')
  }
})
app.post('/register', (req,res)=>{
//save inputs to db using passpor
 user.register({username: req.body.username}, req.body.password, function(err, user){
   if (err) {
console.log(err);
 res.redirect('/register')
}else {
  //authenticate the user using passport
  passport.authenticate('local')(req,res, function(){
    res.redirect('/secrets')
  })
}
 })
})


app.get('/login',(req,res)=>{
  res.render('login')
});


app.get('/logout',(req,res)=>{
  req.logout((err)=>{
    if (err) {
      return next(err)

    }
    res.redirect('/');

  });
})
app.post('/login', (req,res)=>{
const newUser = new user ({
  username: req.body.username,
  password: req.body.password
})
//using passport to authenticate user
req.login(newUser,(err)=>{
  if (err) {
    console.log(err);
  }else {
    //authenticate users and login
    passport.authenticate('local')(req,res, function(){
      res.redirect('/secrets')
    })
  }
})
})
app.listen(3000, ()=>{
  console.log('Success');
});
