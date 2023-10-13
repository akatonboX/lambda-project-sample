import { APIGatewayProxyEvent, APIGatewayProxyEventHeaders, APIGatewayProxyEventMultiValueHeaders, APIGatewayProxyEventMultiValueQueryStringParameters, APIGatewayProxyResult } from "aws-lambda";
import lodash from 'lodash';
import http, { IncomingMessage } from 'http'
import https from 'https'
import zlib from 'zlib';
import { StringDecoder } from "string_decoder";
import { APIGatewayClient, GetApiKeyCommand } from "@aws-sdk/client-api-gateway";


/** ターゲットへのリクエストを表す */
export interface TargetRequest{
  /** クエリストリングを含まないURL */
  url: string;
  /** httpメソッドを表す文字列 */
  method: string;
  /** リクエストボディ */
  body?: string;
  /** リクエストヘッダ */
  headers: {[name: string]: string | string[] | undefined}
  /** クエリストリング */
  queryStringParameters?: APIGatewayProxyEventMultiValueQueryStringParameters;

}


/** 標準のTargetRequestを構築する */
export function createTargetRequest(
  event: APIGatewayProxyEvent,
  /** 設定 */
  settings: {
    /**自身のパス */
    currentPath: string,
    /** ターゲット */
    targetUri: string,
  }
): TargetRequest{
  //■pathのチェック
  if(!event.path.startsWith(settings.currentPath)){
    throw Error(`currentPathが不正です。event.paht=${event.path}, currentPath=${settings.currentPath}`);
  }

  //■ヘッダーの構築(不要なヘッダの削除)
  const headers = lodash.merge({}, event.headers, event.multiValueHeaders);

  console.info("★変換前のリクエストヘッダ", headers);
  delete headers["CloudFront-Forwarded-Proto"];//AWS関連
  delete headers["CloudFront-Is-Desktop-Viewer"];//AWS関連
  delete headers["CloudFront-Is-Mobile-Viewer"];//AWS関連
  delete headers["CloudFront-Is-SmartTV-Viewer"];//AWS関連
  delete headers["CloudFront-Is-Tablet-Viewer"];//AWS関連
  delete headers["CloudFront-Viewer-ASN"];
  delete headers["CloudFront-Viewer-Country"];//AWS関連
  delete headers["X-Amz-Cf-Id"];//AWS関連
  delete headers["X-Amzn-Trace-Id"];//AWS関連
  delete headers["Host"];//自動付与されるべき
  delete headers["Via"];//Proxy関連
  delete headers["X-Forwarded-For"];//Proxy関連
  delete headers["X-Forwarded-Port"];//Proxy関連
  delete headers["X-Forwarded-Proto"];//Proxy関連
  delete headers["X-Forwarded-For"];//Proxy関連
  delete headers["X-API-Key"];//APIキーは外に出さない
  
  return {
    url: `${settings.targetUri}${event.path.substring(settings.currentPath.length)}`,
    method: event.httpMethod,
    body: event.body == null ? undefined : event.body,
    headers: headers,
    queryStringParameters: event.multiValueQueryStringParameters == null ? undefined : lodash.cloneDeep(event.multiValueQueryStringParameters),
  }
}
export function createErrorResponse(error: any): APIGatewayProxyResult{
  return {
    statusCode: 500,
    body: JSON.stringify({
      message: 'some error happened',
    }),
  };
}


