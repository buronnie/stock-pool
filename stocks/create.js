import uuid from 'uuid';
import AWS from 'aws-sdk';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

function handleError(callback) {
  console.error('Validation Failed');
  callback(null, {
    statusCode: 400,
    headers: { 'Content-Type': 'text/plain' },
    body: "Couldn't add the stock",
  });
}

export function create(event, context, callback) {
  const timestamp = new Date().getTime();
  const data = JSON.parse(event.body);
  const sns = new AWS.SNS();

  if (typeof data.name !== 'string' || typeof data.symbol !== 'string') {
    handleError(callback);
    return;
  }

  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      id: uuid.v1(),
      name: data.name,
      symbol: data.symbol,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };

  dynamoDb.put(params, (error) => {
    if (error) {
      handleError(callback);
      return;
    }

    const snsParams = {
      Message: JSON.stringify({
        name: data.name,
        symbol: data.symbol,
      }),
      TopicArn: `arn:aws:sns:us-east-1:${process.env.ACCOUNT_ID}:dispatcher`
    };

    sns.publish(snsParams, (error, data) => {
      const response = {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
          "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS
        },
        body: 'Message published to SNS topic dispatcher',
      };
      callback(null, response);
    });
  });
}
