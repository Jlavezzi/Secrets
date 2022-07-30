
const express = require('express');
const ejs = require('ejs');
const bodyParser= require('body-parser');
const mongoose = require('mongoose');
main().catch(err => console.log(err));

const bcrypt = require('bcrypt');
const saltRounds = 10;

const app = express();

// console.log(process.env.SECRET);
app.set('view engine', 'ejs');

app.use(express.static('public'));

app.use(bodyParser.urlencoded({extended:true}));

async function main() {
  await mongoose.connect('mongodb://localhost:27017/userDB')
};

const userSchema =  new mongoose.Schema({
   email:String,
   password: String
});

const user = new mongoose.model('User', userSchema);

app.get('/', (req,res)=>{
  res.render('home')
});

app.get('/register', (req,res)=>{
  res.render('register')
});

app.post('/register', (req,res)=>{

  bcrypt.hash(req.body.password, saltRounds).then(function(hash) {
      // Store hash in your password DB.
      const newUser = new user({
        email: req.body.username,
        password: hash
      })

      newUser.save(function(err){
        if (err) {
          console.log(err);
        }else {
          res.render('secrets')
        }
      })

  });

})
app.get('/login',(req,res)=>{
  res.render('login')
});

app.post('/login', (req,res)=>{
  const userName = req.body.username;
  const password = req.body.password


  user.findOne({email:userName}, (err,foundUser)=>{
    if (err) {
      console.log(err);
    }else {
      if (foundUser) {
        bcrypt.compare(password, foundUser.password).then(function(result) {
   // result == true
   if (result === true) {
     res.render('secrets')
   }else {
       res.redirect('/')
   }
});
      }
    }
  })
})
app.listen(3000, ()=>{
  console.log('Success');
});