/** 外部サービスにHTTP通信を実施 */
export async function execute(
  targetRequest: TargetRequest,
  options: {
    charset?: string;
  }
): Promise<APIGatewayProxyResult>{
  //★クエリストリングを未考慮かも。
  console.info("外部サービスにHTTP通信を実行します。", {
    url: targetRequest.url,
    method: targetRequest.method,
    headers: targetRequest.headers,
  });

  const decoder = new StringDecoder('utf8');
  const client = targetRequest.url.startsWith("http://") ? http : https;
  return await new Promise<APIGatewayProxyResult>((resolve, reject) => {
    try{
      const request = client.request(
        targetRequest.url,
        { 
          method: targetRequest.method,
          headers: targetRequest.headers,
        },
        (response: http.IncomingMessage) => {
          console.info("レスポンスを受信しました。", response);
          //■レスポンスの取得
          const chunks: any[] = [];
          response.on('data', (chunk) => {
            chunks.push(chunk);
          });

          //■レスポンスの完了
          response.on('end', async () => {
            if(response.statusCode == null){
              throw Error(`response.statusCodeに値がありません。response = ${JSON.stringify(response, null, "  ")}`);
            }

            //■bodyの生成
            const bodyBuffer = await (async () => {
              return new Promise<Buffer>((resolve, reject) => {
                if (response.headers['content-encoding'] === 'gzip') {
                  console.info("gzipを解凍します。");
                  zlib.gunzip(Buffer.concat(chunks), (err, buffer) => {
                    if (!err) {
                      return resolve(buffer);
                    } else {
                      console.error("gzipの解凍に失敗しました。")
                      reject(err);
                    }
                  });
                }
                else{
                  return resolve(Buffer.concat(chunks));
                }
              });
            })();
            
            //■bodyの構築
            const [body, isBase64Encoded] = (() => {
              //■テキスト/バイナリの判別★発想が逆というか、APIGatewayのbinaryMediaTypesに合わるべき。
              const contentType = response.headers["content-type"] == null ? "application/octet-stream" : response.headers["content-type"];
              const isText = contentType.startsWith("text/")
                              || contentType === "application/json"
                              || contentType === "application/xml";

              if(isText){
                console.info("bodyをテキストとして処理します。");
                //■bodyのcharsetを決定(★暫定)
                // const charset = (() => {
                //   const contentType = response.headers['content-type'];
                //   if(contentType != null){
                //     const charsetMatch = /charset=([a-zA-Z0-9-]+)/.exec(contentType);
                //     return charsetMatch != null ? charsetMatch[1] : options.charset != null ? options.charset : "utf-8";
                //   }
                //   else{
                //     return options.charset != null ? options.charset : "utf-8";
                //   }
                // })();
                const charset = options.charset != null ? options.charset : "utf-8";//★とりあえず、utf-8前提。Buffer.toStringは本来、文字コードによるbyte→文字列返還の機能ではない。
                //■bodyの変換(★暫定)
                return [bodyBuffer.toString(charset as BufferEncoding), false];
              }
              else{
                console.info("bodyをバイナリとして処理します。",bodyBuffer.toString("hex"));
                return [bodyBuffer.toString("base64"), true];
              }
            })();

            //■レスポンスヘッダの変換
            const headers: {[header: string]: boolean | number | string} = {};
            const multiValueHeaders: {[header: string]: Array<boolean | number | string>} = {};
            lodash.forIn(response.headers,  (value, key) => {
              if(value != null){
                if(lodash.isArray(value)){
                  multiValueHeaders[key] = value;
                }
                else{
                  headers[key] = value;
                }
              }
            });
            console.info("変換前のレスポンスヘッダ", {headers: headers, multiValueHeaders: multiValueHeaders});
            delete headers["content-encoding"];//APIGatewayに任せるべき。
            
            console.info("レスポンス", {statusCode: response.statusCode, headers: headers, multiValueHeaders: multiValueHeaders});
           


            resolve({
              statusCode: response.statusCode,
              headers: headers,
              multiValueHeaders: multiValueHeaders,
              body: body,
              isBase64Encoded: isBase64Encoded,
            });
          });
          response.on('error', reject) // <8>
        },
      );


      //■異常終了時に、例外を発生
      request.on('error', reject);

      //■bodyの出力
      if(targetRequest.body != null){
        request.write(targetRequest.body)
      }

      //■通信の実行
      request.end();
    }
    catch(err){
      reject(err);
    }
  });
}

class ClientIdManager{
  private clientIdCache: {[key:string]:string} = {};

  async getClientId(event: APIGatewayProxyEvent): Promise<string | undefined>{

    const apikeyId = event.requestContext.identity.apiKeyId;
    if(apikeyId == null){
      return undefined;
    }


    //■キャッシュに値がなければClientIdを取得
    if(this.clientIdCache[apikeyId] == null){
      console.info(`awsからapikeyNameを取得します。apikeyId=${apikeyId}`);
      //■apikeyIdから、apikeyNameを取得
      const apiGatewayClient = new APIGatewayClient({ region: process.env.AWS_REGION });
      const apikeyName = await (async () => {
        const getApiKeyCommandOutput = await apiGatewayClient.send( new GetApiKeyCommand({
          apiKey: apikeyId, 
          includeValue: true
        }));
        if(getApiKeyCommandOutput.name == null){
          throw new Error("apikeyの名前が取得できませんでした。");
        }
        return getApiKeyCommandOutput.name;
      })();
      console.info(`awsからapikeyNameを取得しました。apikeyName=${apikeyName}`);
      //■Apikeyの名前を分解して、ClientIdを取得
      const clientId =  apikeyName.split("-", 2)[1];//★駆らなず-があり、２番目がクライアントIDであるという命名規則前提。

      //■clientIdをキャッシュ
      this.clientIdCache[apikeyId] = clientId;
    }

    console.info(`clientIdを取得しました。。clientId=${this.clientIdCache[apikeyId]}`);
    return this.clientIdCache[apikeyId];
  }

}
export const clientIdManager = new ClientIdManager();

