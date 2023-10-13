import { APIGatewayClient, GetApiKeyCommand } from '@aws-sdk/client-api-gateway';
import * as lambda from 'aws-lambda';

export const lambdaHandler: lambda.APIGatewayRequestAuthorizerHandler = async (
    event: lambda.APIGatewayRequestAuthorizerEvent,
  ): Promise<lambda.APIGatewayAuthorizerResult> => {

  try{
    //■Apikeyのチェック
    if(event.requestContext.identity.apiKeyId == null){
      throw new Error("event.requestContext.identity.apiKeyIdに値がありません。");
    }
    const apikeyId = event.requestContext.identity.apiKeyId;
    //■Apikeyから名前を取得
    const apiGatewayClient = new APIGatewayClient({ region: process.env.AWS_REGION });
    const apikeyName = await (async () => {
      try{
        const getApiKeyCommandOutput = await apiGatewayClient.send( new GetApiKeyCommand({
          apiKey: apikeyId, 
          includeValue: true
        }));
        return getApiKeyCommandOutput.name;
      }
      catch(error){
        console.error("GetApiKeyCommandに失敗しました。", error);
        return undefined;
      }
    })();
    if(apikeyName == null){
      throw new Error("apikeyの名前が取得できませんでした。");
    }
    
    //■Apikeyの名前を分解して、ClientIdを取得
    const apikeyNameElements =  apikeyName.split("-");
    if(apikeyNameElements.length < 2){
      throw new Error(`apikeyの名前のフォーマットが不正です。apikeyName=${apikeyName}`);
    }
    const clientId = apikeyNameElements[1];

    //■正常系の返却
    console.log(`clientId=${clientId}`);
    return {
      'principalId': '*',
      'policyDocument': {
          'Version': '2012-10-17',
          'Statement': [{
              'Action': 'execute-api:Invoke',
              'Effect': "Allow",
              'Resource': event['methodArn']
          }]
      },
      'context': {
        'clientId': clientId
      }
    };
  }
  catch(error){
    console.error("エラーが発生しました。", error);
    return {
      principalId: '*',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: '*',
            Effect: 'Deny',
            Resource: '*',
          },
        ],
      },
    };
  }
 
}
