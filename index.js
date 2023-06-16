const express = require("express");
const app = express();
require("dotenv").config();
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.PAYMENT_SECRETE_KEY);
const port = process.env.PORT || 5500;
const cors = require("cors");

// middleware
app.use(cors());
app.use(express.json());



const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.iugtbdp.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const classCollection = client.db("classDB").collection("classes");
    const instractorsCollection = client
      .db("instractorDB")
      .collection("instractors");
    const testimonialsCollection = client
      .db("testimonialsDB")
      .collection("testimonials");
    const studentsCollection = client
      .db("musicStudentsDB")
      .collection("studentsCollection");
    const PaymentCollection = client
      .db("PaymentsDB")
      .collection("paymentCollection");

   

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      // console.log(token);
      res.send({ token });
    });

    app.get("/classes", async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    app.get("/classes/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const result = await classCollection.findOne({ _id: new ObjectId(id) });
      console.log("result", result);
      res.send(result);
    });

    app.patch('/classes/:id', async (req , res)=>{
        const id = req.params.id;
        const filter = { _id : new ObjectId(id)};
        const updateDoc = {
            $set: {},
        };
         
        if ( req.body.status){
            updateDoc.$set.status = req.body.status
        }
        const result = await classCollection.updateOne(filter, updateDoc);

        res.send(result);
    })

    app.post("/classes", async (req, res) => {
      const newItem = req.body;
      const result = await classCollection.insertOne(newItem);
      res.send(result);
    });
      
    app.delete('/classes/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await classCollection.deleteOne(query);
      res.send(result);
    })



    app.get("/instractors", async (req, res) => {
      const result = await instractorsCollection.find().toArray();
      res.send(result);
    });
    app.get("/testimonials", async (req, res) => {
      const result = await testimonialsCollection.find().toArray();
      res.send(result);
    });

    app.get("/students", async (req, res) => {
      const result = await studentsCollection.find().toArray();
      res.send(result);
    });

    app.post("/students", async (req, res) => {
      const student = req.body;
      const query = { email: student.email };
      const existingUser = await studentsCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "User already exists" });
      }

      const result = await studentsCollection.insertOne(student);
      res.send(result);
    });

    app.patch("/students/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };

      const result = await studentsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/students/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      console.log(email);

      if (req.decoded.email !== email) {
        res.send({ admin: false });
        return;
      }

      const user = await studentsCollection.findOne({ email: email });
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    app.patch("/students/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };

      const result = await studentsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/students/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
        return;
      }

      const user = await studentsCollection.findOne({ email: email });
      const result = { instructor: user?.role === "instructor" };
      res.send(result);
    });

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const result = await PaymentCollection.insertOne(payment);
      res.send(result);
    });

    app.get("/payments", async (req, res) => {
      const result = await PaymentCollection.find().toArray();
      res.send(result);
    });

   

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
