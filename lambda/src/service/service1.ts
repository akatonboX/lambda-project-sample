import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { info } from 'console';
import { CustomizerManager } from '../client/common';
import { clientIdManager, createErrorResponse, createTargetRequest, execute } from './common';
import { customizerManager } from '../client/customizerManager';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */



export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {

  console.log("★", event);

  try{
    //■クライアントIDの取得
    const clientId = await clientIdManager.getClientId(event);

    //■標準リクエストの作成
    const request = createTargetRequest(event,{
      currentPath: "/service1",
      targetUri: "https://app1.sw0.info/api",
    });


    //■標準リクエストを、サービス固有のカスタマイズ
    request.headers["x-sample2"] = "hogehoge2";
    request.headers["x-sample3"] = ["1", "2"];

    //■標準リクエストを、クライアント固有のカスタマイズ
    const customisedRequest = customizerManager.custmizeRequest(clientId, event, request);

    //■HTTP通信の実行
    const response = await execute(customisedRequest, {});

  
    //■標準レスポンスを、サービス固有のカスタマイズ
    if(response.headers != null && response.multiValueHeaders != null){
      console.log("★レスポンスヘッダ更新")
      response.headers["x-sample"] = "hogehoge";
    }

    //■標準レスポンスを、クライアント固有のカスタマイズ
    const customizedResponse = customizerManager.custmizeResponse(clientId, event, customisedRequest, response);
    
    return customizedResponse;
  }
  catch(error){
    console.error("予期せぬ例外が発生しました。", error);
    return createErrorResponse(error);
  }
};
