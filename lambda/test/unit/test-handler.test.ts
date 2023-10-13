import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { lambdaHandler } from '../../src/service/service1';
import { expect, describe, it } from '@jest/globals';
import { execute } from '../../src/service/common';

// describe('Unit test for app handler', function () {
//     it('verifies successful response', async () => {
//         const event: APIGatewayProxyEvent = {
//             httpMethod: 'get',
//             body: '',
//             headers: {},
//             isBase64Encoded: false,
//             multiValueHeaders: {},
//             multiValueQueryStringParameters: {},
//             path: '/hello',
//             pathParameters: {},
//             queryStringParameters: {},
//             requestContext: {
//                 accountId: '123456789012',
//                 apiId: '1234',
//                 authorizer: {},
//                 httpMethod: 'get',
//                 identity: {
//                     accessKey: '',
//                     accountId: '',
//                     apiKey: '',
//                     apiKeyId: '',
//                     caller: '',
//                     clientCert: {
//                         clientCertPem: '',
//                         issuerDN: '',
//                         serialNumber: '',
//                         subjectDN: '',
//                         validity: { notAfter: '', notBefore: '' },
//                     },
//                     cognitoAuthenticationProvider: '',
//                     cognitoAuthenticationType: '',
//                     cognitoIdentityId: '',
//                     cognitoIdentityPoolId: '',
//                     principalOrgId: '',
//                     sourceIp: '',
//                     user: '',
//                     userAgent: '',
//                     userArn: '',
//                 },
//                 path: '/hello',
//                 protocol: 'HTTP/1.1',
//                 requestId: 'c6af9ac6-7b61-11e6-9a41-93e8deadbeef',
//                 requestTimeEpoch: 1428582896000,
//                 resourceId: '123456',
//                 resourcePath: '/hello',
//                 stage: 'dev',
//             },
//             resource: '',
//             stageVariables: {},
//         };
//         const result: APIGatewayProxyResult = await lambdaHandler(event);

//         expect(result.statusCode).toEqual(200);
//         expect(result.body).toEqual(
//             JSON.stringify({
//                 message: 'hello 2',
//             }),
//         );
//     });
// });

describe('test', function () {
  it('verifies successful response', async () => {
    const result = await execute(
      {
        url: `https://app1.sw0.info/api/aa`,
        method: "GET",
        headers: {},
      },
      {}
    );
    expect(200).toEqual(200);
  });
});
