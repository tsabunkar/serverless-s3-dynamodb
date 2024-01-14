const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");
const { GetObjectCommand, S3Client } = require("@aws-sdk/client-s3");
// const AWS = require("aws-sdk");
const s3Client = new S3Client(); // Pass in opts to S3 if necessary

const express = require("express");
const serverless = require("serverless-http");

const app = express();

const USERS_TABLE = process.env.USERS_TABLE;
const client = new DynamoDBClient();
const dynamoDbClient = DynamoDBDocumentClient.from(client);

app.use(express.json());

app.get("/users/:userId", async function (req, res) {
  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId: req.params.userId,
    },
  };

  try {
    const { Item } = await dynamoDbClient.send(new GetCommand(params));
    if (Item) {
      const { userId, name } = Item;
      res.json({ userId, name });
    } else {
      res
        .status(404)
        .json({ error: 'Could not find user with provided "userId"' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not retreive user" });
  }
});

app.post("/users", async function (req, res) {
  const { userId, name } = req.body;
  if (typeof userId !== "string") {
    res.status(400).json({ error: '"userId" must be a string' });
  } else if (typeof name !== "string") {
    res.status(400).json({ error: '"name" must be a string' });
  }

  const params = {
    TableName: USERS_TABLE,
    Item: {
      userId: userId,
      name: name,
    },
  };

  try {
    await dynamoDbClient.send(new PutCommand(params));
    res.json({ userId, name });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not create user" });
  }
});

app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});

// const s3Client = new AWS.S3();

module.exports.ingestData = async (event) => {
  try {
    console.log("ingestData function triggered");
    // const bucket = event.Records[0].s3Client.bucket.name;
    // const key = event.Records[0].s3Client.object.key;
    const bucket = "aws-node-express-dynamodb-api-project";
    const key = "sample.json";

    // const s3Response = await s3Client.getObject(s3Params).promise();
    const s3Response = await getObject(bucket, key);
    console.log("_____________________");
    console.log(s3Response);
    console.log("_____________________");
    const jsonData = JSON.parse(s3Response.Body.toString());

    console.log("S3 Document in JSON format");
    console.log(jsonData);

    const dynamoDBParams = {
      TableName: "users-table-dev",
      Item: jsonData,
    };
    console.log("Converting JSON format to DynamoDB format");
    console.log(dynamoDBParams);

    await dynamoDB.put(dynamoDBParams).promise();

    console.log("Data ingested into DynamoDB");

    return {
      statusCode: 200,
      body: JSON.stringify("Data ingested successfully"),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify("Error ingesting data into DynamoDB"),
    };
  }
};

function getObject(Bucket, Key) {
  console.log("Invoked getObject function");
  console.log(JSON.stringify(Bucket, Key));
  return new Promise(async (resolve, reject) => {
    const getObjectCommand = new GetObjectCommand({ Bucket, Key });

    try {
      const response = await s3Client.send(getObjectCommand);

      // Store all of data chunks returned from the response data stream
      // into an array then use Array#join() to use the returned contents as a String
      let responseDataChunks = [];

      // Handle an error while streaming the response body
      response.Body.once("error", (err) => reject(err));

      // Attach a 'data' listener to add the chunks of data to our array
      // Each chunk is a Buffer instance
      response.Body.on("data", (chunk) => responseDataChunks.push(chunk));

      // Once the stream has no more data, join the chunks into a string and return the string
      response.Body.once("end", () => resolve(responseDataChunks.join("")));
    } catch (err) {
      // Handle the error or throw
      return reject(err);
    }
  });
}

module.exports.handler = serverless(app);
