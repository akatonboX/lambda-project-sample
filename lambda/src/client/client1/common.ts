import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TargetRequest } from "../../service/common";
import { ClientCustomizer, Customizer } from "../common";

export abstract class CustomizerBase extends ClientCustomizer{
  constructor(name: string){
    super("client1", name);
  }
}