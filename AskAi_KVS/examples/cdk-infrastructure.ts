/**
 * AWS CDK Infrastructure Example
 *
 * Shows how to deploy the AskAI and KVS Lambda functions using AWS CDK.
 * Copy this to your CDK project and customize as needed.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class AskAIKVSStack extends cdk.Stack {
  public readonly kvsEndpoint: string;
  public readonly askaiEndpoint: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // DynamoDB Table for KVS
    // ========================================

    const kvsTable = new dynamodb.Table(this, 'KVSTable', {
      tableName: 'AppKVS',
      partitionKey: {
        name: 'pk',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Keep data on stack deletion
      pointInTimeRecovery: true, // Enable backups
    });

    // ========================================
    // OpenAI API Key Secret
    // ========================================

    // Create a secret to store your OpenAI API key
    // You'll need to manually set the value after deployment
    const openaiSecret = new secretsmanager.Secret(this, 'OpenAISecret', {
      secretName: 'openai-api-key',
      description: 'OpenAI API key for AskAI Lambda',
    });

    // ========================================
    // KVS Lambda Function
    // ========================================

    const kvsLambda = new lambda.Function(this, 'KVSLambda', {
      functionName: 'kvs-service',
      runtime: lambda.Runtime.NODEJS20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('path/to/export/services/kvs/dist'),
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      environment: {
        TABLE_NAME: kvsTable.tableName,
        ALLOWED_ORIGINS: '*', // Configure for production
      },
    });

    // Grant DynamoDB permissions
    kvsTable.grantReadWriteData(kvsLambda);

    // ========================================
    // AskAI Lambda Function
    // ========================================

    const askaiLambda = new lambda.Function(this, 'AskAILambda', {
      functionName: 'askai-service',
      runtime: lambda.Runtime.NODEJS20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('path/to/export/services/askai/dist'),
      memorySize: 512, // More memory for AI processing
      timeout: cdk.Duration.seconds(30), // Longer timeout for AI calls
      environment: {
        OPENAI_API_KEY_SECRET_ARN: openaiSecret.secretArn,
        DEFAULT_MODEL: 'gpt-4-turbo',
        ALLOWED_ORIGINS: '*', // Configure for production
      },
    });

    // Grant Secrets Manager permissions
    openaiSecret.grantRead(askaiLambda);

    // ========================================
    // API Gateway - KVS
    // ========================================

    const kvsApi = new apigateway.LambdaRestApi(this, 'KVSApi', {
      restApiName: 'KVS API',
      handler: kvsLambda,
      proxy: true,
      deployOptions: {
        stageName: 'v1',
        throttlingBurstLimit: 100,
        throttlingRateLimit: 50,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type'],
      },
    });

    // ========================================
    // API Gateway - AskAI
    // ========================================

    const askaiApi = new apigateway.LambdaRestApi(this, 'AskAIApi', {
      restApiName: 'AskAI API',
      handler: askaiLambda,
      proxy: true,
      deployOptions: {
        stageName: 'v1',
        throttlingBurstLimit: 20, // Lower limits for AI calls
        throttlingRateLimit: 10,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['POST', 'OPTIONS'],
        allowHeaders: ['Content-Type'],
      },
    });

    // ========================================
    // Outputs
    // ========================================

    this.kvsEndpoint = kvsApi.url;
    this.askaiEndpoint = askaiApi.url;

    new cdk.CfnOutput(this, 'KVSEndpoint', {
      value: kvsApi.url,
      description: 'KVS API Endpoint URL',
      exportName: 'KVSEndpoint',
    });

    new cdk.CfnOutput(this, 'AskAIEndpoint', {
      value: askaiApi.url,
      description: 'AskAI API Endpoint URL',
      exportName: 'AskAIEndpoint',
    });

    new cdk.CfnOutput(this, 'OpenAISecretArn', {
      value: openaiSecret.secretArn,
      description: 'OpenAI API Key Secret ARN - set the value in Secrets Manager',
    });

    new cdk.CfnOutput(this, 'KVSTableName', {
      value: kvsTable.tableName,
      description: 'DynamoDB table name for KVS',
    });
  }
}

// ========================================
// App Entry Point
// ========================================

// const app = new cdk.App();
// new AskAIKVSStack(app, 'AskAIKVSStack', {
//   env: {
//     account: process.env.CDK_DEFAULT_ACCOUNT,
//     region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
//   },
// });
