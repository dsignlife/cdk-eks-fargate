/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
import * as cdk8s from "cdk8s";
import * as kplus from "cdk8s-plus-22";
import { Construct } from "constructs";

export class EksFargateLogging extends cdk8s.Chart {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const eksFargateLoggingNamespace = "aws-observability";
    const namespace = new kplus.Namespace(this, eksFargateLoggingNamespace, {
      metadata: {
        name: eksFargateLoggingNamespace,
        labels: {
          "aws-observability": "enabled",
        },
      },
    });

    const region = "eu-west-1";
    const cmArray: Array<string> = [
      "[OUTPUT]",
      "    Name cloudwatch_logs",
      "    Match   *",
      `    region ${region}`,
      "    log_group_name fluent-bit-cloudwatch",
      "    log_stream_prefix from-fluent-bit-",
      "    auto_create_group true",
    ];
    const cmString = cmArray.join("\n");
    const cmName = "aws-logging";

    const loggingConfigMap = new kplus.ConfigMap(this, cmName, {
      metadata: {
        name: cmName,
        namespace: eksFargateLoggingNamespace,
      },
      data: {
        "output.conf": cmString,
      },
    });
  }
}
