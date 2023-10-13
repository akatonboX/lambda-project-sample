import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TargetRequest } from "../service/common";



export interface Customizer {
  getName(): string;

  /** 実行されるべきかどうかを返します。 */
  isExecute(clientId: string | undefined, event: APIGatewayProxyEvent): boolean;

  /** リクエストをカスタマイズします。  */
  custmizeRequest(clientId: string | undefined, event: APIGatewayProxyEvent, request: TargetRequest): TargetRequest;

  /** レスポンスをカスタマイズします。*/
  custmizeResponse(clientId: string | undefined, event: APIGatewayProxyEvent, request: TargetRequest, response: APIGatewayProxyResult): APIGatewayProxyResult;

}



export class CustomizerManager{
  private customizers: Customizer[];

  constructor(customizers: Customizer[]) {
    this.customizers = customizers;
  }

  /** リクエストをカスタマイズします。  */
  custmizeRequest(clientId: string | undefined, event: APIGatewayProxyEvent, request: TargetRequest): TargetRequest {
    const customizers = this.customizers.filter(customizer => customizer.isExecute(clientId, event));
    console.info("対象のCustomiser: " + customizers.map(item => item.getName()).reduce((previouseValue, currentValue) => previouseValue += (currentValue + ","), ""));
    return customizers.reduce((currentRequest, customizer) => customizer.custmizeRequest(clientId, event, currentRequest), request);
  }

  /** レスポンスをカスタマイズします。*/
  custmizeResponse(clientId: string | undefined, event: APIGatewayProxyEvent, request: TargetRequest, response: APIGatewayProxyResult): APIGatewayProxyResult{
    return this.customizers.filter(customizer => customizer.isExecute(clientId, event)).reduce((currentResponse, customizer) => customizer.custmizeResponse(clientId, event, request, currentResponse), response);
  }
}

/**
 * クライアント個別のカスタマイザーのベースクラス
 */
export abstract class ClientCustomizer implements Customizer{
  
  readonly targetClientId;
  readonly name: string;
  constructor(targetClientId: string, name: string){
    this.targetClientId = targetClientId;
    this.name = name;
  }

  getName(): string {
    return this.targetClientId + "." + this.name;
  }

  isExecute(clientId: string | undefined, event: APIGatewayProxyEvent): boolean {
    return clientId != null && clientId === this.targetClientId && this._isExecute(clientId, event);
  }

  protected abstract _isExecute(clientId: string | undefined, event: APIGatewayProxyEvent): boolean;
  abstract custmizeRequest(clientId: string | undefined, event: APIGatewayProxyEvent, request: TargetRequest): TargetRequest;
  abstract custmizeResponse(clientId: string | undefined, event: APIGatewayProxyEvent, request: TargetRequest, response: APIGatewayProxyResult): APIGatewayProxyResult ;

}