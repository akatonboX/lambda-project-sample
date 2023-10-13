import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TargetRequest } from "../../service/common";
import { CustomizerBase } from "./common";

export class Client1CommonCustomizer extends CustomizerBase{

  constructor(){
    super("Common");
  }
  
  
  protected _isExecute(clientId: string | undefined, event: APIGatewayProxyEvent): boolean {
    return true;
  }
  custmizeRequest(clientId: string | undefined, event: APIGatewayProxyEvent, request: TargetRequest): TargetRequest {
    request.headers["x-sample2"] = "Client1CommonCustomizerで変更されました";
    return request;
  }
  custmizeResponse(clientId: string | undefined, event: APIGatewayProxyEvent, request: TargetRequest, response: APIGatewayProxyResult): APIGatewayProxyResult {
    return response;
  }
  
}