require("dotenv").config();
const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
var cors = require("cors");
app.use(cors());
app.use(express.json());
console.log("token key = ", process.env.TOKEN_KEY);
const verifyToken = (req, res, next) => {
  const token =
    req.body.token || req.query.token || req.headers["x-access-token"];

  if (!token) {
    return res.status(403).send("A token is required for authentication");
  }
  try {
    console.log("config.TOKEN_KEY", process.env.TOKEN_KEY);
    const decoded = jwt.verify(token, process.env.TOKEN_KEY);
    req.user = decoded;
  } catch (err) {
    return res.status(401).send("Invalid Token!");
  }
  return next();
};

const mongoose = require("mongoose");
mongoose
  .connect("mongodb://localhost/Project")
  .then(() => console.log("Connected to mongodb"))
  .catch((err) => console.error("there was error", err));

//Collection definition
const carSchema = new mongoose.Schema({
  Model: String,
  Year: Number,
  Engine: Number,
  Color:String,
});

// Model refrence to the collection type object
const Car = mongoose.model("car", carSchema);

const userSchema = new mongoose.Schema({
  first_name: { type: String, default: null },
  last_name: { type: String, default: null },
  email: { type: String, unique: true },
  password: { type: String },
  token: { type: String },
});
const User = mongoose.model("user", userSchema);

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

app.post("/users/Register", async (req, res) => {
  // Our register logic starts here
  try {
    // Get user input
    console.log(req.body);
    let { first_name, last_name, email, password } = req.body;

    // Validate user input
    if (!(email && password && first_name && last_name)) {
      console.log("There was error");
      return res.status(400).send("All input is required");
    }

    // check if user already exist
    // Validate if user exist in our database
    email = email.toLowerCase();
    const oldUser = await User.findOne({ email });

    if (oldUser) {
      return res.status(409).send("User Already Exist. Please Login");
    }

    //Encrypt user password
    encryptedPassword = await bcrypt.hash(password, 10);

    // Create user in our database
    const user = await User.create({
      first_name: first_name,
      last_name: last_name,
      email: email.toLowerCase(), // sanitize: convert email to lowercase
      password: encryptedPassword,
    });

    // Create token
    const token = jwt.sign(
      { user_id: user._id, email },
      process.env.TOKEN_KEY,
      {
        expiresIn: "2h",
      }
    );
    // save user token
    user.token = token;
    console.log("current user to return ", user);
    // return new user
    return res.status(201).json(user);
  } catch (err) {
    console.log(err);
    res.status(400).json(err);
  }
  // Our register logic ends here
});
app.post("/login", async (req, res) => {
  // Our login logic starts here
  try {
    // Get user input
    let { email, password } = req.body;

    // Validate user input
    if (!(email && password)) {
      return res.status(400).send("All input is required");
    }
    // Validate if user exist in our database
    email = email.toLowerCase();
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      // Create token
      const token = jwt.sign(
        { user_id: user._id, email },
        process.env.TOKEN_KEY,
        {
          expiresIn: "2h",
        }
      );

      // save user token
      user.token = token;

      // user
      return res.status(200).json(user);
    }
    return res.status(401).send("Invalid Credentials");
  } catch (err) {
    console.log(err);
  }
  // Our register logic ends here
});

app.get("/welcome", verifyToken, (req, res) => {
  res.status(200).send("Welcome 🙌 ");
});

app.get("/", (req, res) => {
  res.send("Cars managemnt server");
});

app.get("/api/Cars", verifyToken, async (req, res) => {
  let car = await Car.find();
  res.send(car);
});

app.post("/api/Cars", verifyToken, async (req, res) => {
  let car = new Car({
    Model: req.body.Model,
    Year: req.body.Year,
    Engine: req.body.Engine,
    Color: req.body.Color,
  });
 

  let result = await car.save();
  res.status(200).send(result);
});

app.delete("/api/Cars", async(req, res) => {
  let value = req.body;
  if(value.Model !== "" && value.Year !== "")
  await Car.find({Model:value.Model}).deleteOne()
  else if(value.id === "" && value.name !== "")
  await Car.find({Model:value.Model}).deleteOne()
  else
  await Car.find({Year:value.Year}).deleteOne()
});
app.put("/api/Cars", verifyToken, (req, res) => {
  Car.findOne({Model: req.body.Model}, function (err, foundItem) {
    if(err) {
      res.status(500).send();
    }
    else 
    {
      if(!foundItem) 
      {
        res.status(404).send();
      } 
      else 
      {
        if(req.body.Year) 
        {
          foundItem.Year = req.body.Year;
        }
        if(req.body.Engine)
        {
          foundItem.Engine = req.body.Engine;
        }
        if(req.body.Color) 
        {
          foundItem.Color = req.body.Color;
        }

        foundItem.save(function(err, updatedItem) 
        {
          if(err)
          {
            res.status(500).send();
          } else 
          {
            console.log(updatedItem);
            res.send(updatedItem);
          }
        })
      }
    }
  })
});


const port = process.env.PORT || 5001;
app.listen(port, () => {
  console.log(`listening on ${port} port`);
});
