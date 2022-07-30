
const express = require('express');
const ejs = require('ejs');
const bodyParser= require('body-parser');
const mongoose = require('mongoose');
main().catch(err => console.log(err));
const encrypt = require('mongoose-encryption')
const app = express();

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

const secret = 'this is our long secret.';

userSchema.plugin(encrypt, {secret: secret , encryptedFields:['password']})
const user = new mongoose.model('User', userSchema);

app.get('/', (req,res)=>{
  res.render('home')
});

app.get('/register', (req,res)=>{
  res.render('register')
});

app.post('/register', (req,res)=>{
const newUser = new user({
  email: req.body.username,
  password:req.body.password
})

newUser.save(function(err){
  if (err) {
    console.log(err);
  }else {
    res.render('secrets')
  }
})
})
app.get('/login',(req,res)=>{
  res.render('login')
});

app.post('/login', (req,res)=>{
  const userName = req.body.username;
  const password = req.body.password;

  user.findOne({email:userName}, (err,foundUser)=>{
    if (err) {
      console.log(err);
    }else {
      if (foundUser) {
        if (foundUser.password === password) {
          res.render('secrets')
        }
      }
    }
  })
})
app.listen(3000, ()=>{
  console.log('Success');
});
