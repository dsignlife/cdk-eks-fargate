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

export interface NginxServiceProps {
  iamRoleForK8sSaArn: string;
  nameSpace: string;
  ingressName: string;
  serviceAccountName: string;
}

export class NginxService extends cdk8s.Chart {
  constructor(scope: Construct, id: string, props: NginxServiceProps) {
    super(scope, id);

    const namespace = new kplus.Namespace(this, props.nameSpace, {
      metadata: { name: props.nameSpace },
    });

    // Create K8S Service Account associated with IAM role.
    const serviceAccount = new kplus.ServiceAccount(
      this,
      props.serviceAccountName,
      {
        metadata: {
          name: props.serviceAccountName,
          namespace: namespace.name,
          annotations: {
            "eks.amazonaws.com/role-arn": props.iamRoleForK8sSaArn,
          },
        },
      }
    );

    const appLabel = { app: "nginx" };

    const deployment = new kplus.Deployment(this, "api-deployment", {
      containers: [
        {
          image: "nginx",
          imagePullPolicy: kplus.ImagePullPolicy.ALWAYS,
          name: "nginx",
          port: 80,
        },
      ],
      metadata: {
        name: "api-deployment",
        namespace: namespace.name,
        labels: appLabel,
      },
      select: true,
      serviceAccount,
    });

    const service = new kplus.Service(this, "api-service", {
      metadata: {
        namespace: namespace.name,
        name: "api-service",
        labels: appLabel,
        annotations: {
          "alb.ingress.kubernetes.io/target-type": "ip",
        },
      },
      type: kplus.ServiceType.NODE_PORT,
      selector: deployment,
      ports: [{ port: 80 }],
    });

    const ingress = new kplus.Ingress(this, props.ingressName, {
      metadata: {
        name: props.ingressName,
        namespace: namespace.name,
        annotations: {
          "kubernetes.io/ingress.class": "alb",
          "alb.ingress.kubernetes.io/scheme": "internet-facing", // Set ALB for K8S Ingress as internet-facing service.
          "alb.ingress.kubernetes.io/target-type": "ip",
          "alb.ingress.kubernetes.io/healthcheck-path": "/health",
        },
        labels: appLabel,
      },
      rules: [
        {
          path: "/",
          backend: kplus.IngressBackend.fromService(service),
        },
      ],
    });
  }
}
